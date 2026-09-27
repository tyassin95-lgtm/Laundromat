extends Node
## The laundromat simulation: machines, drop-off orders, self-service walk-ins, wear and customer
## satisfaction. Pure game logic, no drawing: the laundromat scene shows it and drives the player's
## actions. Autoloaded as Laundry.
##
## Machines and orders are Dictionaries kept in G.machines / G.orders:
##   machine: id, kind (washer|dryer), slot, model, cond, broken, state ("" | running | done),
##            load ("" | order id | "self"), t, dur (minutes), lint, uses, break_at, collect_at
##   order:   id, who, name, icon, service, stage (counter | carried | washing | washed | drying |
##            dried | folding | ready | done), machine, due, price, note, fold (-1 = not folded)...

## Something happened that the scene may want to show: {type, ...}. Types: orderArrived, cycleStart,
## cycleDone, broke, repaired, lintCleaned, orderReady, walkIn, walkInTurnedAway, selfMove,
## selfGaveUp, selfCollected, pickedUp, orderLate, puddle, litter.
signal sim_event(ev: Dictionary)

const OPEN_AT := 480.0
const CLOSE_AT := 1080.0
const SELF_WASH := 3.5
const SELF_DRY := 2.5
const WASHER_SLOTS := MachinesData.WASHER_SLOTS
const DRYER_UNITS := MachinesData.DRYER_UNITS
const MODELS := MachinesData.MODELS

# The shift in progress (not saved, except mid-shift through G.sim_save).
var plan := []              # today's scheduled drop-offs
var next_walk_in := 0.0
var self_queue := []        # walk-ins waiting for a dryer: [{washer, since}]
var puddles := []           # {id, x, y, size}
var litter := []            # {id, x, y, kind: sock | lint}
var seq := 1


func _emit(type: String, data: Dictionary = {}) -> void:
	var ev := data.duplicate()
	ev.type = type
	sim_event.emit(ev)


func _up(id: String) -> bool:
	return id in G.upgrades


# ------------------------------------------------------------------ the upgrade tree
func is_unlocked(key: String) -> bool:
	var M: Dictionary = MODELS[key]
	if M.tier == 1 or key in G.unlocked:
		return true
	for p in M.get("from", []):
		if p in G.unlocked:
			return true
	return false


func note_owned() -> void:
	for m in G.machines:
		if not m.model in G.unlocked:
			G.unlocked.append(m.model)


## Upgrading trades the old machine in for 40% of its price.
func trade_in(key: String) -> int:
	return roundi(MODELS[key].price * 0.4)


func upgrade_cost(from_key: String, to_key: String) -> int:
	return int(MODELS[to_key].price) - trade_in(from_key)


func children_of(key: String) -> Array:
	var out := []
	for k in MODELS:
		if key in MODELS[k].get("from", []):
			out.append(k)
	return out


## The machines that make up one washer bay or dryer tower.
func unit_of(m: Dictionary) -> Array:
	if m.kind == "washer":
		return [m]
	var out := []
	for d in G.machines:
		if d.kind == "dryer" and int(d.slot) / 2 == int(m.slot) / 2:
			out.append(d)
	return out


func unit_busy(m: Dictionary) -> bool:
	for d in unit_of(m):
		if d.get("state", "") != "" or d.get("load", "") != "":
			return true
	return false


func install_model(kind: String, bay: int, key: String) -> void:
	if kind == "washer":
		G.machines.append({"id": "W%d_%d" % [bay + 1, G.order_seq], "kind": kind, "slot": bay, "model": key, "cond": 100.0, "broken": false})
		G.order_seq += 1
	else:
		for k in [0, 1]:
			G.machines.append({"id": "D%d_%d" % [bay * 2 + k + 1, G.order_seq], "kind": kind, "slot": bay * 2 + k, "model": key, "cond": 100.0, "broken": false})
			G.order_seq += 1
	ensure_machine_fields()
	note_owned()


func upgrade_unit(m: Dictionary, key: String) -> void:
	for d in unit_of(m):
		d.model = key
		d.cond = 100.0
		d.broken = false
		d.lint = 0.0
		d.break_at = -1.0
	note_owned()


# ------------------------------------------------------------------ machines
func washers() -> Array:
	var a := G.machines.filter(func(m: Dictionary) -> bool: return m.kind == "washer")
	a.sort_custom(func(x: Dictionary, y: Dictionary) -> bool: return x.slot < y.slot)
	return a


func dryers() -> Array:
	var a := G.machines.filter(func(m: Dictionary) -> bool: return m.kind == "dryer")
	a.sort_custom(func(x: Dictionary, y: Dictionary) -> bool: return x.slot < y.slot)
	return a


func machine(id: String) -> Dictionary:
	for m in G.machines:
		if m.id == id:
			return m
	return {}


func model_of(m: Dictionary) -> Dictionary:
	return MODELS.get(m.get("model", ""), MODELS.classic)


func cycle_minutes(m: Dictionary) -> float:
	var c := float(model_of(m).cycle)
	if m.kind == "dryer" and m.lint >= 5:
		c *= 1.35
	if m.kind == "washer" and _up("water_heater"):
		c *= 0.8
	return c


func is_free(m: Dictionary) -> bool:
	return not m.broken and m.state == "" and m.load == ""


func ensure_machine_fields() -> void:
	note_owned()
	for m in G.machines:
		for k in ["state", "load"]:
			if m.get(k) == null:
				m[k] = ""
		for k in ["t", "dur", "lint"]:
			if m.get(k) == null:
				m[k] = 0.0
		if m.get("uses") == null:
			m.uses = 0
		for k in ["break_at", "collect_at"]:
			if m.get(k) == null:
				m[k] = -1.0
		if m.get("self_color") == null:
			m.self_color = ""


## Starts a cycle with an order (or "self"). Returns {ok, reason}.
func start_cycle(m: Dictionary, load_id: String) -> Dictionary:
	if m.broken:
		return {"ok": false, "reason": "broken"}
	if m.state != "":
		return {"ok": false, "reason": "busy"}
	var model := model_of(m)
	if m.kind == "washer" and load_id != "self":
		if float(G.inv.get("detergent", 0)) < float(model.soap):
			return {"ok": false, "reason": "soap"}
		G.inv.detergent = roundf((float(G.inv.get("detergent", 0)) - float(model.soap)) * 10.0) / 10.0
	# wear, and maybe a breakdown partway through
	m.cond = clampf(float(m.get("cond", 60)) - float(model.wear) * (0.6 + randf() * 0.8), 0.0, 100.0)
	var break_chance := 0.55 if m.cond < 12 else 0.2 if m.cond < 25 else 0.05 if m.cond < 40 else 0.0
	m.load = load_id
	m.state = "running"
	m.t = 0.0
	m.dur = cycle_minutes(m)
	m.uses += 1
	if m.kind == "dryer":
		m.lint = float(m.lint) + float(model.get("lint", 1)) * (0.5 if _up("lint_screens") else 1.0)
	G.stats.cycles += 1
	G.vars.cyclesToday = G.var_num("cyclesToday") + 1
	G.vars.weekCycles = G.var_num("weekCycles") + 1
	if randf() < break_chance and G.day > 1:
		m.break_at = 0.25 + randf() * 0.5
	else:
		m.break_at = -1.0
	_emit("cycleStart", {"m": m})
	return {"ok": true}


func unload(m: Dictionary) -> String:
	var l: String = m.load
	m.load = ""
	m.state = ""
	m.t = 0.0
	m.dur = 0.0
	return l


func repair(m: Dictionary, quality: float) -> void:
	m.broken = false
	m.cond = clampf(55.0 + quality * 35.0 + G.skills.repair * 3.0, 0.0, 100.0)
	G.stats.repairs += 1
	_emit("repaired", {"m": m})


func clean_lint(m: Dictionary) -> void:
	m.lint = 0.0
	_emit("lintCleaned", {"m": m})


# ------------------------------------------------------------------ orders
func order(id: String) -> Dictionary:
	for o in G.orders:
		if o.id == id:
			return o
	return {}


func active_orders() -> Array:
	return G.orders.filter(func(o: Dictionary) -> bool: return o.stage != "done")


func create_order(spec: Dictionary) -> Dictionary:
	var svc_key: String = spec.get("service", "wash_fold")
	if not RegularsData.SERVICES.has(svc_key):
		svc_key = "wash_fold"
	var svc: Dictionary = RegularsData.SERVICES[svc_key]
	var o := {
		"id": "o%d" % G.order_seq,
		"who": spec.get("who", ""),                  # friend id or regular id
		"name": spec.get("name", ""),
		"icon": spec.get("icon", ""),
		"service": svc_key,
		"stage": "counter",
		"machine": "",
		"created": G.time,
		"due": minf(CLOSE_AT - 10.0, G.time + float(spec.get("dueIn", svc.dueIn))),
		"price": float(spec.get("price", svc.price)),
		"note": spec.get("note", ""),
		"softener": bool(spec.get("softener", false)),
		"gentle": bool(spec.get("gentle", false)) or svc_key == "delicate",
		"fold": -1.0,
		"late": false,
		"bag": spec.get("bag", "item_drawstring_bag"),
		"story": spec.get("story", ""),
		"day": G.day,
		"washed": false, "dried": false, "ready_at": -1.0, "personal": bool(spec.get("personal", false)),
		"softener_ok": false, "softener_wanted": false, "gentle_ok": false, "care": 0.0,
		"note_read": false, "color": "", "quality": 0.0,
	}
	if o.note == null:
		o.note = ""
	G.order_seq += 1
	G.orders.append(o)
	_emit("orderArrived", {"o": o})
	return o


func stages_of(o: Dictionary) -> Array:
	return RegularsData.SERVICES.get(o.service, RegularsData.SERVICES.wash_fold).stages


func stage_index(o: Dictionary) -> int:
	var st := stages_of(o)
	if (o.stage == "carried" or o.stage == "counter") and o.washed:
		return 2 if o.dried else 1
	var idx := {"counter": 0, "carried": 0, "washing": 0, "washed": 1, "drying": 1, "dried": 2, "folding": 2, "ready": st.size(), "done": st.size()}
	return idx.get(o.stage, 0)


## What should happen next with this order when the player holds it.
func next_step(o: Dictionary) -> String:
	if not o.washed:
		return "wash"
	if not o.dried:
		return "dry"
	if "fold" in stages_of(o) and o.fold < 0:
		return "fold"
	return "shelf"


func finish_order(o: Dictionary, when: float = -1.0) -> void:
	o.stage = "ready"
	o.ready_at = when if when >= 0 else G.time
	if not o.id in G.shelf:
		G.shelf.append(o.id)
	_emit("orderReady", {"o": o})


## The customer collects the order: pay, tip, reputation.
func pickup(o: Dictionary) -> Dictionary:
	var ready: float = o.ready_at if o.ready_at >= 0 else G.time
	var on_time: bool = not o.late and ready <= o.due + 5
	var fold_q: float = 0.8 if o.fold < 0 else o.fold
	var q := (0.55 if on_time else 0.2) + fold_q * 0.25 + (G.cleanliness / 100.0) * 0.1 + comfort_score() * 0.1 + (0.05 if _up("wifi") else 0.0)
	if o.softener_wanted:
		q += 0.05 if o.softener_ok else -0.08
	if o.gentle and o.gentle_ok:
		q += 0.05
	q += float(o.care)
	q = clampf(q, 0.0, 1.0)
	var prices: String = G.policies.prices
	var pwyc := G.pwyc_today()
	var price_mul := 0.5 if pwyc else 0.85 if prices == "low" else 1.2 if prices == "high" else 1.0
	var pay := roundi(o.price * price_mul)
	var tip := 0 if pwyc else roundi(o.price * 0.35 * maxf(0.0, q - 0.45) / 0.55 * (0.5 if prices == "high" else 1.0))
	if pwyc:
		G.add_stat("community", 1.2)
	G.add_money(pay, "%s — %s" % [o.name, RegularsData.SERVICES[o.service].label], "order")
	if tip > 0:
		G.add_money(tip, "Tip from %s" % o.name, "tip")
	var rep_delta := (q - 0.55) * 4.0 - (0.6 if prices == "high" else 0.0) + (0.3 if prices == "low" else 0.0)
	G.add_stat("reputation", rep_delta)
	if G.flag("petition_started") and q > 0.6:
		G.petition += 1 + (1 if q > 0.85 else 0)
	o.stage = "done"
	o.quality = q
	G.shelf.erase(o.id)
	G.today.orders += 1
	G.stats.orders += 1
	if not on_time:
		G.today.late += 1
		G.stats.late += 1
	if q > 0.9:
		G.stats.perfect += 1
	_emit("pickedUp", {"o": o, "pay": pay, "tip": tip, "q": q, "onTime": on_time})
	return {"pay": pay, "tip": tip, "q": q, "onTime": on_time}


## How cosy the shop is (0..1), from the decor placed in it.
func comfort_score() -> float:
	return clampf(DecorData.comfort_of(G.placed) / 60.0, 0.0, 1.0)


# ------------------------------------------------------------------ the day's plan
func plan_day(extra: Array = []) -> Array:
	var rng := Rng.new(G.rng_seed + G.day * 7919)
	var wd := G.weekday()
	var st := G.stars()
	var n := roundi(1.5 + st * 1.1 + (2.0 if wd == 5 else 0.0) + (1.0 if wd == 0 else 0.0) + (0.5 if G.weather == "rain" else 0.0))
	if G.day == 1:
		n = 2
	if G.flag("storm_day") or G.weather == "storm":
		n = maxi(2, n - 2)
	if G.pwyc_today():
		n += 1
	if _up("cargo_bike") and G.day > 1:
		n += 1                                   # pickup & delivery
	if G.flag("er_scrubs") and (wd == 1 or wd == 3):
		n += 1                                   # Priya's night crew
	n = clampi(n, 1, 11)
	var pool := RegularsData.REGULARS.filter(_regular_available)
	var picks := rng.shuffle(pool).slice(0, n)
	var out := []
	var start := OPEN_AT + 20.0
	var end := 15.0 * 60.0 + 30.0
	for i in picks.size():
		var r: Dictionary = picks[i]
		var at := roundf(start + (end - start) * ((i + rng.next()) / picks.size()))
		var service: String = "rush" if rng.chance(0.18) else rng.pick(r.get("services", ["wash_fold"]))
		var note := _pick_note(r, rng)
		out.append({"at": at, "who": r.id, "name": r.name, "icon": r.get("icon", ""), "service": service, "note": note,
			"bag": rng.pick(r.get("bags", ["item_drawstring_bag", "item_tote_bag", "item_hamper", "item_wicker_basket"])),
			"softener": rng.chance(r.get("softener", 0.2))})
	out.append_array(extra)
	out.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.at < b.at)
	plan = out
	next_walk_in = OPEN_AT + 15.0 + rng.next() * 30.0
	puddles = []
	litter = []
	self_queue = []
	G.vars.cyclesToday = 0
	return out


func _regular_available(r: Dictionary) -> bool:
	return (not r.has("from") or G.day >= r.from) and (not r.has("until") or G.day <= r.until) \
		and (not r.has("flag") or G.flag(r.flag)) and (not r.has("notFlag") or not G.flag(r.notFlag))


func _pick_note(r: Dictionary, rng: Rng) -> String:
	if not r.has("notes"):
		return ""
	# notes can be day-gated: {text, from, until}
	var ok := []
	for n in r.notes:
		if n is String or ((not n.has("from") or G.day >= n.from) and (not n.has("until") or G.day <= n.until)):
			ok.append(n)
	if ok.is_empty() or not rng.chance(0.75):
		return ""
	var n: Variant = rng.pick(ok)
	return n if n is String else n.text


## Walk-ins per game hour.
func _walk_in_rate() -> float:
	var t := G.time / 60.0
	var peak := 1.0 + 0.6 * exp(-pow(t - 12.5, 2) / 2.0) + 0.8 * exp(-pow(t - 17.0, 2) / 1.5)
	var w := 1.3 if G.weather == "rain" else 0.6 if G.weather == "storm" else 1.0
	var price := 0.75 if G.policies.prices == "high" else 1.2 if G.policies.prices == "low" else 1.0
	var comfort := 0.85 + comfort_score() * 0.4
	var extras := (1.15 if _up("coin_changer") else 1.0) * (1.2 if _up("awning") and G.weather != "clear" and G.weather != "cloudy" else 1.0)
	return 0.55 * (0.35 + G.stars() / 4.0) * peak * w * price * comfort * extras


# ------------------------------------------------------------------ tick (game minutes)
func tick(dm: float) -> void:
	# scheduled drop-offs
	while plan.size() > 0 and plan[0].at <= G.time:
		var p: Dictionary = plan.pop_front()
		if G.time < CLOSE_AT - 60:
			create_order(p)
	# machines
	for m in G.machines:
		if m.state != "running" or m.broken:
			continue
		m.t += dm
		if m.break_at >= 0 and m.t >= m.dur * m.break_at:
			m.broken = true
			m.break_at = -1.0
			_emit("broke", {"m": m})
			if m.load == "self":
				G.add_stat("reputation", -1.5)
			continue
		if m.t >= m.dur:
			m.state = "done"
			var o := order(m.load) if m.load != "self" else {}
			if not o.is_empty():
				if m.kind == "washer":
					o.washed = true
					o.stage = "washed"
				else:
					o.dried = true
					o.stage = "dried"
			_emit("cycleDone", {"m": m, "o": o})
			if m.load == "self":
				if m.kind == "washer":
					self_queue.append({"washer": m.id, "since": G.time})
				else:
					m.collect_at = G.time + 6.0 + randf() * 14.0
	# self-service: move washed walk-in loads to free dryers, collect dried ones
	for i in range(self_queue.size() - 1, -1, -1):
		var q: Dictionary = self_queue[i]
		var w := machine(q.washer)
		if w.is_empty() or w.load != "self":
			self_queue.remove_at(i)
			continue
		if G.time - q.since < 4:
			continue
		var d := {}
		for dd in dryers():
			if is_free(dd):
				d = dd
				break
		if not d.is_empty():
			unload(w)
			start_cycle(d, "self")
			var dry := SELF_DRY * (0.5 if G.pwyc_today() else 1.0)
			G.add_money(dry, "", "self")
			G.today.self_serve += dry
			_emit("selfMove", {"from": w, "to": d})
			self_queue.remove_at(i)
		elif G.time - q.since > 70:
			# gives up and takes it home damp
			unload(w)
			G.add_stat("reputation", -0.8)
			self_queue.remove_at(i)
			_emit("selfGaveUp", {"m": w})
	for d in dryers():
		if d.load == "self" and d.state == "done" and d.collect_at >= 0 and G.time >= d.collect_at:
			unload(d)
			d.collect_at = -1.0
			_emit("selfCollected", {"m": d})
	# walk-ins
	if G.time >= next_walk_in and G.time < CLOSE_AT - 45:
		var rate := _walk_in_rate()
		next_walk_in = G.time + (60.0 / maxf(0.05, rate)) * (0.5 + randf())
		var reserved := {}
		for o in G.orders:
			if o.stage != "done" and o.stage != "ready":
				reserved[o.machine] = true
		var all_free := washers().filter(is_free)
		var free := all_free.filter(func(m: Dictionary) -> bool: return not reserved.has(m.id))
		# leave at least one washer for the attendant's drop-off work
		if free.size() >= 2 or (free.size() == 1 and all_free.size() > 1):
			var m: Dictionary = free[randi() % free.size()]
			start_cycle(m, "self")
			var wash := SELF_WASH * float(model_of(m).get("selfPay", 1.0)) * (0.5 if G.pwyc_today() else 1.0)
			G.add_money(wash, "", "self")
			G.today.self_serve += wash
			if _up("vending") and randf() < 0.45:
				var snack := 1.5 if randf() < 0.5 else 2.5
				G.add_money(snack, "", "vending")
				G.today.vending = float(G.today.get("vending", 0.0)) + snack
			_emit("walkIn", {"m": m})
		else:
			G.add_stat("reputation", -0.25)
			_emit("walkInTurnedAway")
	# pickups for ready orders at/after due time; unfinished orders become late
	for o in G.orders:
		if o.stage == "done":
			continue
		if not o.late and G.time > o.due and o.stage != "ready":
			o.late = true
			_emit("orderLate", {"o": o})
		if o.stage == "ready" and G.time >= maxf(o.due, o.ready_at + 5.0) and not o.personal:
			pickup(o)
	# cleanliness drift, puddles, litter
	var traffic := 0.012 * dm * (1.0 + (0.8 if G.weather == "rain" else 0.0) + (1.5 if G.weather == "storm" else 0.0)) * (0.8 if G.flag("spotless_habit") else 1.0)
	G.add_stat("cleanliness", -traffic)
	var puddle_chance := (0.011 if G.weather == "rain" else 0.02 if G.weather == "storm" else 0.003) * dm * (0.6 if _up("awning") else 1.0)
	if randf() < puddle_chance and puddles.size() < 4:
		var near_door := randf() < 0.7
		var p := {"id": seq, "x": 1700.0 + randf() * 260.0 if near_door else 640.0 + randf() * 700.0, "y": 650.0 + randf() * 40.0, "size": 0.7 + randf() * 0.5}
		seq += 1
		puddles.append(p)
		G.add_stat("cleanliness", -3)
		_emit("puddle", {"p": p})
	if randf() < 0.0035 * dm and litter.size() < 3:
		var l := {"id": seq, "kind": "sock" if randf() < 0.55 else "lint", "x": 640.0 + randf() * 1000.0, "y": 640.0 + randf() * 56.0}
		seq += 1
		litter.append(l)
		_emit("litter", {"l": l})


func clear_puddle(id: int) -> void:
	puddles = puddles.filter(func(p: Dictionary) -> bool: return p.id != id)
	G.add_stat("cleanliness", 9)
	G.stats.mopped += 1


## Closing time: anything still open gets finished (you stay late). Returns {leftovers, late}.
func close_shop() -> Dictionary:
	var leftovers := G.orders.filter(func(o: Dictionary) -> bool: return o.stage != "done")
	var late := 0
	for o in leftovers:
		o.washed = true
		o.dried = true
		if o.fold < 0 and "fold" in stages_of(o):
			o.fold = 0.45
		o.ready_at = CLOSE_AT + 30.0
		if o.ready_at > o.due:
			o.late = true
		o.stage = "ready"
		var r := pickup(o)
		if not r.onTime:
			late += 1
	for m in G.machines:
		m.state = ""
		m.load = ""
		m.t = 0.0
		m.collect_at = -1.0
		m.break_at = -1.0
	G.shelf = []
	G.orders = G.orders.filter(func(o: Dictionary) -> bool: return o.stage != "done")
	plan = []
	self_queue = []
	puddles = []
	litter = []
	return {"leftovers": leftovers.size(), "late": late}


## The shift in progress, for a save made mid-shift.
func to_save() -> Dictionary:
	return {"plan": plan, "next_walk_in": next_walk_in, "puddles": puddles, "litter": litter, "self_queue": self_queue, "seq": seq}


func from_save(d: Dictionary) -> void:
	plan = d.get("plan", [])
	next_walk_in = float(d.get("next_walk_in", 0.0))
	puddles = d.get("puddles", [])
	litter = d.get("litter", [])
	self_queue = d.get("self_queue", [])
	seq = int(d.get("seq", 1))
