class_name ContextMenu extends Control
## A row of buttons over something you tapped ("Talk", "Give gift"...), with its name above.
## Tapping anywhere else closes it.

const BUTTON := preload("res://scenes/ui/pill_button.tscn")

@onready var box: Control = $Box
@onready var title_label: Label = $Box/Title
@onready var buttons: HBoxContainer = $Box/Buttons


func setup(pos: Vector2, title: String, options: Array) -> void:
	title_label.text = title
	title_label.visible = title != ""
	for o: Dictionary in options:
		var b: PillButton = BUTTON.instantiate()
		b.variant = "small"
		b.text = o.label
		b.icon_name = o.get("icon", "")
		var run: Callable = o.run
		b.pressed.connect(func() -> void:
			queue_free()
			run.call())
		buttons.add_child(b)
	await get_tree().process_frame
	var vw := get_viewport_rect().size.x
	var p := Vector2(clampf(pos.x, 90, vw - 90), clampf(pos.y, 110, Util.VH - 20))
	box.position = p - Vector2(buttons.size.x / 2.0, buttons.size.y)
	var tw := create_tween()
	box.scale = Vector2(0.85, 0.85)
	box.pivot_offset = Vector2(buttons.size.x / 2.0, buttons.size.y)
	tw.tween_property(box, "scale", Vector2.ONE, 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func _input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed:
		if not buttons.get_global_rect().has_point(e.position):
			queue_free()
