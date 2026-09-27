class_name Laundromat extends Location
## Rosa's laundromat: the core management scene. Laundry runs the simulation; this scene shows it
## and plays what you do: carrying bags from the counter to a washer, a dryer, the folding table
## and the pickup shelf; chores; visitors. Everything's place is in laundromat.tscn (the room is
## 2080 x 720 world px; the back wall meets the floor at y 614).

const FLOOR := 614.0
const NPC_SCENE := preload("res://scenes/actors/npc.tscn")
const LAUNDRY_COLORS := ["#7fa0b0", "#c9b88f", "#b86a4a", "#6f8f6a", "#d9cfbf", "#5f6f8f", "#c48fa0", "#e0c070", "#8a6a9a"]

var carry: Array = []            # order ids in hand
var jobs: Array = []             # queued errands: {x, y, face, run: Callable}
var busy := false
var mode := ""                   # "" | fold | sit
var visitors := {}               # id -> {id, actor, state: enter | here | leaving, leave_at, order, pinned}
var shift_running := false
var power_out := false
var clock_ticked := -1
var warned_closing := false
var warned_full := -1000.0
var sit_t := 0.0
var sound_sig_t := 0.0

@onready var entities: Node2D = $Entities
@onready var view: StreetView = $WindowView
@onready var glass: GlassRain = $GlassRain
@onready var shelf: PickupShelf = $Entities/PickupShelf
@onready var counter: ShopCounter = $Entities/Counter
@onready var fold_table: FoldTable = $Entities/FoldTable
@onready var seat: WindowSeat = $Entities/WindowSeat
@onready var ripples: Node2D = $Overlay2/Ripples


func _ready() -> void:
	super()
	Laundry.sim_event.connect(_on_sim_event)
	for u: MachineUnit in get_tree().get_nodes_in_group("machine_units"):
		if is_ancestor_of(u):
			u.tapped.connect(_on_machine_tapped)
	for s: DecorSlot in get_tree().get_nodes_in_group("decor_slots"):
		if is_ancestor_of(s):
			s.slot_tapped.connect(_on_slot_tapped)


func _spot(name: String) -> Vector2:
	return get_node("Spots/" + name).position


func counter_spot() -> Dictionary:
	var p := _spot("Counter")
	return {"x": p.x, "y": p.y}


# ------------------------------------------------------------------ lifecycle
func enter(opts: Dictionary) -> void:
	Laundry.ensure_machine_fields()
	refresh_decor()
	visitors.clear()
	carry = []
	mode = ""
	player.visible = true
	player.carrying = false
	player.stop()
	var from: String = opts.get("from", "backdoor")
	if from == "backdoor":
		player.position = _spot("BackDoor")
		player.facing = 1
	elif from == "front":
		player.position = _spot("FrontDoor")
		player.facing = -1
	else:
		player.position = Vector2(opts.get("x", 900), opts.get("y", 650))
	follow(player, 0, true)
	shift_running = G.phase == "shift"
	warned_closing = G.time >= 17 * 60 + 30
	_place_night_visitors()
	update_sound()
	UI.hud.set_mode("shift" if shift_running else "free")
	UI.hud.refresh()
	Day.scene_music()


func exit() -> void:
	jobs.clear()
	busy = false


## Decor changed (placed, swapped): show it.
func refresh_decor() -> void:
	for s: DecorSlot in get_tree().get_nodes_in_group("decor_slots"):
		if is_ancestor_of(s):
			s.refresh()


func update_sound() -> void:
	var n := DayLight.nightness(G.time)
	var washing := 0
	var drying := 0
	for m in G.machines:
		if m.get("state", "") == "running" and not m.broken:
			if m.kind == "washer":
				washing += 1
			else:
				drying += 1
	var rain := 0.55 if G.weather == "rain" else 0.9 if G.weather == "storm" else 0.0
	var layers := {"amb_laundromat": 0.35 + 0.1 * n}
	if washing:
		layers.amb_washer_slosh = minf(0.55, 0.22 + washing * 0.1)
	if drying:
		layers.amb_dryer = minf(0.6, 0.25 + drying * 0.1)
	if rain > 0:
		layers.amb_rain_in = rain
	if G.record != "" and G.placed.get("lounge_table") == "record_player":
		layers.amb_vinyl = 0.25
	Sound.set_ambience(layers, 1.2)


# ------------------------------------------------------------------ machines
func unit_of(m: Dictionary) -> MachineUnit:
	var bay: int = m.slot if m.kind == "washer" else int(m.slot) / 2
	for u: MachineUnit in get_tree().get_nodes_in_group("machine_units"):
		if is_ancestor_of(u) and u.kind == m.kind and u.bay == bay:
			return u
	return null


func door_geom(m: Dictionary, open: bool = false) -> Dictionary:
	return unit_of(m).door_geom(m, open)


func machine_top(m: Dictionary) -> Vector2:
	return unit_of(m).top(m)


## Where to stand to work a machine: beside it, hands at the door (the first washer from its
## right, since the folding table is on its left); the top dryer drum is a reach up.
func machine_spot(m: Dictionary) -> Dictionary:
	var d := door_geom(m)
	if m.kind == "dryer" and int(m.slot) % 2 == 0:
		return {"x": d.cx - 64, "y": 628.0, "face": 1, "pose": "reach"}
	if m.kind == "washer" and m.slot == 0:
		return {"x": d.cx + 96, "y": 628.0, "face": -1, "pose": "load"}
	return {"x": d.cx - 96, "y": 628.0, "face": 1, "pose": "load"}


func bell_spot() -> Vector2:
	return counter.position + Vector2(10, -124 - 76)


func fold_hint_spot() -> Vector2:
	return fold_table.position + Vector2(0, -118 - 12)


func shelf_hint_spot() -> Vector2:
	return shelf.position + Vector2(0, -220 - 10)


# ------------------------------------------------------------------ input
func on_tap(screen_pos: Vector2) -> void:
	var w := cam().to_world(screen_pos)
	if mode == "sit":
		_stand_up()
		return
	if mode == "fold":
		return
	ripples.add(w)
	# visitors first
	for v: Dictionary in visitors.values():
		var b: Rect2 = v.actor.bounds()
		if w.x > b.position.x - 10 and w.x < b.end.x + 10 and w.y > b.position.y and w.y < b.end.y + 10:
			_tap_visitor(v)
			return
	# floor chores
	for p in Laundry.puddles:
		if absf(w.x - p.x) < 60 * p.size and absf(w.y - p.y) < 26:
			_mop_puddle(p)
			return
	for l in Laundry.litter:
		if absf(w.x - l.x) < 34 and absf(w.y - l.y) < 30:
			_pick_litter(l)
			return
	var area := tap_area_at(w)
	if area:
		area.tapped.emit(w)
		return
	if w.y > 560:
		_walk_floor(w)


func _walk_floor(w: Vector2) -> void:
	jobs.clear()
	player.walk_to(clampf(w.x, 40, world_width - 40), clampf(w.y, walk_band.x, walk_band.y))


## Queues an errand: walk to (x, y), turn to face, then run. At most three wait in line.
func queue(job: Dictionary) -> void:
	if jobs.size() >= 3:
		jobs.pop_front()
	jobs.append(job)
	if not busy:
		_run_jobs()


func _run_jobs() -> void:
	busy = true
	while not jobs.is_empty():
		var j: Dictionary = jobs.pop_front()
		if j.has("x"):
			var ok: bool = await player.walk_to(j.x, j.y, j.get("face", 0))
			if not ok:
				continue
		if j.get("face", 0) != 0:
			player.facing = j.face
		await j.run.call()
	busy = false


func _job(spot: Variant, face: int, run: Callable) -> Dictionary:
	return {"x": spot.x, "y": spot.y, "face": face, "run": run}


func can_carry_more() -> bool:
	return carry.size() < (2 if "cart" in G.upgrades else 1)


func carried() -> Array:
	var out := []
	for id in carry:
		var o := Laundry.order(id)
		if not o.is_empty():
			out.append(o)
	return out


func _first_needing(step: String) -> Dictionary:
	for o in carried():
		if Laundry.next_step(o) == step:
			return o
	return {}


func set_carry(ids: Array) -> void:
	carry = ids
	player.carrying = not ids.is_empty()
	UI.hud.refresh_tickets()


# ------------------------------------------------------------------ the counter
func _on_counter_tapped(_p: Vector2) -> void:
	var waiting := G.orders.filter(func(o: Dictionary) -> bool: return o.stage == "counter")
	if not carry.is_empty() and (waiting.is_empty() or not can_carry_more()):
		# hands full: set the load down on the counter to come back to later
		var held := carried()
		if held.is_empty():
			return
		var o: Dictionary = held[-1]
		if Laundry.next_step(o) == "shelf":
			_on_shelf_tapped(_p)
			return
		queue(_job(_spot("Staff"), 1, _set_down.bind(o)))
		return
	if waiting.is_empty():
		UI.toast("No bags waiting at the counter.", "icon_basket")
		return
	if not can_carry_more():
		UI.toast("Your hands are full.", "icon_basket", "bad")
		return
	queue(_job(_spot("Staff"), 1, _pick_up))


func _set_down(o: Dictionary) -> void:
	if not o.id in carry:
		return
	player.set_pose("load", 0.4)
	o.stage = "counter"
	set_carry(carry.filter(func(id: String) -> bool: return id != o.id))
	Sound.play("cloth2", 0.8)
	UI.toast("%s's laundry is back on the counter for now." % o.name, "icon_basket")


func _pick_up() -> void:
	var o := _pick_from_counter()
	if o.is_empty() or not can_carry_more():
		return
	o.stage = "carried"
	set_carry(carry + [o.id])
	Sound.play("cloth1", 0.9)
	player.squash = 0.06
	G.add_stat("energy", -1)
	if o.note != "" and not o.note_read:
		o.note_read = true
		await UI.menus.read_note(o)
	Story.trigger("picked", {"o": o})


## Which bag to take: one whose next step can happen right now (a free washer or dryer),
## otherwise the oldest. Loads you set down come back when their machine frees up.
func _pick_from_counter() -> Dictionary:
	var waiting := G.orders.filter(func(o: Dictionary) -> bool: return o.stage == "counter")
	for o in waiting:
		var st := Laundry.next_step(o)
		if (st == "wash" and Laundry.washers().any(Laundry.is_free)) or (st == "dry" and Laundry.dryers().any(Laundry.is_free)) or (st != "wash" and st != "dry"):
			return o
	return waiting[0] if not waiting.is_empty() else {}


# ------------------------------------------------------------------ washers and dryers
func _on_machine_tapped(unit: MachineUnit, p: Vector2) -> void:
	var ms := unit.machines()
	if ms.is_empty():
		UI.menus.open_catalog("machines")
		return
	var m: Dictionary = ms[0]
	if unit.kind == "dryer":
		# the drum the player most likely meant
		var mid := unit.position.y - unit.height * 0.5
		for d in ms:
			if (int(d.slot) % 2 == 0) == (p.y < mid):
				m = d
				break
		# carrying something that needs drying and the tapped drum is busy: use the other one
		if not _first_needing("dry").is_empty() and not Laundry.is_free(m):
			for d in ms:
				if Laundry.is_free(d):
					m = d
					break
	_tap_machine(m, machine_spot(m))


func _tap_machine(m: Dictionary, spot: Dictionary) -> void:
	var kind: String = m.kind
	var icon := "icon_washer" if kind == "washer" else "icon_dryer"
	if m.broken:
		queue(_job(spot, spot.face, _do_repair.bind(m)))
		return
	if m.state == "running":
		var left := maxi(1, ceili(m.dur - m.t))
		UI.toast("%s — %d min left%s" % ["Washing" if kind == "washer" else "Drying", left, " (self-service)" if m.load == "self" else ""], icon)
		return
	if m.state == "done":
		if m.load == "self":
			UI.toast("A customer's load. They'll be right back for it.", "icon_basket")
			return
		# hands full? swap: take the finished load out and put the one you're holding in
		var swap_in := {} if can_carry_more() else _first_needing("wash" if kind == "washer" else "dry")
		if not can_carry_more() and swap_in.is_empty():
			UI.toast("Your hands are full. (Tap the counter to set a load down.)", "icon_basket", "bad")
			return
		if not swap_in.is_empty() and kind == "washer" and float(G.inv.get("detergent", 0)) < float(Laundry.model_of(m).soap):
			_ask_detergent()
			return
		queue(_job(spot, spot.face, _unload.bind(m, spot, swap_in)))
		return
	# a free machine
	var o := _first_needing("wash" if kind == "washer" else "dry")
	if o.is_empty():
		if kind == "dryer" and m.lint >= 5:
			queue(_job(spot, spot.face, _do_lint.bind(m)))
			return
		if m.cond < 45:
			_offer_tune_up(m, spot)
			return
		var held := carried()
		if not held.is_empty():
			var h: Dictionary = held[0]
			var need: String = {"fold": "folding", "shelf": "to go on the pickup shelf", "dry": "a dryer"}.get(Laundry.next_step(h), "a washer")
			UI.toast("%s's laundry needs %s." % [h.name, need], "icon_basket")
		else:
			UI.toast("%s · condition %d%%" % [Laundry.model_of(m).name, roundi(m.cond)], icon)
		return
	if kind == "washer" and float(G.inv.get("detergent", 0)) < float(Laundry.model_of(m).soap):
		_ask_detergent()
		return
	queue(_job(spot, spot.face, _load.bind(m, spot, o)))


func _unload(m: Dictionary, spot: Dictionary, swap_in: Dictionary) -> void:
	if m.state != "done":
		return
	var kind: String = m.kind
	var swapping: bool = not swap_in.is_empty() and not can_carry_more() and swap_in.id in carry
	if not swapping and not can_carry_more():
		return
	# an earlier queued job may have used the last detergent: don't unload into a dead end
	if swapping and kind == "washer" and float(G.inv.get("detergent", 0)) < float(Laundry.model_of(m).soap):
		_ask_detergent()
		return
	await _machine_action(m, spot.pose, 0.9 if swapping else 0.55)
	var id := Laundry.unload(m)
	var o := Laundry.order(id)
	var new_carry := carry.duplicate()
	if swapping and Laundry.start_cycle(m, swap_in.id).ok:
		_loaded_into(m, swap_in)
		new_carry.erase(swap_in.id)
	if not o.is_empty():
		o.stage = "carried"
		o.machine = ""
		new_carry.append(o.id)
	set_carry(new_carry)
	Sound.play(Rng.shared.pick(["cloth2", "cloth3"]), 0.9)
	G.add_stat("energy", -1)
	update_sound()
	if swapping:
		await Story.trigger("loaded", {"o": swap_in, "m": m})
	Story.trigger("unloaded", {"o": o, "m": m})


func _load(m: Dictionary, spot: Dictionary, o: Dictionary) -> void:
	if not Laundry.is_free(m) or not o.id in carry:
		return
	await _machine_action(m, spot.pose, 0.7)
	var res := Laundry.start_cycle(m, o.id)
	if not res.ok:
		UI.toast("Out of detergent!" if res.reason == "soap" else "Machine unavailable.", "", "bad")
		return
	_loaded_into(m, o)
	set_carry(carry.filter(func(id: String) -> bool: return id != o.id))
	update_sound()
	Story.trigger("loaded", {"o": o, "m": m})


## Bookkeeping after an order goes into a machine.
func _loaded_into(m: Dictionary, o: Dictionary) -> void:
	var kind: String = m.kind
	if kind == "washer" and o.softener and float(G.inv.get("softener", 0)) >= 1:
		G.inv.softener -= 1
		o.softener_ok = true
	if kind == "washer" and o.softener:
		o.softener_wanted = true
	var model := Laundry.model_of(m)
	if o.gentle and model.get("gentle", false):
		o.gentle_ok = true
	if model.has("care"):
		o.care = minf(0.1, o.care + model.care)
	o.machine = m.id
	o.stage = "washing" if kind == "washer" else "drying"
	Sound.play("machine_door", 0.8)
	Sound.play("machine_start", 0.5, 1.0, 0.0, 0.25)
	G.add_stat("energy", -1)
	Settings.vibrate(12)


func _ask_detergent() -> void:
	Sound.play("error", 0.5)
	var yes: bool = await UI.confirm("Out of detergent", "The supply shelf is empty. Order a jug now?", "Buy (%s)" % Util.money(DecorData.SUPPLIES.detergent.price), "Later")
	if yes:
		UI.menus.buy_supply("detergent")


func _machine_action(m: Dictionary, pose: String, secs: float) -> void:
	unit_of(m).open_door(m.id, secs + 0.35)
	Sound.play("latch", 0.5)
	player.set_pose(pose if pose != "" else "load", secs)
	await App.wait(secs)


func _offer_tune_up(m: Dictionary, spot: Dictionary) -> void:
	var top := machine_top(m)
	UI.context_menu(cam().to_screen(top - Vector2(0, 20)), "%s · %d%%" % [Laundry.model_of(m).name, roundi(m.cond)], [
		{"label": "Tune up (20 min)", "icon": "icon_wrench", "run": func() -> void: queue(_job(spot, spot.face, _do_tune_up.bind(m)))},
	])


func _do_tune_up(m: Dictionary) -> void:
	player.set_pose("load", 1.2)
	Sound.play("ratchet", 0.7)
	await App.wait(1.2)
	m.cond = clampf(m.cond + 22 + G.skills.repair * 4, 0, 100)
	G.time += 20
	G.add_stat("energy", -4)
	UI.toast("Tuned up · condition %d%%" % roundi(m.cond), "icon_wrench")


func _do_repair(m: Dictionary) -> void:
	if float(G.inv.get("parts", 0)) < 1:
		var yes: bool = await UI.confirm("No spare parts", "This needs a new belt or seal. Order a parts kit?", "Buy (%s)" % Util.money(DecorData.SUPPLIES.parts.price), "Later")
		if not yes:
			return
		if not UI.menus.buy_supply("parts"):
			return
	player.set_pose("load", 30)
	App.ui_block += 1
	var q: float = await UI.repair_game(4 if m.cond < 10 else 3)
	App.ui_block -= 1
	player.set_pose("idle")
	G.take_item("parts", 1)
	Laundry.repair(m, q)
	G.time += 25
	G.add_stat("energy", -6)
	var d := door_geom(m)
	particles.emit("sparkle", d.cx, d.cy, 10)
	UI.toast("Repaired! %s is running again." % Laundry.model_of(m).name, "icon_wrench")
	if q > 0.8 and G.skills.repair < 5:
		G.vars.repairXp = G.var_num("repairXp") + 1
	Story.trigger("repaired", {"m": m, "q": q})


func _do_lint(m: Dictionary) -> void:
	player.set_pose("load", 0.8)
	await App.wait(0.8)
	Laundry.clean_lint(m)
	var u := unit_of(m)
	var b := u.box(m)
	particles.emit("lint", u.position.x + b.position.x + b.size.x * 0.5, u.position.y + b.position.y + b.size.y * 0.9, 14)
	Sound.play("cloth4", 0.7)
	G.add_stat("cleanliness", 2)
	UI.toast("Lint trap cleaned. Dryer runs faster.", "icon_dryer")


# ------------------------------------------------------------------ folding and the shelf
func _on_fold_tapped(_p: Vector2) -> void:
	var o := _first_needing("fold")
	if o.is_empty():
		var held := carried()
		if not held.is_empty():
			UI.toast("%s's laundry isn't ready to fold yet." % held[0].name, "icon_towels")
		else:
			UI.toast("The folding table. Bring dry laundry here.", "icon_towels")
		return
	queue(_job(fold_table.position + Vector2(0, -18), 1, _fold.bind(o)))


func _fold(o: Dictionary) -> void:
	if not o.id in carry:
		return
	mode = "fold"
	player.visible = false
	o.stage = "folding"
	App.ui_block += 1
	var q: float = await UI.fold_game(o.color)
	App.ui_block -= 1
	o.fold = q
	if q > 0.85:
		G.stats.perfect_folds = int(G.stats.get("perfect_folds", 0)) + 1
	if q > 0.75 and G.skills.fold < 5:
		G.vars.foldXp = G.var_num("foldXp") + 1
		if int(G.vars.foldXp) % 12 == 0:
			G.skills.fold += 1
			UI.toast("Folding skill up!", "icon_star")
	G.add_stat("energy", -2)
	await App.wait(0.3)
	mode = ""
	player.visible = true
	o.stage = "carried"
	# straight to the pickup shelf
	var at := _spot("Shelf")
	await player.walk_to(at.x, at.y, -1)
	await _place_on_shelf(o)


func _on_shelf_tapped(_p: Vector2) -> void:
	var o := _first_needing("shelf")
	if o.is_empty():
		var n := G.shelf.size()
		UI.toast("%d order%s waiting for pickup." % [n, "s" if n > 1 else ""] if n > 0 else "The pickup shelf is empty.", "icon_towels")
		return
	queue(_job(_spot("Shelf"), -1, _place_on_shelf.bind(o)))


func _place_on_shelf(o: Dictionary) -> void:
	if not o.id in carry:
		return
	player.facing = -1
	player.set_pose("reach", 0.6)
	Sound.play("cloth3", 0.8)
	await App.wait(0.6)
	set_carry(carry.filter(func(id: String) -> bool: return id != o.id))
	Laundry.finish_order(o)
	particles.emit("sparkle", shelf.position.x, shelf.position.y - 220 * 0.6, 6)
	Story.trigger("ready", {"o": o})


# ------------------------------------------------------------------ the bench
func _on_seat_tapped(_p: Vector2) -> void:
	if not carry.is_empty():
		UI.toast("Put the laundry somewhere first.", "icon_basket")
		return
	queue(_job(seat.position + Vector2(0, 12), 0, _sit))


func _sit() -> void:
	mode = "sit"
	player.visible = false
	sit_t = 0.0
	Sound.play("thud", 0.4)
	UI.toast("Taking a breather… (tap to get up)", "icon_heart")


func _stand_up() -> void:
	mode = ""
	player.visible = true
	player.position.y = seat.position.y + 14
	player.set_pose("stretch", 0.9)


# ------------------------------------------------------------------ doors, wall, decor
func _on_supply_tapped(_p: Vector2) -> void:
	UI.menus.open_catalog("supplies")


func _on_prices_tapped(_p: Vector2) -> void:
	UI.menus.open_catalog("prices")


func _on_clock_tapped(_p: Vector2) -> void:
	UI.toast("%s — %s" % [Util.clock_str(G.time), "open until 6:00 PM" if shift_running else "closed"], "icon_clock")


func _on_back_door_tapped(_p: Vector2) -> void:
	if shift_running:
		UI.toast("Upstairs has to wait — the shop is open.", "icon_home")
		return
	queue(_job(_spot("BackDoor"), 0, _leave.bind("home")))


func _on_front_door_tapped(_p: Vector2) -> void:
	if shift_running:
		if G.time >= 16 * 60:
			Day.ask_close_early()
			return
		UI.toast("The shop is open until 6. Customers come in through here.", "icon_clock")
		return
	queue(_job(_spot("FrontDoor"), 0, _leave.bind("street")))


## Out through a door (the scene changes, so nothing waits for it here).
func _leave(where: String) -> void:
	Day.leave_laundromat(where)


func _on_slot_tapped(slot: String, _p: Vector2) -> void:
	var id: String = G.placed.get(slot, "")
	if id == "":
		return
	var d: Dictionary = DecorData.DECOR[id]
	match d.get("fn", ""):
		"music":
			UI.menus.record_picker()
		"tea":
			var base := _slot_node(slot).floor_point()
			queue(_job(Vector2(base.x - 70, clampf(base.y - 20, walk_band.x, walk_band.y)), 1, _make_tea))
		"community", "notes":
			UI.menus.community_board()
		_:
			UI.toast("%s — %s" % [d.name, d.blurb])


func _slot_node(slot: String) -> DecorSlot:
	for s: DecorSlot in get_tree().get_nodes_in_group("decor_slots"):
		if is_ancestor_of(s) and s.slot_id == slot:
			return s
	return null


func _make_tea() -> void:
	if not G.take_item("tea", 1):
		UI.toast("Out of tea. (Order a tin from the supplies catalog.)", "item_teacup", "bad")
		return
	player.set_pose("reach", 1.0)
	Sound.play("kettle", 0.5)
	await App.wait(1.0)
	Sound.play("cup", 0.8)
	player.set_pose("tea", 2.2)
	G.add_stat("energy", 14)
	G.time += 10
	var table := _slot_node("lounge_table").floor_point()
	particles.emit("steam", table.x, table.y - 88 - 50, 8)
	UI.toast("A cup of tea. +energy", "item_teacup")


# ------------------------------------------------------------------ floor chores
func _mop_puddle(p: Dictionary) -> void:
	queue(_job(Vector2(p.x - 40, p.y + 6), 1, _mop.bind(p)))


func _mop(p: Dictionary) -> void:
	if not Laundry.puddles.has(p):
		return
	player.set_pose("mop", 1.3)
	Sound.play("mop", 0.9)
	for i in 3:
		get_tree().create_timer(i * 0.3).timeout.connect(func() -> void: particles.emit("splash", p.x, p.y, 4))
	await App.wait(1.3)
	Laundry.clear_puddle(p.id)
	G.add_stat("energy", -2)
	particles.emit("sparkle", p.x, p.y - 10, 5)


func _pick_litter(l: Dictionary) -> void:
	queue(_job(Vector2(l.x - 30, l.y + 4), 1, _pick.bind(l)))


func _pick(l: Dictionary) -> void:
	if not Laundry.litter.has(l):
		return
	player.set_pose("pet", 0.7)
	await App.wait(0.5)
	Laundry.litter.erase(l)
	if l.kind == "sock":
		UI.menus.found_sock("shop")
	else:
		G.add_stat("cleanliness", 3)
		UI.toast("Lint bunny caught.", "scn_lint")
	Sound.play("pop", 0.6)


# ------------------------------------------------------------------ visitors
func spawn_visitor(id: String, opts: Dictionary = {}) -> Dictionary:
	if visitors.has(id):
		return visitors[id]
	# pop in just inside the door (side by side if two people come in together), then hop over
	var entering := visitors.values().filter(func(o: Dictionary) -> bool: return o.state == "enter").size()
	var a: Actor = NPC_SCENE.instantiate()
	a.setup_npc(id)
	a.speed = 190
	a.position = _spot("FrontDoor") + Vector2(-entering * 80, entering * 12)
	a.facing = -1
	entities.add_child(a)
	var v := {"id": id, "actor": a, "state": "enter", "leave_at": G.time + float(opts.get("stay", 60)), "order": "", "pinned": false}
	visitors[id] = v
	Sound.play("shop_bell", 0.7)
	var dest: Dictionary
	if opts.has("to"):
		dest = opts.to
	elif opts.get("order"):
		dest = counter_spot()
	else:
		dest = _free_lounge_spot()
	_visitor_arrives(v, dest, opts)
	return v


func _visitor_arrives(v: Dictionary, dest: Dictionary, opts: Dictionary) -> void:
	var a: Actor = v.actor
	await a.appear()
	await App.wait(0.3)
	if not is_instance_valid(a) or v.state != "enter":
		return
	var face: int = -1 if dest.x < 900 else dest.get("face", -1)
	await a.walk_to(dest.x, dest.y, face)
	if not is_instance_valid(a) or v.state != "enter":
		return
	v.state = "here"
	a.facing = face
	if opts.get("order"):
		_drop_off_friend_order(v)
	if opts.get("neighbour", false):
		await Story.neighbour_chat(v.id)
	else:
		await Story.trigger("arrive", {"who": v.id, "v": v})
	if not is_instance_valid(a):
		return
	if v.order != "" and v.state == "here":
		var spot := _free_lounge_spot()
		await a.walk_to(spot.x, spot.y, spot.face)


## After close, Maya does her laundry here on her nights off (she's already in when you arrive).
func _place_night_visitors() -> void:
	G.vars.erase("maya_here")
	if shift_running or G.time < 20 * 60 or not G.flag("met_maya") or not Story.can_visit("maya"):
		return
	var forced: String = G.vars.get("at_maya", "")
	var nights: Array = CharactersData.ROUTINES.maya.evening.get("laundromat_night", [])
	if (forced != "" and forced != "laundromat") or (forced == "" and not G.weekday() in nights):
		return
	var a: Actor = NPC_SCENE.instantiate()
	a.setup_npc("maya")
	a.speed = 190
	a.position = _spot("MayaNight")
	a.facing = -1
	entities.add_child(a)
	visitors.maya = {"id": "maya", "actor": a, "state": "here", "leave_at": 26.0 * 60.0, "order": "", "pinned": true}
	if G.talked.get("maya") != G.day:
		a.say("…", 99999)
	G.vars.maya_here = true


func _free_lounge_spot() -> Dictionary:
	for i in range(1, 5):
		var s := _spot("Lounge%d" % i)
		var taken := false
		for v: Dictionary in visitors.values():
			if absf(v.actor.position.x - s.x) < 60 and absf(v.actor.position.y - s.y) < 30:
				taken = true
		if not taken:
			return {"x": s.x, "y": s.y, "face": -1}
	var s0 := _spot("Lounge1")
	return {"x": s0.x, "y": s0.y, "face": -1}


func _drop_off_friend_order(v: Dictionary) -> void:
	var spec: Dictionary = RegularsData.FRIEND_ORDERS.get(v.id, {})
	if spec.is_empty():
		return
	var s := {"who": v.id, "name": CharactersData.CHARACTERS[v.id].name, "personal": true}
	s.merge(spec, true)
	s.dueIn = 150
	var o := Laundry.create_order(s)
	o.personal = true
	v.order = o.id
	v.actor.say("basket", 3)


func _tap_visitor(v: Dictionary) -> void:
	var a: Actor = v.actor
	if v.state != "here":
		return
	# hand over finished laundry in person
	var o := Laundry.order(v.order) if v.order != "" else {}
	var talk_x := clampf(a.position.x + (-110.0 if a.position.x > 1000 else 110.0), 60, 2020)
	var ok: bool = await player.walk_to(talk_x, clampf(a.position.y + 6, walk_band.x, walk_band.y), 1 if a.position.x > talk_x else -1)
	if not ok or not is_instance_valid(a) or v.state != "here":
		return
	player.facing = 1 if a.position.x > player.position.x else -1
	a.facing = -player.facing
	if not o.is_empty() and o.stage == "ready":
		await _hand_over(v, o)
		return
	UI.context_menu(cam().to_screen(a.position - Vector2(0, a.disp_h() + 20)), CharactersData.display_name(v.id), [
		{"label": "Talk", "icon": "icon_speech", "run": _talk_to.bind(v)},
		{"label": "Give gift", "icon": "icon_heart", "run": Story.gift_to.bind(v.id)},
	])


func _talk_to(v: Dictionary) -> void:
	if v.actor.emote == "…":
		v.actor.emote = ""
	await Story.talk(v.id, "laundromat")


func _hand_over(v: Dictionary, o: Dictionary) -> void:
	player.set_pose("wave", 0.6)
	var r := Laundry.pickup(o)
	var pos := cam().to_screen(v.actor.position - Vector2(0, v.actor.disp_h()))
	UI.money_pop(r.pay + r.tip, pos)
	Sound.play("register", 0.7)
	Sound.play("coins", 0.8)
	v.order = ""
	await Story.trigger("handover", {"who": v.id, "q": r.q, "onTime": r.onTime})
	Story.add_hearts(v.id, 12 + roundi(r.q * 10) if r.onTime else 4, true)
	UI.hud.refresh()


func visitor_leave(v: Dictionary) -> void:
	if v.state == "leaving":
		return
	v.state = "leaving"
	# laundry they dropped off stays: it goes on the pickup shelf like anyone else's
	var o := Laundry.order(v.order) if v.order != "" else {}
	if not o.is_empty() and o.stage != "done":
		o.personal = false
		v.order = ""
		UI.hud.refresh_tickets()
	_visitor_leaves(v)


func _visitor_leaves(v: Dictionary) -> void:
	var a: Actor = v.actor
	var door := _spot("FrontDoor")
	await a.walk_to(door.x, door.y)
	if not is_instance_valid(a):
		return
	Sound.play("shop_bell", 0.5)
	await a.vanish()
	if not is_instance_valid(a):
		return
	a.queue_free()
	if visitors.get(v.id) == v:
		visitors.erase(v.id)


## A neighbour bringing laundry in sometimes stays for a word: always when their story has a
## moment waiting, otherwise every other day or so (two chats a day at most). With in-world art
## they pop in at the counter; without it, you hear them from behind the counter.
func _neighbour_drop_in(who: String) -> void:
	if G.day < 2 or Story.busy or visitors.has(who) or mode == "fold":
		return
	var due := Story.pending("arrive", {"who": who})
	var chats := int(G.today.get("nb_chats", 0))
	if not due and (G.day - int(G.vars.get("nb_last_" + who, -9)) < 2 or chats >= 2 or G.talked.get(who) == G.day):
		return
	G.vars["nb_last_" + who] = G.day
	G.today.nb_chats = chats + 1
	if CharactersData.has_sprite(who):
		var c := counter_spot()
		c.face = -1
		spawn_visitor(who, {"to": c, "stay": 25.0, "neighbour": true})
	else:
		Story.neighbour_chat(who)


## Picking up on time is how you mostly get to know the neighbours.
func _neighbour_thanks(who: String, on_time: bool) -> void:
	Story.add_hearts(who, 15 if on_time else 3, true)
	for r: Dictionary in RegularsData.REGULARS:
		if r.id == who and r.has("thanks"):
			UI.toast("%s: “%s”" % [CharactersData.display_name(who), r.thanks[0 if on_time else 1]], CharactersData.face_or_icon(who), "" if on_time else "bad", 3200)
			return


func _schedule_visitors() -> void:
	if not shift_running:
		return
	var wd := G.weekday()
	for id in ["walt", "maya", "june", "remy"]:
		if visitors.has(id) or G.vars.get("visited_" + id) == G.day:
			continue
		if not Story.can_visit(id):
			continue
		# routine visits are for people you know; Maya and Remy drop in to introduce themselves
		# if you haven't met them elsewhere by then
		if not G.flag("met_" + id) and not (id == "maya" and G.day >= 2) and not (id == "remy" and G.day >= 4):
			continue
		var rt: Dictionary = CharactersData.ROUTINES[id]
		for s: Dictionary in rt.shift:
			if not wd in s.days:
				continue
			if G.time < s.at or G.time > s.at + 60:
				continue
			if s.has("chance") and float((G.rng_seed + G.day * 13 + id.length()) % 100) / 100.0 > s.chance:
				continue
			G.vars["visited_" + id] = G.day
			var laundry_day: bool = s == rt.shift[0]
			var spec := {"stay": float(s.stay)}
			if laundry_day and RegularsData.FRIEND_ORDERS.has(id):
				spec.order = true
			spawn_visitor(id, spec)
			break
	for v: Dictionary in visitors.values():
		if v.state != "here" or v.pinned:
			continue
		var o := Laundry.order(v.order) if v.order != "" else {}
		if not o.is_empty() and o.stage != "done":
			if o.stage == "ready":
				v.actor.say("basket", 1)
			continue
		if G.time >= v.leave_at:
			visitor_leave(v)


# ------------------------------------------------------------------ the simulation's news
func _on_sim_event(e: Dictionary) -> void:
	match e.type:
		"orderArrived":
			if not e.o.personal:
				Sound.play("bell_small", 0.8)
				UI.toast("%s dropped off laundry." % e.o.name, "icon_basket")
			e.o.color = Rng.shared.pick(LAUNDRY_COLORS)
			UI.hud.refresh_tickets()
			if e.o.who in G.NEIGHBOURS:
				_neighbour_drop_in(e.o.who)
		"cycleDone":
			if e.m.load != "self":
				Sound.play("machine_done", 0.6)
				Settings.vibrate(20)
			UI.hud.refresh_tickets()
			update_sound()
		"broke":
			Sound.play("machine_error", 0.8)
			Sound.play("clank2", 0.7, 1.0, 0.0, 0.2)
			var p := machine_top(e.m)
			particles.emit("smoke", p.x, p.y + 30, 8)
			UI.toast("%s broke down! Tap it to repair." % ("A washer" if e.m.kind == "washer" else "A dryer"), "icon_wrench", "bad", 3500)
			update_sound()
		"walkIn":
			Sound.play("shop_bell", 0.35)
			Sound.play("coin", 0.5, 1.0, 0.0, 0.8)
			var p := machine_top(e.m)
			get_tree().create_timer(0.8).timeout.connect(func() -> void: particles.emit("coin", p.x, p.y, 1))
			update_sound()
		"walkInTurnedAway":
			if G.time - warned_full > 90:
				warned_full = G.time
				UI.toast("A walk-in left — no free washers.", "icon_washer", "bad")
		"pickedUp":
			if e.o.personal:
				return
			Sound.play("shop_bell", 0.35)
			Sound.play("coins", 0.7, 1.0, 0.0, 0.3)
			UI.money_pop(e.pay + e.tip, cam().to_screen(shelf.position - Vector2(0, 200)))
			particles.emit("coin", shelf.position.x + 60, shelf.position.y - 120, 2)
			if e.o.who in G.NEIGHBOURS and G.flag("met_" + e.o.who):
				_neighbour_thanks(e.o.who, e.onTime)
			elif not e.onTime:
				UI.toast("%s got their laundry late." % e.o.name, "icon_clock", "bad")
			elif e.tip > 0:
				UI.toast("%s picked up — tip %s!" % [e.o.name, Util.money(e.tip)], "icon_coin")
			UI.hud.refresh()
			UI.hud.refresh_tickets()
		"orderLate":
			UI.hud.refresh_tickets()
		"puddle":
			if randf() < 0.5:
				Sound.play("drop", 0.25)
		"selfMove":
			update_sound()


# ------------------------------------------------------------------ every frame
func update(dt: float) -> void:
	super(dt)
	var paused := App.paused()
	update_actors(dt, paused)
	if not paused:
		if shift_running:
			var pace: float = {"relaxed": 1.4, "normal": 2.0, "brisk": 3.0}.get(Settings.get_value("pace"), 2.0)
			var dm := dt * pace
			G.time += dm
			Laundry.tick(dm)
			if int(floor(G.time)) != clock_ticked:
				clock_ticked = int(floor(G.time))
				_schedule_visitors()
				Story.on_minute()
				if not warned_closing and G.time >= 17 * 60 + 30:
					warned_closing = true
					UI.toast("Closing in half an hour.", "icon_clock")
				if G.time >= Laundry.CLOSE_AT and not busy and mode == "":
					shift_running = false
					Day.end_shift()
				UI.hud.refresh()
			sound_sig_t -= dt
			if sound_sig_t <= 0:
				sound_sig_t = 2.0
				update_sound()
		else:
			for v: Dictionary in visitors.values():
				if v.state == "here" and not v.pinned and G.time >= v.leave_at:
					visitor_leave(v)
		if mode == "sit":
			sit_t += dt
			if sit_t > 1.5:
				sit_t = 0.0
				G.add_stat("energy", 1.2)
				G.time += 1
	particles.update(dt)
	apply_fatigue(330, "Running on fumes. Sit on the bench or make a cup of tea to catch your breath." if shift_running else "")
	glass.intensity = 0.8 if G.weather == "rain" else 1.0 if G.weather == "storm" else 0.0
	glass.update(dt)
	view.update_view(dt, cam().x)
	follow(player, dt)
	for u: MachineUnit in get_tree().get_nodes_in_group("machine_units"):
		if is_ancestor_of(u):
			u.update(dt, particles)
	shelf.refresh(t)
	fold_table.refresh(dt, mode == "fold")
	seat.refresh(mode == "sit")
	$Wall/CoinChanger.visible = "coin_changer" in G.upgrades
	$Wall/WaterHeater.visible = "water_heater" in G.upgrades
	if G.record != "" and G.placed.get("lounge_table") == "record_player" and randf() < dt * 0.6:
		var table := _slot_node("lounge_table").floor_point()
		particles.emit("note", table.x, table.y - 88 - 60, 1)
	# a puddle catches the light now and then
	for p in Laundry.puddles:
		if sin(t * 3 + p.id) > 0.95:
			particles.emit("sparkle", p.x + 20, p.y - 5, 1, {"color": "#dff0ff"})
