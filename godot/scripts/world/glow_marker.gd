@tool
class_name GlowMarker extends Node2D
## A halo drawn over the lit scene (a bulb, a lamp head, a lantern). It isn't drawn itself: the
## GlowLayer in the scene's overlay draws every GlowMarker, after the lighting, so it glows.
## Its alpha goes from day_alpha to night_alpha with the dark (raised to night_curve), plus an
## optional twinkle at night.

@export var radius := 70.0:
	set(v):
		radius = v
		queue_redraw()
@export var color := Color8(255, 225, 160)
@export var day_alpha := 0.0
@export var night_alpha := 0.5
@export var night_curve := 1.0
@export var twinkle := 0.0
@export var twinkle_phase := 0.0
@export var enabled := true
## Only on while this decor piece is placed in the parent DecorSlot ("*" = anything).
@export var needs_decor := ""
## "normal" glows go out in a power cut; "power_cut" ones only shine then.
@export_enum("normal", "power_cut") var mode := 0


func _ready() -> void:
	add_to_group("glows")


func alpha_at(night: float, t: float) -> float:
	var n := pow(night, night_curve)
	return lerpf(day_alpha, night_alpha, n) + twinkle * night * sin(t * 2.0 + twinkle_phase)


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
		draw_arc(Vector2.ZERO, radius, 0, TAU, 32, Color(color, 0.8), 1.5)
