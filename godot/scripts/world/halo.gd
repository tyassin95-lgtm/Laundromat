@tool
class_name Halo extends Node2D
## A soft additive glow drawn in place (give it an additive CanvasItemMaterial), for small lights
## that are part of the lit scene: an LED, the sun behind the clouds.

@export var radius := 6.0:
	set(v):
		radius = v
		queue_redraw()
@export var color := Color8(140, 255, 150):
	set(v):
		color = v
		queue_redraw()
@export var alpha := 0.5:
	set(v):
		alpha = v
		queue_redraw()

static var _tex: GradientTexture2D


static func texture() -> GradientTexture2D:
	if _tex == null:
		var g := Gradient.new()
		g.offsets = PackedFloat32Array([0.0, 0.4, 1.0])
		g.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.35), Color(1, 1, 1, 0)])
		_tex = GradientTexture2D.new()
		_tex.gradient = g
		_tex.fill = GradientTexture2D.FILL_RADIAL
		_tex.fill_from = Vector2(0.5, 0.5)
		_tex.fill_to = Vector2(1.0, 0.5)
		_tex.width = 128
		_tex.height = 128
	return _tex


func _draw() -> void:
	if alpha > 0.0:
		draw_texture_rect(texture(), Rect2(-radius, -radius, radius * 2.0, radius * 2.0), false, Color(color, alpha))
