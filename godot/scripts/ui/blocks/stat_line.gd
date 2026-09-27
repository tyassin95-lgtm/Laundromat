class_name StatLine extends HBoxContainer
## "Cleanliness .... 55", optionally with a meter under it.

@onready var left: Label = $Left
@onready var right: Label = $Right


func setup(l: String, r: String, style: String = "") -> void:
	left.text = l
	right.text = r
	if style == "neg":
		right.add_theme_color_override("font_color", Color("#b3402f"))
