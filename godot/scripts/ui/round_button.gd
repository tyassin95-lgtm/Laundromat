@tool
class_name RoundButton extends Button
## The round paper buttons on the HUD (menu, journal, catalog, map, close), and the ✕ on panels.
## It draws its own disc; glow makes a golden ring pulse around it.

@export var icon_name := "":
	set(v):
		icon_name = v
		_tex = Util.sprite(v) if v != "" else null
		queue_redraw()
@export var glow := false
@export var mark := ""

var _tex: Texture2D
var _t := 0.0


func _ready() -> void:
	flat = true
	focus_mode = Control.FOCUS_NONE
	if not Engine.is_editor_hint():
		pressed.connect(func() -> void: Sound.play("click", 0.7))
	button_down.connect(func() -> void: scale = Vector2(0.9, 0.9))
	button_up.connect(func() -> void: scale = Vector2.ONE)
	resized.connect(func() -> void: pivot_offset = size / 2.0)


func _process(dt: float) -> void:
	if glow:
		_t += dt
		queue_redraw()


func _draw() -> void:
	var r := minf(size.x, size.y) / 2.0
	var c := size / 2.0
	if glow:
		var k := 0.5 - 0.5 * cos(_t / 1.6 * TAU)
		draw_circle(c, r + 8.0 * k, Color(232 / 255.0, 176 / 255.0, 78 / 255.0, 0.45 * k))
	draw_circle(c + Vector2(0, 3.2), r, Color(0, 0, 0, 0.3))
	# the disc: lighter towards the top left, like paper catching the light
	var hl := c + Vector2(-0.2, -0.3) * r
	var pts := PackedVector2Array([hl])
	var cols := PackedColorArray([Color("#f6e7c8")])
	for i in 41:
		var a := i * TAU / 40.0
		pts.append(c + Vector2(cos(a), sin(a)) * r)
		cols.append(Color("#c9ad7c"))
	draw_polygon(pts, cols)
	draw_arc(c, r * 0.72, 0, TAU, 40, Color(Color("#dcc394"), 0.35), r * 0.2, true)
	draw_arc(c, r - 1.44, 0, TAU, 48, Color("#2b4d55"), 2.88, true)
	if _tex:
		var s := r * 2.0 * 2.5 / 3.6
		var ts := _tex.get_size()
		var k := s / maxf(ts.x, ts.y)
		draw_texture_rect(_tex, Rect2(c - ts * k / 2.0, ts * k), false)
	if mark != "":
		var f := get_theme_font("font", "Label")
		var fs := roundi(r * 1.1)
		var w := f.get_string_size(mark, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string(f, c + Vector2(-w / 2.0, (f.get_ascent(fs) - f.get_descent(fs)) / 2.0), mark, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color("#3a2a1e"))
