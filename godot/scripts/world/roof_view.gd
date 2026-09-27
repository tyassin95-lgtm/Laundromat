class_name RoofView extends Node2D
## The rooftops seen through the flat's window: a painted layer (bg/view_home, sky cut out) over
## a sky that follows the time of day, with clouds, pigeons wheeling over the roofs, smoke from a
## chimney, and stars and the moon at night. It's drawn scaled down (the window is small) and
## slides a little as the camera pans.
## Draw order: sky, stars (this node), Moon, Sun (additive), Clouds, Birds, Painting, Smoke, Tint
## (darkens all that to the outdoor light), then Lights, which glow at night.

const CLOUDS := [["cloud_s", 22.0], ["cloud_m", 24.0], ["cloud_l", 40.0]]

@export var view_size := Vector2(560, 480)
@export var follow := 0.2
## Where the chimney's smoke comes from (in the painting's px).
@export var chimney := Vector2(307, 292)

var clouds: Array[Dictionary] = []
var birds: Array[Dictionary] = []
var smoke: Array[Dictionary] = []
var stars: Array[Dictionary] = []
var bird_t := 4.0
var t := 0.0
var _base_x := 0.0
var _r := Rng.shared

@onready var moon: Sprite2D = $Moon
@onready var sun: Halo = $Sun
@onready var tint: ColorRect = $Tint
@onready var lights: Sprite2D = $Lights


func _ready() -> void:
	_base_x = position.x
	for i in 5:
		var c := _new_cloud()
		c.x = i * 110 + _r.next() * 60
		clouds.append(c)
	for i in 26:
		stars.append({"x": _r.next() * view_size.x, "y": _r.next() * view_size.y * 0.45, "p": _r.next() * 6})


func _new_cloud() -> Dictionary:
	var pick: Array = _r.pick(CLOUDS)
	return {"s": pick[0], "h": pick[1] * _r.range_f(0.85, 1.25), "x": _r.next() * view_size.x, "y": 18.0 + _r.next() * 80.0, "v": 3.0 + _r.next() * 5.0}


func update_view(dt: float, cam_x: float) -> void:
	t += dt
	position.x = _base_x + cam_x * follow
	for c in clouds:
		c.x += c.v * dt
		if c.x > view_size.x + 80:
			c.merge(_new_cloud(), true)
			c.x = -80.0
	var n := DayLight.nightness(G.time)
	bird_t -= dt
	if bird_t <= 0 and n < 0.6 and G.weather != "storm":
		bird_t = _r.range_f(7, 16)
		var dir := 1 if _r.next() < 0.5 else -1
		var y := 40.0 + _r.next() * 90.0
		var flock := 2 + int(floor(_r.next() * 4))
		for i in flock:
			birds.append({"x": -20.0 - i * 14 if dir > 0 else view_size.x + 20 + i * 14, "y": y + (i % 2) * 8 + _r.next() * 6, "v": dir * _r.range_f(38, 52), "ph": _r.next() * 6})
	for b in birds:
		b.x += b.v * dt
		b.ph += dt * 9
	birds = birds.filter(func(b: Dictionary) -> bool: return b.x > -60 and b.x < view_size.x + 60)
	# smoke from the brick chimney between the two nearest roofs
	if _r.next() < dt * 1.4:
		smoke.append({"x": chimney.x + _r.next() * 4, "y": chimney.y, "a": 0.0, "s": 3.0 + _r.next() * 2})
	for p in smoke:
		p.a += dt
		p.y -= 9 * dt
		p.x += (4 + sin(p.a * 2) * 3) * dt
		p.s += 3 * dt
	smoke = smoke.filter(func(p: Dictionary) -> bool: return p.a < 5)
	var wet := G.weather == "rain" or G.weather == "storm"
	moon.visible = n > 0.3 and not wet
	moon.modulate.a = n
	var h := G.time / 60.0
	sun.visible = not wet and n < 0.5 and not moon.visible
	sun.position = Vector2(view_size.x * (0.1 + 0.8 * clampf((h - 7.0) / 12.0, 0.0, 1.0)), 50.0 + absf(h - 13.0) * 6.0)
	sun.alpha = 0.35 * (1.0 - n)
	tint.color = DayLight.ambient_for(G.time, G.weather, false)
	lights.modulate.a = n
	lights.visible = n > 0.02
	queue_redraw()
	for c in get_children():
		if c is Node2D and c.get_script() != null:
			c.queue_redraw()


func _draw() -> void:
	var sky := DayLight.sky_colors(G.time, G.weather)
	draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(view_size.x, 0), view_size, Vector2(0, view_size.y)]), PackedColorArray([sky[0], sky[0], sky[1], sky[1]]))
	var n := DayLight.nightness(G.time)
	var wet := G.weather == "rain" or G.weather == "storm"
	if n > 0.3 and not wet:
		for s in stars:
			draw_rect(Rect2(s.x, s.y, 2, 2), Color(1.0, 248 / 255.0, 230 / 255.0, (0.35 + 0.5 * absf(sin(t * 0.8 + s.p))) * n))
