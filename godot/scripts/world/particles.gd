class_name Particles extends Node2D
## Little effects in the world: sparkles, hearts, coins, bubbles, steam, smoke, dust, splashes,
## falling leaves, music notes, sleepy z's and tufts of lint. emit() adds some; they fade away.

const FONT_BOLD := preload("res://theme/fonts/fraunces_bold.tres")
const FONT_HAND := preload("res://assets/fonts/PatrickHand-Regular.woff2")

var ps: Array[Dictionary] = []
var _rng := Rng.shared
var _tex := {}


func _tex_of(sprite: String) -> Texture2D:
	if not _tex.has(sprite):
		_tex[sprite] = Util.sprite(sprite)
	return _tex[sprite]


## type: sparkle | heart | coin | bubble | steam | smoke | dust | splash | leaf | note | zzz | lint
## o: {color, override: {field: value}, spread, spread_y}
func emit(type: String, x: float, y: float, n: int = 1, o: Dictionary = {}) -> void:
	var r := _rng
	for i in n:
		var p := {"type": type, "x": x, "y": y, "vx": 0.0, "vy": 0.0, "life": 1.0, "age": 0.0, "size": 1.0, "rot": 0.0, "vr": 0.0, "g": 0.0, "grow": 0.0, "phase": 0.0, "color": o.get("color", null)}
		match type:
			"sparkle":
				p.vx = r.range_f(-60, 60); p.vy = r.range_f(-110, -30); p.life = r.range_f(0.5, 1.0); p.size = r.range_f(3, 7); p.g = 60.0
			"heart":
				p.vx = r.range_f(-25, 25); p.vy = r.range_f(-90, -60); p.life = 1.5; p.size = r.range_f(22, 30); p.vr = r.range_f(-0.6, 0.6)
			"coin":
				p.vx = r.range_f(-40, 40); p.vy = r.range_f(-260, -180); p.life = 0.9; p.size = r.range_f(22, 28); p.g = 520.0; p.vr = r.range_f(-6, 6)
			"bubble":
				p.vx = r.range_f(-15, 15); p.vy = r.range_f(-50, -25); p.life = r.range_f(1.5, 3); p.size = r.range_f(3, 9); p.phase = r.next() * 6
			"steam":
				p.vx = r.range_f(-8, 8); p.vy = r.range_f(-40, -25); p.life = r.range_f(1.2, 2.2); p.size = r.range_f(6, 12); p.grow = 14.0
			"smoke":
				p.vx = r.range_f(-12, 12); p.vy = r.range_f(-50, -30); p.life = r.range_f(1.2, 2); p.size = r.range_f(8, 14); p.grow = 16.0
			"dust":
				p.vx = r.range_f(-6, 6); p.vy = r.range_f(-4, 4); p.life = r.range_f(4, 8); p.size = r.range_f(1, 2.2); p.phase = r.next() * 6
			"splash":
				p.vx = r.range_f(-70, 70); p.vy = r.range_f(-140, -60); p.life = 0.45; p.size = r.range_f(1.5, 3); p.g = 700.0
			"leaf":
				p.vx = r.range_f(20, 60); p.vy = r.range_f(25, 50); p.life = r.range_f(5, 9); p.size = r.range_f(11, 17); p.vr = r.range_f(-2, 2); p.phase = r.next() * 6
				p.sprite = r.pick(["leaf_maple", "leaf_linden", "leaf_oak"])
			"note":
				p.vx = r.range_f(-20, 20); p.vy = r.range_f(-50, -35); p.life = 2.0; p.size = r.range_f(14, 20); p.phase = r.next() * 6; p.glyph = r.pick(["♪", "♫"])
			"zzz":
				p.vx = r.range_f(5, 15); p.vy = -22.0; p.life = 2.2; p.size = r.range_f(12, 18)
			"lint":
				p.vx = r.range_f(-30, 30); p.vy = r.range_f(-50, -10); p.life = 1.4; p.size = r.range_f(2, 4); p.g = 40.0
		p.merge(o.get("override", {}), true)
		p.x += o.get("spread", 0.0) * (r.next() - 0.5)
		p.y += o.get("spread_y", 0.0) * (r.next() - 0.5)
		p.max = p.life
		ps.append(p)


func update(dt: float) -> void:
	for i in range(ps.size() - 1, -1, -1):
		var p := ps[i]
		p.age += dt
		p.life -= dt
		if p.life <= 0:
			ps.remove_at(i)
			continue
		p.vy += p.g * dt
		if p.type == "bubble" or p.type == "dust" or p.type == "note":
			p.vx += sin(p.age * 3 + p.phase) * 20 * dt
		if p.type == "leaf":
			p.vx += sin(p.age * 2 + p.phase) * 30 * dt
		p.x += p.vx * dt
		p.y += p.vy * dt
		p.rot += p.vr * dt
		if p.grow:
			p.size += p.grow * dt
	queue_redraw()


func _draw() -> void:
	for p in ps:
		var t: float = p.life / p.max
		var pos := Vector2(p.x, p.y)
		match p.type:
			"sparkle":
				var col := Color(p.color if p.color != null else "#ffe7a0")
				col.a = minf(1.0, t * 2.0)
				var s: float = p.size * (0.6 + t * 0.6)
				var pts := PackedVector2Array()
				var rot: float = p.age * 3.0
				for k in 8:
					var rr := s * 0.35 if k % 2 == 1 else s
					var a := k * PI / 4.0 + rot
					pts.append(pos + Vector2(cos(a), sin(a)) * rr)
				draw_colored_polygon(pts, col)
			"heart", "coin":
				var tex := _tex_of("icon_heart" if p.type == "heart" else "icon_coin")
				if tex:
					var s: float = p.size
					var h := s * tex.get_height() / tex.get_width()
					draw_set_transform(pos, p.rot)
					draw_texture_rect(tex, Rect2(-s / 2, -s / 2, s, h), false, Color(1, 1, 1, minf(1.0, t * 2.5)))
					draw_set_transform(Vector2.ZERO)
			"zzz":
				draw_set_transform(pos, p.rot)
				var a := minf(1.0, t * 2.5)
				draw_string_outline(FONT_BOLD, Vector2.ZERO, "z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(p.size), 3, Color(Color("#3a2a1e"), a))
				draw_string(FONT_BOLD, Vector2.ZERO, "z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(p.size), Color(Color("#f3e3c3"), a))
				draw_set_transform(Vector2.ZERO)
			"bubble":
				var a := minf(1.0, t * 1.5) * 0.8
				draw_circle(pos, p.size, Color(200 / 255.0, 230 / 255.0, 1.0, 0.18 * a))
				draw_arc(pos, p.size, 0, TAU, 16, Color(230 / 255.0, 245 / 255.0, 1.0, 0.9 * a), 1.0, true)
				draw_circle(pos - Vector2(p.size, p.size) * 0.35, p.size * 0.25, Color(1, 1, 1, 0.8 * a))
			"steam":
				draw_circle(pos, p.size, Color(Color("#fbf6ee"), 0.22 * t))
			"smoke":
				draw_circle(pos, p.size, Color(Color("#3a3632"), 0.4 * t))
			"dust":
				draw_circle(pos, p.size, Color(Color("#fff3d0"), sin(minf(1.0, 1.0 - t) * PI) * 0.55))
			"splash":
				draw_circle(pos, p.size, Color(200 / 255.0, 225 / 255.0, 240 / 255.0, 0.9 * t))
			"lint":
				# tufts of fluff off the lint screen
				var tex := _tex_of("scn_lint")
				if tex:
					var h: float = p.size * 3.2
					var w := h * tex.get_width() / tex.get_height()
					draw_set_transform(pos, p.age * 2.0 + p.size)
					draw_texture_rect(tex, Rect2(-w / 2, -h / 2, w, h), false, Color(1, 1, 1, t))
					draw_set_transform(Vector2.ZERO)
			"leaf":
				# a painted leaf, tumbling: it turns and flips as it falls
				var tex := _tex_of(p.sprite)
				if tex:
					var h: float = p.size
					var w := h * tex.get_width() / tex.get_height()
					draw_set_transform(pos, p.rot, Vector2(1, absf(sin(p.age * 2 + p.phase)) * 0.7 + 0.3))
					draw_texture_rect(tex, Rect2(-w / 2, -h / 2, w, h), false, Color(1, 1, 1, minf(1.0, t * 2.0)))
					draw_set_transform(Vector2.ZERO)
			"note":
				var a := minf(1.0, t * 2.0)
				draw_string_outline(FONT_HAND, pos, p.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, int(p.size), 3, Color(Color("#f3e3c3"), a))
				draw_string(FONT_HAND, pos, p.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, int(p.size), Color(Color("#3f6c74"), a))
