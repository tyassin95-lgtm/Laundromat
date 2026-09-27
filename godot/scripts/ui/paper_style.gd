@tool
class_name PaperStyle extends StyleBox
## A nine-patch frame drawn from the game's painted UI art (the pill, the notice paper, the speech
## box), with its corners scaled down to size, the way the art is meant to be used (like CSS
## border-image-width). StyleBoxTexture always draws corners at the texture's own size.

@export var texture: Texture2D:
	set(v):
		texture = v
		emit_changed()
## The slices, in texture px: left, top, right, bottom.
@export var margins := Vector4(100, 99, 100, 99):
	set(v):
		margins = v
		emit_changed()
## How big the corners are drawn: horizontal and vertical scale of the slices.
@export var slice_scale := Vector2(0.35, 0.22):
	set(v):
		slice_scale = v
		emit_changed()
@export var modulate := Color.WHITE:
	set(v):
		modulate = v
		emit_changed()
## A soft coloured halo behind the frame (the primary buttons' golden glow).
@export var glow_color := Color(0, 0, 0, 0):
	set(v):
		glow_color = v
		emit_changed()
@export var glow_size := 8.0:
	set(v):
		glow_size = v
		emit_changed()


func _get_minimum_size() -> Vector2:
	return Vector2((margins.x + margins.z) * slice_scale.x, (margins.y + margins.w) * slice_scale.y)


func _draw(ci: RID, rect: Rect2) -> void:
	if texture == null:
		return
	var k := slice_scale
	var src := Rect2(Vector2.ZERO, texture.get_size())
	var tl := Vector2(margins.x, margins.y)
	var br := Vector2(margins.z, margins.w)
	if glow_color.a > 0.0:
		for i in 3:
			var g := glow_size * (3 - i) / 3.0
			var r := rect.grow(g)
			RenderingServer.canvas_item_add_set_transform(ci, Transform2D(0.0, k, 0.0, r.position))
			RenderingServer.canvas_item_add_nine_patch(ci, Rect2(Vector2.ZERO, r.size / k), src, texture.get_rid(), tl, br,
				RenderingServer.NINE_PATCH_STRETCH, RenderingServer.NINE_PATCH_STRETCH, true, Color(glow_color, glow_color.a / 3.0))
	RenderingServer.canvas_item_add_set_transform(ci, Transform2D(0.0, k, 0.0, rect.position))
	RenderingServer.canvas_item_add_nine_patch(ci, Rect2(Vector2.ZERO, rect.size / k), src, texture.get_rid(), tl, br,
		RenderingServer.NINE_PATCH_STRETCH, RenderingServer.NINE_PATCH_STRETCH, true, modulate)
	RenderingServer.canvas_item_add_set_transform(ci, Transform2D())
