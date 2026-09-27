class_name DrumView extends Node2D
## The inside of a machine's drum, seen through the door glass. This node draws the dark drum
## and clips its Contents child to it (clip_children), so the laundry stays inside the circle.

var machine := {}
var radius := 20.0
var angle := 0.0
var t := 0.0

@onready var contents: Node2D = $Contents


func show_drum(m: Dictionary, r: float, ang: float, time: float) -> void:
	machine = m
	radius = r
	angle = ang
	t = time
	queue_redraw()
	contents.queue_redraw()


func _draw() -> void:
	draw_circle(Vector2.ZERO, radius, Color("#1d2429"))
