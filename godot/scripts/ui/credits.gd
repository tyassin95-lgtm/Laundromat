class_name Credits extends Control
## The credits roll. finished when it has rolled past, or on Skip.

signal finished

@onready var roll: VBoxContainer = $Roll
@onready var skip: PillButton = $Skip

var _done := false


func _ready() -> void:
	skip.pressed.connect(_end)
	await get_tree().process_frame
	roll.position.y = size.y
	var tw := create_tween()
	tw.tween_property(roll, "position:y", -roll.size.y, 60.0)
	tw.tween_callback(_end)


func _end() -> void:
	if _done:
		return
	_done = true
	queue_free()
	finished.emit()
