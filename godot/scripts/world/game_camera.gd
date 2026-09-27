class_name GameCamera extends Camera2D
## The one camera. The game thinks of it the way a painter does: x is the left edge of the view
## in world px (at zoom 1), zoom scales around the middle of the screen, and shake jiggles it.
## The screen is always 720 px tall; its width (vw) follows the device's shape.

var x := 0.0
var y := 0.0
var zoom_k := 1.0
var shake := 0.0


func vw() -> float:
	return get_viewport_rect().size.x


func reset() -> void:
	x = 0.0
	y = 0.0
	zoom_k = 1.0
	shake = 0.0
	apply()


func apply() -> void:
	var jiggle := Vector2.ZERO
	if shake > 0.0:
		jiggle = Vector2(randf() - 0.5, randf() - 0.5) * shake
	zoom = Vector2(zoom_k, zoom_k)
	position = Vector2(x + vw() / 2.0, y + Util.VH / 2.0) - jiggle / zoom_k


## Screen (virtual px) -> world.
func to_world(p: Vector2) -> Vector2:
	var half := Vector2(vw() / 2.0, Util.VH / 2.0)
	return (p - half * (1.0 - zoom_k)) / zoom_k + Vector2(x, y)


## World -> screen (virtual px).
func to_screen(p: Vector2) -> Vector2:
	var half := Vector2(vw() / 2.0, Util.VH / 2.0)
	return (p - Vector2(x, y)) * zoom_k + half * (1.0 - zoom_k)
