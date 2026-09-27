class_name GlowLayer extends Node2D
## Draws every GlowMarker of the current place as an additive halo. Lives in the place's overlay
## layer (after the lighting), which follows the camera, so positions are world px.

var _halo: GradientTexture2D


func _ready() -> void:
	var g := Gradient.new()
	g.offsets = PackedFloat32Array([0.0, 0.4, 1.0])
	g.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.35), Color(1, 1, 1, 0)])
	_halo = GradientTexture2D.new()
	_halo.gradient = g
	_halo.fill = GradientTexture2D.FILL_RADIAL
	_halo.fill_from = Vector2(0.5, 0.5)
	_halo.fill_to = Vector2(1.0, 0.5)
	_halo.width = 128
	_halo.height = 128
	var m := CanvasItemMaterial.new()
	m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = m


func _process(_dt: float) -> void:
	queue_redraw()


## A halo at a world point (also used directly by scenes for one-off glows).
func halo(p: Vector2, r: float, color: Color, a: float) -> void:
	if a <= 0.0:
		return
	draw_texture_rect(_halo, Rect2(p.x - r, p.y - r, r * 2.0, r * 2.0), false, Color(color, a))


func _draw() -> void:
	var loc := App.location
	if loc == null:
		return
	var n := loc.night()
	for node in get_tree().get_nodes_in_group("glows"):
		var g := node as GlowMarker
		if g and loc.is_ancestor_of(g) and g.is_active():
			halo(g.global_position, g.radius, g.color, g.alpha_at(n, loc.t))
