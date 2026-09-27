class_name HomeBed extends Node2D
## The bed: made, or with her asleep under the quilt (the two pictures cross-fade).

## The top of the mattress, as a fraction of the bed's height from its top.
@export var mattress := 0.358

var asleep := false
var fade := 0.0

@onready var made: Sprite2D = $Made
@onready var sleeping: Sprite2D = $Asleep


func top_y() -> float:
	var h := made.texture.get_height() * made.scale.y
	return position.y - h * (1.0 - mattress)


## Switches the bed (cross-fading if fade_in).
func show_asleep(on: bool, fade_in: bool) -> void:
	asleep = on
	fade = 1.0 if fade_in else 0.0


func update_bed(dt: float, particles: Particles) -> void:
	fade = maxf(0.0, fade - dt * 2.5)
	var now := sleeping if asleep else made
	var before := made if asleep else sleeping
	before.visible = fade > 0.01
	before.modulate.a = 1.0
	now.visible = true
	now.modulate.a = 1.0 - fade
	move_child(now, -1)
	if asleep and fade < 0.5 and randf() < 0.01:
		particles.emit("zzz", position.x + 120, top_y() - 40, 1)
