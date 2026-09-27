class_name Street extends Location
## An exterior: Linden Street, the park, the community garden, the riverside walk. Each is its
## own scene (scenes/world/*.tscn) using this script: the painting, props (Prop), hotspots
## (Hotspot), where people stand (Spots/<who>) and where you arrive (Entries/<from>).

const NPC_SCENE := preload("res://scenes/actors/npc.tscn")

## A second painting used while alt_when holds (the street after Delgado's closes).
@export var alt_background: Texture2D
@export var alt_lights: Texture2D
@export var alt_when := ""

var npcs := {}                    # id -> Actor
var _sky_mask: Image
var _mask_w := 0

@onready var background: Sprite2D = $Background
@onready var bg_lights: Sprite2D = get_node_or_null("Overlay/BgLights")
@onready var rain: Rain = $RainLayer/Rain
@onready var pigeons: Node2D = get_node_or_null("Pigeons")


func _ready() -> void:
	super()
	for node in get_tree().get_nodes_in_group("hotspots"):
		if is_ancestor_of(node):
			node.tapped.connect(_on_hotspot_tapped.bind(node))
	for node in get_tree().get_nodes_in_group("props"):
		var prop := node as Prop
		if prop and is_ancestor_of(prop) and prop.tap_action != "":
			prop.get_node("Tap").tapped.connect(_on_prop_tapped.bind(prop))
	var sock := get_node_or_null("Entities/Sock")
	if sock:
		sock.get_node("Tap").tapped.connect(_on_sock_tapped)


func cond(expr: String) -> bool:
	return expr == "" or Story.eval(expr)


func enter(opts: Dictionary) -> void:
	if alt_background and cond(alt_when):
		background.texture = alt_background
		if bg_lights:
			bg_lights.texture = alt_lights
	_build_sky_mask()
	for node in get_tree().get_nodes_in_group("props"):
		if is_ancestor_of(node):
			node.refresh()
	for node in get_tree().get_nodes_in_group("hotspots"):
		var h := node as Hotspot
		if h and is_ancestor_of(h):
			h.visible = cond(h.when)
	var sock := get_node_or_null("Entities/Sock") as SockPickup
	if sock:
		sock.refresh()
	player.visible = true
	player.carrying = false
	player.stop()
	player.char_scale = char_scale
	var entries := $Entries
	var from: String = opts.get("from", "")
	var entry: Node2D = entries.get_node_or_null(from) if from != "" else null
	if entry == null:
		entry = entries.get_node("default")
	player.position = entry.position
	player.facing = 1
	_place_npcs()
	follow(player, 0, true)
	var wet := 0.6 if weather_now() == "rain" else 1.0 if weather_now() == "storm" else 0.0
	rain.intensity = wet
	var amb: Dictionary = LocationsData.LOCATIONS.get(place, {}).get("amb", {}).duplicate()
	if wet > 0:
		amb.amb_rain_out = 0.35 + wet * 0.4
	if place == "street" and time_now() < 20 * 60:
		amb.amb_cafe = 0.12
	Sound.set_ambience(amb, 1.5)
	UI.hud.set_mode("free")
	Day.scene_music()


## A coarse map of where the painting is see-through (open sky), for the stars.
func _build_sky_mask() -> void:
	var tex := background.texture
	if tex == null:
		return
	_mask_w = ceili(world_width / 8.0)
	_sky_mask = tex.get_image()
	if _sky_mask.is_compressed():
		_sky_mask.decompress()
	_sky_mask.resize(_mask_w, 90, Image.INTERPOLATE_BILINEAR)


func is_sky(wx: float, wy: float) -> bool:
	if _sky_mask == null:
		return wy < 200
	var x := int(floor(wx / 8.0))
	var y := int(floor(wy / 8.0))
	if x < 0 or y < 0 or x >= _mask_w or y >= 90:
		return false
	return _sky_mask.get_pixel(x, y).a8 < 20


func vignette_strength() -> float:
	return vignette + night() * 0.15


func _place_npcs() -> void:
	var wd := G.weekday()
	var here := []
	for id: String in ["walt", "maya", "june", "remy"] + CharactersData.NEIGHBOUR_IDS:
		# neighbours are out and about once you've met them (and once they have in-world art)
		if id in CharactersData.NEIGHBOUR_IDS and (not CharactersData.has_sprite(id) or not G.flag("met_" + id) or G.day < int(CharactersData.ROUTINES[id].get("from", 0))):
			continue
		if not Story.can_visit(id):
			continue
		# strangers only show up where their introduction happens
		if not G.flag("met_" + id) and not (id == "remy" and place == "street"):
			continue
		var forced: String = G.vars.get("at_" + id, "")
		var present := false
		if forced != "":
			present = forced == place
		else:
			var ev: Dictionary = CharactersData.ROUTINES[id].evening
			present = ev.has(place) and wd in ev[place]
			if G.phase == "morning" and wd != 6:
				present = false
			if G.time >= 22 * 60 + 30:
				present = false
		# a date: they're waiting at the spot that evening
		var R: Dictionary = QuestsData.ROMANCE.get(id, {})
		if G.vars.get("date_" + id) == G.day and R.get("place", "") == place and G.time >= 17 * 60 and G.phase != "shift":
			present = true
		if present:
			here.append(id)
	for id: String in here:
		var spot: Node2D = get_node_or_null("Spots/" + id)
		var p := spot.position if spot else Vector2(800, 640)
		var a: Actor = NPC_SCENE.instantiate()
		a.setup_npc(id)
		a.speed = 160
		a.char_scale = char_scale
		a.position = p
		a.facing = -1 if p.x > world_width / 2.0 else 1
		$Entities.add_child(a)
		npcs[id] = a
		if G.talked.get(id) != G.day:
			a.say("…", 99999)


# ------------------------------------------------------------------ taps
func on_tap(screen_pos: Vector2) -> void:
	var w := cam().to_world(screen_pos)
	for id: String in npcs:
		var a: Actor = npcs[id]
		var b := a.bounds()
		if w.x > b.position.x - 12 and w.x < b.end.x + 12 and w.y > b.position.y and w.y < b.end.y + 12:
			_tap_npc(id, a)
			return
	if pigeons:
		var bird: Dictionary = pigeons.bird_at(w)
		if not bird.is_empty():
			_go_do({"act": "pigeons", "x": bird.x, "y": bird.y})
			return
	var area := tap_area_at(w)
	if area:
		area.tapped.emit(w)
		return
	if w.y > walk_band.x - 40:
		player.walk_to(clampf(w.x, 40, world_width - 40), clampf(w.y, walk_band.x, walk_band.y))


func _walk_then(x: float, y: float, face: int = 0) -> bool:
	return await player.walk_to(clampf(x, 30, world_width - 30), clampf(y, walk_band.x, walk_band.y), face)


func _tap_npc(id: String, a: Actor) -> void:
	var tx := a.position.x + (-110.0 if a.position.x > player.position.x else 110.0) * char_scale * 1.2
	if not await _walk_then(tx, a.position.y + 2, 1 if a.position.x > tx else -1):
		return
	player.facing = 1 if a.position.x > player.position.x else -1
	a.facing = -player.facing
	UI.context_menu(cam().to_screen(a.position - Vector2(0, a.disp_h() + 12)), CharactersData.display_name(id), [
		{"label": "Talk", "icon": "icon_speech", "run": _talk_to.bind(id, a)},
		{"label": "Give gift", "icon": "icon_heart", "run": Story.gift_to.bind(id)},
	])


func _talk_to(id: String, a: Actor) -> void:
	a.emote = ""
	await Story.talk(id, place)
	Day.spend(10)


## Walks over to a hotspot (or anything with x, y, w, h) and does its activity.
func _go_do(h: Dictionary) -> void:
	var x: float = h.x + h.get("w", 0.0) / 2.0
	if not await _walk_then(x, maxf(walk_band.x, h.get("y", 600.0) + h.get("h", 0.0) + 10.0)):
		return
	var o := h.duplicate()
	o.loc = place
	Activities.run(h.act, o)


func _on_hotspot_tapped(_p: Vector2, hotspot: Hotspot) -> void:
	_go_do(hotspot.info())


func _on_prop_tapped(_p: Vector2, prop: Prop) -> void:
	match prop.tap_action:
		"sign":
			UI.toast("%s — est. 1972" % G.shop, "icon_washer")
		"mural":
			var played := await Story.trigger("look", {"what": "mural"})
			if not played:
				UI.toast("\"Harbor Dreams\" — Remy's mural of the city at sunrise.", "icon_star")
		"market":
			_go_do({"act": "market", "x": prop.position.x, "y": prop.position.y})


func _on_sock_tapped(_p: Vector2) -> void:
	var sock := $Entities/Sock as SockPickup
	if not await _walk_then(sock.position.x - 30, sock.position.y + 4):
		return
	player.set_pose("pet", 0.7)
	sock.visible = false
	UI.menus.found_sock(place, sock.sock_id)


func feed_pigeons() -> void:
	if pigeons:
		pigeons.feed()


# ------------------------------------------------------------------ every frame
func update(dt: float) -> void:
	super(dt)
	var paused := App.paused()
	update_actors(dt, paused)
	particles.update(dt)
	rain.update(dt)
	apply_fatigue(330, "")
	follow(player, dt)
	if G.day >= 16 and randf() < dt * 0.5 and weather_now() != "storm":
		particles.emit("leaf", cam().x + randf() * vw(), -10, 1)
	if pigeons:
		pigeons.update(dt, player)
	if bg_lights:
		bg_lights.modulate.a = night() * 0.5
		bg_lights.visible = night() > 0.02
