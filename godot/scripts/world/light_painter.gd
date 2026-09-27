class_name LightPainter extends Node2D
## Paints the lightmap (see Lighting): the ambient colour, then each light added on top as a soft
## radial pool. Its material blends additively.

var ambient := Color.WHITE
var lights := []
var _pool: GradientTexture2D


func _ready() -> void:
	var g := Gradient.new()
	g.offsets = PackedFloat32Array([0.0, 0.45, 1.0])
	g.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.5), Color(1, 1, 1, 0)])
	_pool = GradientTexture2D.new()
	_pool.gradient = g
	_pool.fill = GradientTexture2D.FILL_RADIAL
	_pool.fill_from = Vector2(0.5, 0.5)
	_pool.fill_to = Vector2(1.0, 0.5)
	_pool.width = 128
	_pool.height = 128


func _draw() -> void:
	var size := Vector2(get_viewport().size)
	draw_rect(Rect2(Vector2.ZERO, size), Color(ambient, 1.0))
	for l: Dictionary in lights:
		var r: float = l.radius
		var rect := Rect2(l.pos.x - r, l.pos.y - r * l.squash, r * 2.0, r * 2.0 * l.squash)
		draw_texture_rect(_pool, rect, false, Color(l.color, minf(1.0, l.intensity)))
