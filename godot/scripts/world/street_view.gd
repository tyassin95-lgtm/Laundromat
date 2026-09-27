class_name StreetView extends Node2D
## Linden Street seen through the laundromat's front window: a painted layer (bg/view_shop, sky
## cut out) over a sky that follows the time of day, with traffic and people going by. It slides
## a little as the camera pans (follow), so it reads as further away.
## Draw order: sky and clouds (this node), Painting, Movers, Tint (darkens all that to the outdoor
## light), then Lights and Headlights, which glow at night.

const CARS := ["view_car_yellow", "view_wagon", "view_van", "view_taxi"]
const DRY_WALKERS := ["view_ped_bag", "view_ped_cane", "view_ped_dog", "view_ped_kid", "view_ped_bag"]
const WET_WALKERS := ["view_ped_umbrella", "view_ped_red_umbrella", "view_ped_kid", "view_ped_umbrella"]
const CLOUDS := [["cloud_s", 22.0], ["cloud_m", 24.0], ["cloud_l", 40.0]]
## Lanes (y of the wheels/feet in the view, scale, speed range, direction).
const LANES := {
	"far": {"y": 482.0, "k": 0.4, "speed": [26.0, 38.0]},             # far sidewalk: people across the street
	"road1": {"y": 521.0, "k": 0.5, "speed": [150.0, 230.0], "dir": -1},   # far lane, right to left
	"road2": {"y": 556.0, "k": 0.58, "speed": [160.0, 250.0], "dir": 1},   # near lane, left to right
	"near": {"y": 598.0, "k": 1.15, "speed": [52.0, 70.0]},           # our sidewalk, right past the window
}

@export var view_size := Vector2(640, 600)
## How much the view slides with the camera (0 = fixed on the wall, 1 = moves with the room).
@export var follow := 0.2

var movers: Array[Dictionary] = []
var clouds: Array[Dictionary] = []
var timers := {"car": 1.0, "far": 2.0, "near": 5.0, "bike": 14.0}
var t := 0.0
var _base_x := 0.0
var _r := Rng.shared

@onready var movers_node: Node2D = $Movers
@onready var tint: ColorRect = $Tint
@onready var lights: Sprite2D = $Lights
@onready var headlights: Node2D = $Headlights


func _ready() -> void:
	_base_x = position.x
	for i in 4:
		var c := _new_cloud()
		c.x = i * 180 + _r.next() * 80
		clouds.append(c)


func _new_cloud() -> Dictionary:
	var pick: Array = _r.pick(CLOUDS)
	return {"s": pick[0], "h": pick[1] * _r.range_f(0.85, 1.25), "x": _r.next() * view_size.x, "y": 20.0 + _r.next() * 40.0, "v": 3.0 + _r.next() * 5.0}


func _spawn(kind: String) -> void:
	var n := DayLight.nightness(G.time)
	var wet := G.weather == "rain" or G.weather == "storm"
	if kind == "car":
		var lane: String = "road1" if _r.next() < 0.5 else "road2"
		var L: Dictionary = LANES[lane]
		_add({"s": _r.pick(CARS), "lane": lane, "dir": L.dir, "v": _r.range_f(L.speed[0], L.speed[1]), "car": true})
	elif kind == "bike":
		_add({"s": "view_cyclist", "lane": "road2", "dir": 1, "v": _r.range_f(90, 120), "bob": 0.6})
	else:
		var L: Dictionary = LANES[kind]
		if n > 0.8 and _r.next() < 0.5:
			return
		_add({"s": _r.pick(WET_WALKERS if wet else DRY_WALKERS), "lane": kind, "dir": 1 if _r.next() < 0.5 else -1, "v": _r.range_f(L.speed[0], L.speed[1]), "bob": 1.0, "ph": _r.next() * 6})


func _add(m: Dictionary) -> void:
	var tex := Util.sprite(m.s)
	if tex == null:
		return
	var L: Dictionary = LANES[m.lane]
	m.k = L.k * (1.0 if m.get("car", false) else _r.range_f(0.94, 1.06))
	m.w = tex.get_width() * m.k
	m.hh = tex.get_height() * m.k
	m.x = -m.w if m.dir > 0 else view_size.x + m.w
	m.y = L.y
	m.tex = tex
	movers.append(m)


## Called by the room every frame with the camera's x.
func update_view(dt: float, cam_x: float) -> void:
	t += dt
	position.x = _base_x + cam_x * follow
	var n := DayLight.nightness(G.time)
	var busy := (1.0 - n * 0.6) * (0.5 if G.weather == "storm" else 1.0)
	for k: String in timers:
		timers[k] -= dt * busy
		if timers[k] > 0:
			continue
		_spawn(k)
		timers[k] = _r.range_f(3, 9) if k == "car" else _r.range_f(4, 10) if k == "far" else _r.range_f(9, 22) if k == "near" else _r.range_f(25, 60)
		if k == "bike" and G.weather != "clear" and G.weather != "cloudy":
			timers[k] *= 2
	for m in movers:
		m.x += m.dir * m.v * dt
		if m.has("bob"):
			m.ph = m.get("ph", 0.0) + dt * 7.5
	movers = movers.filter(func(m: Dictionary) -> bool: return m.x > -m.w * 1.2 and m.x < view_size.x + m.w * 1.2)
	for c in clouds:
		c.x += c.v * dt
		if c.x > view_size.x + 80:
			c.merge(_new_cloud(), true)
			c.x = -80.0
	tint.color = DayLight.ambient_for(G.time, G.weather, false)
	lights.modulate.a = n
	lights.visible = n > 0.02
	queue_redraw()
	movers_node.queue_redraw()
	headlights.queue_redraw()


func _draw() -> void:
	# the sky (top half: the painting covers the rest)
	var sky := DayLight.sky_colors(G.time, G.weather)
	var h := view_size.y * 0.5
	draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(view_size.x, 0), Vector2(view_size.x, h), Vector2(0, h)]), PackedColorArray([sky[0], sky[0], sky[1], sky[1]]))
	# clouds drift across; on wet days they're heavier and grey
	var wet := G.weather == "rain" or G.weather == "storm"
	for c in clouds:
		var tex := Util.sprite(c.s)
		if tex == null:
			continue
		var ch: float = c.h * (1.4 if wet else 1.0)
		var cw := ch * tex.get_width() / tex.get_height()
		var col := Color(0.78, 0.78, 0.78, 0.95) if wet else Color(1, 1, 1, 0.85)
		draw_texture_rect(tex, Rect2(c.x - cw / 2.0, c.y - ch / 2.0, cw, ch), false, col)
