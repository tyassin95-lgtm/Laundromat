class_name Location extends Node2D
## Base for every place (the laundromat, the flat, the street locations, the title screen):
## the camera, taps, how the place is lit, and the player.
##
## Scenes put their things under a few standard children:
##   Entities (y-sorted: people and furniture on the floor), Particles, and SceneLight / Glow /
##   TapArea nodes anywhere below the root.

## Which place this is (a key of LocationsData.LOCATIONS, or "title").
@export var place := ""
## The family of scene script: laundromat | home | street | title.
@export var scene_kind := "street"
@export var world_width := 1920.0
## Rooms are lit by interior light; streets by daylight.
@export var interior := true
## The band of floor people walk in (min y, max y).
@export var walk_band := Vector2(540, 690)
## People are drawn at this size (exteriors are further away).
@export var char_scale := 1.0
## Darkening at the screen edges.
@export var vignette := 0.35

var t := 0.0
var free_cam := 0.0
var player: Actor
var particles: Particles


func _ready() -> void:
	player = get_node_or_null("Entities/Player")
	particles = get_node_or_null("Particles")


## Called by App after the scene is added. opts: where you come in (from), etc.
func enter(_opts: Dictionary) -> void:
	pass


func exit() -> void:
	pass


func update(dt: float) -> void:
	t += dt


func cam() -> GameCamera:
	return App.camera


func vw() -> float:
	return App.camera.vw()


func time_now() -> float:
	return G.time


func weather_now() -> String:
	return G.weather


func night() -> float:
	return DayLight.nightness(time_now())


# ------------------------------------------------------------------ people
func actors() -> Array:
	var out := []
	for a in get_tree().get_nodes_in_group("actors"):
		if is_ancestor_of(a):
			out.append(a)
	return out


func find_actor(id: String) -> Actor:
	for a: Actor in actors():
		if a.id == id:
			return a
	return null


func update_actors(dt: float, paused: bool) -> void:
	for a: Actor in actors():
		a.update(dt, paused)


## Tired players hop more slowly; the first time each day it happens, say how to recover.
func apply_fatigue(base_speed: float, hint: String) -> void:
	var tired := G.energy < 20
	if player:
		player.speed = base_speed * 0.75 if tired else base_speed
	if tired and hint != "" and G.vars.get("tiredWarned") != G.day:
		G.vars.tiredWarned = G.day
		UI.toast(hint, "icon_heart", "bad", 4200)


# ------------------------------------------------------------------ camera
## Rooms narrower than the screen zoom in to fill it, keeping the floor in view.
func fit_view() -> void:
	var c := cam()
	if world_width < vw():
		c.zoom_k = vw() / world_width
		c.y = 360.0 - 360.0 / c.zoom_k
	else:
		c.zoom_k = 1.0
		c.y = 0.0


func camera_clamp(x: float) -> float:
	if world_width <= vw():
		return (world_width - vw()) / 2.0
	return clampf(x, 0.0, world_width - vw())


func follow(actor: Actor, dt: float, snap: bool = false) -> void:
	if free_cam > 0.0:
		free_cam -= dt
		return
	var target := camera_clamp(actor.position.x - vw() / 2.0 + actor.facing * 60.0)
	cam().x = target if snap else Util.damp(cam().x, target, 3.2, dt)


## A drag pans the camera for a moment.
func pan(dx: float) -> void:
	cam().x = camera_clamp(cam().x - dx)
	free_cam = 2.5


# ------------------------------------------------------------------ taps
func on_tap(_screen_pos: Vector2) -> void:
	pass


## The tap area under a world point (the one with the highest priority), or null.
func tap_area_at(p: Vector2) -> TapArea:
	var best: TapArea = null
	for a in get_tree().get_nodes_in_group("tap_areas"):
		var area := a as TapArea
		if area == null or not is_ancestor_of(area) or not area.is_visible_in_tree() or not area.enabled:
			continue
		if area.contains(p) and (best == null or area.priority > best.priority):
			best = area
	return best


# ------------------------------------------------------------------ light
func vignette_strength() -> float:
	return vignette


## A second, heavier vignette (the title screen).
func title_vignette() -> float:
	return 0.0


## A white flash over everything (lightning on the title screen).
func flash_alpha() -> float:
	return 0.0


func ambient() -> Color:
	return DayLight.ambient_for(time_now(), weather_now(), interior)


## What the lighting pass needs this frame: {ambient: Color, lights: [{pos, radius, color, intensity, squash}]}.
func light_state() -> Dictionary:
	var lights := []
	var n := night()
	for node in get_tree().get_nodes_in_group("scene_lights"):
		var l := node as SceneLight
		if l and is_ancestor_of(l) and l.is_active():
			lights.append({"pos": l.global_position, "radius": l.radius, "color": l.color, "intensity": l.intensity_at(n), "squash": l.squash})
	return {"ambient": ambient(), "lights": lights}
