class_name SummaryRow extends HBoxContainer
## A line in a summary or a list: a label on the left, a value on the right, a dashed rule under
## it. A "total" row is bigger and has no rule.

const POS := Color("#5d8a4a")
const NEG := Color("#b3402f")

var total := false

@onready var left: Label = $Left
@onready var right: Label = $Right


func setup(l: String, r: String, style: String = "", is_total: bool = false) -> void:
	left.text = l
	right.text = r
	total = is_total
	if is_total:
		left.theme_type_variation = &"SummaryTotal"
		right.theme_type_variation = &"SummaryTotal"
	if style == "pos":
		right.add_theme_color_override("font_color", POS)
	elif style == "neg":
		right.add_theme_color_override("font_color", NEG)
	queue_redraw()


func _draw() -> void:
	if not total:
		draw_dashed_line(Vector2(0, size.y - 0.8), Vector2(size.x, size.y - 0.8), Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.25), 1.6, 4.0)
