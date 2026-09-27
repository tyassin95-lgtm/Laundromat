extends Node2D
## The steel drum turning, the laundry tumbling (or pressed to the wall while it spins), water
## sloshing with suds on top while a washer fills and washes, a dryer's warm glow. Drawn inside
## the parent DrumView's circle.

const LAUNDRY_COLORS := ["#7fa0b0", "#c9b88f", "#b86a4a", "#6f8f6a", "#d9cfbf", "#5f6f8f", "#c48fa0", "#e0c070", "#8a6a9a"]
const BUNDLES := {"red": "drum_red", "white": "drum_white", "blue": "drum_blue", "yellow": "drum_yellow"}

var _interior := Util.sprite("drum_interior")


## The bundles of washing seen in a drum: mostly the load's own colour, and a towel.
static func bundles_for(hex: String) -> Array:
	var c := Color(hex)
	var r := c.r8
	var g := c.g8
	var b := c.b8
	var main := "white"
	if maxi(r, maxi(g, b)) - mini(r, mini(g, b)) >= 26:
		main = "blue" if b >= r and b >= g - 10 else "red" if r > g + 30 else "yellow"
	var other := "yellow" if main == "blue" else "blue"
	return [BUNDLES[main], BUNDLES.white, BUNDLES[main], BUNDLES[other], BUNDLES[main]]


func _sprite(name: String, p: Vector2, w: float, ay: float, rot: float, alpha: float = 1.0) -> void:
	var tex := Util.sprite(name)
	if tex == null:
		return
	var h := w * tex.get_height() / tex.get_width()
	draw_set_transform(p, rot)
	draw_texture_rect(tex, Rect2(-w / 2.0, -h * ay, w, h), false, Color(1, 1, 1, alpha))
	draw_set_transform(Vector2.ZERO)


func _draw() -> void:
	var dv := get_parent() as DrumView
	var m := dv.machine
	if m.is_empty():
		return
	var R := dv.radius
	var t := dv.t
	var ang := dv.angle
	var running := MachineUnit.running(m)
	var ph := MachineUnit.phase(m) if running else {"name": "still", "water": 0.0, "speed": 0.0, "heat": 0.0}
	var dryer: bool = m.kind == "dryer"
	# the steel drum, turning; a little darker, it's inside the machine
	if _interior:
		_sprite("drum_interior", Vector2.ZERO, R * 2.3, 0.5, ang, 0.9)
	# laundry: crumpled bundles, in the colours of the load
	if m.load != "":
		var o := Laundry.order(m.load) if m.load != "self" else {}
		var col: String = o.get("color", "")
		if col == "":
			if m.get("self_color", "") == "":
				m.self_color = Rng.shared.pick(LAUNDRY_COLORS)
			col = m.self_color
		var load := bundles_for(col)
		var size := R * (0.86 if dryer else 0.78)
		if ph.name == "spin":
			# pressed to the wall by the spin, a blur going round
			for i in load.size():
				var a := ang + i * TAU / load.size()
				for lag_alpha in [[0.28, 0.25], [0.14, 0.45], [0.0, 1.0]]:
					var lag: float = lag_alpha[0]
					_sprite(load[i], Vector2(cos(a - lag), sin(a - lag)) * R * 0.58, size * 0.8, 0.5, a - lag + PI / 2.0, lag_alpha[1])
		elif running:
			# tumbling: carried up the wall by the lifters, then dropping back down
			for i in load.size():
				var a := ang + i * 1.4
				var lift := (sin(a) + 1.0) / 2.0
				var fall := maxf(0.0, sin(a * 2.0 + i)) * 0.18
				var p := Vector2(cos(a) * R * 0.42, R * 0.4 - lift * R * (0.9 if dryer else 0.66) + fall * R)
				_sprite(load[i], p, size, 0.5, a * 0.7)
		else:
			# resting in a heap at the bottom
			for i in 3:
				_sprite(load[i], Vector2((i - 1) * R * 0.46, R * 0.98), size, 1.0, (i - 1) * 0.25)
	# water and suds
	if ph.water > 0:
		var level: float = R - ph.water * R * 2.0
		var pts := PackedVector2Array([Vector2(-R, R)])
		var x := -R
		while x <= R + 0.001:
			pts.append(Vector2(x, level + sin(t * 5.0 + x * 0.12 + ang) * R * 0.06 * (1.6 if ph.name == "wash" else 1.0)))
			x += R / 8.0
		pts.append(Vector2(R, R))
		draw_colored_polygon(pts, Color(120 / 255.0, 172 / 255.0, 205 / 255.0, 0.5))
		for k in 7:
			var sx := -R * 0.8 + k * R * 0.27 + sin(t * 3.0 + k) * 2.0
			draw_circle(Vector2(sx, level + sin(t * 5.0 + k) * 2.0), R * (0.07 + (k % 3) * 0.03), Color(245 / 255.0, 250 / 255.0, 252 / 255.0, 0.85))
	# a dryer's warm glow
	if dryer and running and ph.heat > 0:
		draw_rect(Rect2(-R, -R, R * 2.0, R * 2.0), Color(1.0, 150 / 255.0, 70 / 255.0, (0.16 + 0.06 * sin(t * 3.0 + m.slot)) * ph.heat))
