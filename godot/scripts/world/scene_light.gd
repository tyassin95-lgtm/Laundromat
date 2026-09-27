@tool
class_name SceneLight extends Node2D
## A soft pool of light (a lamp, the daylight from a window). It isn't drawn itself: the
## Lighting pass paints every active SceneLight into the lightmap that shades the scene.
## Its strength follows the time of day, from day_intensity (noon) to night_intensity (night).

@export var radius := 300.0:
	set(v):
		radius = v
		queue_redraw()
@export var color := Color8(255, 214, 160):
	set(v):
		color = v
		queue_redraw()
@export var day_intensity := 0.24
@export var night_intensity := 0.8
## Vertical squash (a pool of light on the floor is flatter than it is wide).
@export_range(0.1, 1.0) var squash := 1.0:
	set(v):
		squash = v
		queue_redraw()
@export var enabled := true
## Only on while this decor piece is placed in the parent DecorSlot ("*" = anything).
@export var needs_decor := ""
## "normal" lights go out in a power cut; "power_cut" ones (lanterns) only shine then.
@export_enum("normal", "power_cut") var mode := 0


func _ready() -> void:
	add_to_group("scene_lights")


func intensity_at(night: float) -> float:
	return lerpf(day_intensity, night_intensity, night)


func is_active() -> bool:
	if not enabled or not is_visible_in_tree():
		return false
	if needs_decor != "":
		var slot := get_parent() as DecorSlot
		var placed := slot.placed_id() if slot else ""
		if placed == "" or (needs_decor != "*" and placed != needs_decor):
			return false
	var loc: Node = App.location if not Engine.is_editor_hint() else null
	var power_out: bool = loc != null and loc.get("power_out") == true
	return power_out == (mode == 1)


func _draw() -> void:
	if Engine.is_editor_hint():
		draw_set_transform(Vector2.ZERO, 0.0, Vector2(1, squash))
		draw_arc(Vector2.ZERO, radius, 0, TAU, 48, Color(color, 0.6), 2.0)
		draw_circle(Vector2.ZERO, 6, color)
