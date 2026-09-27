class_name Home extends Location
## Rosa's flat above the shop: mornings, hobbies, Biscuit, and bed. The room (bg/home.webp) is
## 1600 x 720 world px; the furniture on the right (desk, chair, bed) is in home.tscn.

@onready var view: RoofView = $WindowView
@onready var glass: GlassRain = $GlassRain
@onready var bed: HomeBed = $Entities/Bed

var asleep := false


func _ready() -> void:
	super()
	for s: DecorSlot in get_tree().get_nodes_in_group("decor_slots"):
		if is_ancestor_of(s):
			s.slot_tapped.connect(_on_slot_tapped)


func _spot(name: String) -> Vector2:
	return get_node("Spots/" + name).position


func enter(opts: Dictionary) -> void:
	player.visible = true
	player.carrying = false
	player.stop()
	asleep = false
	if not G.placed.has("h_table"):
		G.placed.h_table = "record_player"
	if not G.placed.has("h_shelf"):
		G.placed.h_shelf = "pothos"
	refresh_decor()
	if opts.get("from", "") == "bed":
		# the morning starts in bed; she gets up a moment later
		player.position = _spot("Bed")
		player.facing = -1
		player.visible = false
		asleep = true
		bed.show_asleep(true, false)
		_wake_up()
	else:
		player.position = _spot("Door")
		player.facing = 1
	$Entities/Camera.visible = G.flag("has_camera")
	fit_view()
	follow(player, 0, true)
	update_sound()
	UI.hud.set_mode("home")
	Day.scene_music()
	# the after-work goal ("…or go upstairs to rest") no longer fits once you are upstairs
	if (G.phase == "evening" or G.phase == "night") and G.goal.contains("upstairs") and not G.goal.contains("back door"):
		UI.hud.set_goal("A quiet evening at home. Sketch, knit, read by the window, or sleep when you're ready.")


func refresh_decor() -> void:
	for s: DecorSlot in get_tree().get_nodes_in_group("decor_slots"):
		if is_ancestor_of(s):
			s.refresh()


func _wake_up() -> void:
	await App.wait(0.9)
	if not is_instance_valid(self) or App.location != self or not asleep:
		return
	asleep = false
	bed.show_asleep(false, true)
	player.set_pose("stretch", 1.6)
	player.position = _spot("Bed")
	await player.appear()


## Into bed: she vanishes and the bed shows her asleep under the quilt.
func tuck_in() -> void:
	player.vanish()
	await App.wait(0.7)
	player.stop()
	player.visible = false
	asleep = true
	bed.show_asleep(true, true)
	particles.emit("zzz", bed.position.x + 120, bed.top_y() - 40, 2)
	await App.wait(0.9)


func update_sound() -> void:
	var rain := 0.45 if G.weather == "rain" else 0.8 if G.weather == "storm" else 0.0
	var layers := {}
	if rain > 0:
		layers.amb_rain_in = rain
	if DayLight.nightness(G.time) < 0.5 and rain == 0:
		layers.amb_birds = 0.12
	layers.amb_city = 0.08
	if G.record != "":
		layers.amb_vinyl = 0.18
	Sound.set_ambience(layers, 1.2)


# ------------------------------------------------------------------ taps
func on_tap(screen_pos: Vector2) -> void:
	var w := cam().to_world(screen_pos)
	var area := tap_area_at(w)
	if area:
		area.tapped.emit(w)
		return
	if w.y > 560:
		player.walk_to(clampf(w.x, 40, world_width - 40), clampf(w.y, walk_band.x, walk_band.y))


## Walks to a spot (a Marker2D under Spots), turns, then does an activity.
func _go_do(spot: String, act: String, face: int = 1) -> void:
	var p := _spot(spot)
	var ok: bool = await player.walk_to(clampf(p.x, 40, world_width - 40), clampf(p.y, walk_band.x, walk_band.y), face)
	if not ok:
		return
	if face != 0:
		player.facing = face
	Activities.run(act, {"loc": "home"})


func _on_desk_tapped(_p: Vector2) -> void:
	_go_do("Desk", "sketch")


func _on_journal_tapped(_p: Vector2) -> void:
	_go_do("Journal", "rosa_journal")


func _on_cat_tapped(_p: Vector2) -> void:
	_go_do("Cat", "pet_cat")


func _on_yarn_tapped(_p: Vector2) -> void:
	_go_do("Knit", "knit")


func _on_kettle_tapped(_p: Vector2) -> void:
	_go_do("Kettle", "tea")


func _on_bed_tapped(_p: Vector2) -> void:
	_go_do("Bed", "sleep")


func _on_window_tapped(_p: Vector2) -> void:
	_go_do("Window", "window")


func _on_seat_tapped(_p: Vector2) -> void:
	_go_do("Seat", "read")


func _on_door_tapped(_p: Vector2) -> void:
	_go_do("Door", "door", -1)


func _on_camera_tapped(_p: Vector2) -> void:
	UI.toast("Rosa's old camera. Take it out in the evenings — photo spots are marked with a dot.", "item_camera")


func _on_slot_tapped(slot: String, _p: Vector2) -> void:
	var id: String = G.placed.get(slot, "")
	if id == "":
		return
	if id == "record_player":
		var p := _spot("Desk")
		if await player.walk_to(p.x, p.y, 1):
			player.facing = 1
			UI.menus.record_picker()
		return
	if id in ["pothos", "cat_planter", "hanging_plant", "potted_plant"]:
		var node: DecorSlot = null
		for s: DecorSlot in get_tree().get_nodes_in_group("decor_slots"):
			if is_ancestor_of(s) and s.slot_id == slot:
				node = s
		var x := clampf(node.floor_point().x - 60, 60, 1540)
		if await player.walk_to(x, 640, 1):
			player.facing = 1
			Activities.run("water", {"loc": "home"})
		return
	var d: Dictionary = DecorData.DECOR[id]
	UI.toast("%s — %s" % [d.name, d.blurb])


# ------------------------------------------------------------------ every frame
func update(dt: float) -> void:
	super(dt)
	var paused := App.paused()
	update_actors(dt, paused)
	particles.update(dt)
	glass.intensity = 0.8 if G.weather == "rain" else 1.0 if G.weather == "storm" else 0.0
	glass.update(dt)
	view.update_view(dt, cam().x)
	bed.update_bed(dt, particles)
	fit_view()
	apply_fatigue(300, "")
	follow(player, dt)
	if G.record != "" and G.placed.get("h_table") == "record_player" and randf() < dt * 0.5:
		var table: Vector2 = $Entities/Desk/SlotTable.global_position
		particles.emit("note", table.x, table.y - 70, 1)
