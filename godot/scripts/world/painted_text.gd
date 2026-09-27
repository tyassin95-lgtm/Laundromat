@tool
class_name PaintedText extends Node2D
## Words painted in the world: the shop's name on its fascia, on the hanging sign, on the window
## glass (seen from inside, so mirrored). "{shop}" becomes the shop's name.

@export var text := "{shop}"
@export var font: Font
@export var font_size := 46
@export var color := Color("#f3e3c3")
@export var outline_color := Color(0, 0, 0, 0)
@export var outline_size := 0
## Squeeze the words to fit this width (0 = never).
@export var max_width := 0.0
@export var mirrored := false
## Centre the words on the node (otherwise the node is on their baseline).
@export var middle := false
@export var subtitle := ""
@export var subtitle_font: Font
@export var subtitle_size := 13
@export var subtitle_color := Color(1, 1, 1, 0.8)
@export var subtitle_offset := 26.0

var _last := ""


func _process(_dt: float) -> void:
	var s := _text()
	if s != _last:
		_last = s
		queue_redraw()


func _text() -> String:
	var shop := "Rosa's" if Engine.is_editor_hint() else G.shop
	return text.replace("{shop}", shop)


func _line(f: Font, s: String, size: int, y: float, col: Color, outline: int, ocol: Color, fit: float) -> void:
	if f == null:
		return
	var w := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	var sx := 1.0
	if fit > 0.0 and w > fit:
		sx = fit / w
	var dy := (f.get_ascent(size) - f.get_descent(size)) / 2.0 if middle else 0.0
	draw_set_transform(Vector2(0, y), 0.0, Vector2(sx * (-1.0 if mirrored else 1.0), 1.0))
	var p := Vector2(-w / 2.0, dy)
	if outline > 0 and ocol.a > 0:
		draw_string_outline(f, p, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, outline, ocol)
	draw_string(f, p, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)
	draw_set_transform(Vector2.ZERO)


func _draw() -> void:
	_line(font, _text(), font_size, 0.0, color, outline_size, outline_color, max_width)
	if subtitle != "":
		_line(subtitle_font, subtitle, subtitle_size, subtitle_offset, subtitle_color, 0, Color(0, 0, 0, 0), 0.0)
