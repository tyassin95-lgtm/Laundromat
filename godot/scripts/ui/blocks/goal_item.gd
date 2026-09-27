class_name GoalItem extends HBoxContainer
## A line in a to-do list with a little box that fills in (struck through) when it's done.

@onready var box: Control = $Box
@onready var label: RichTextLabel = $Text

var done := false
var strike := true


func setup(text: String, is_done: bool, strike_done: bool = true) -> void:
	done = is_done
	strike = strike_done
	var t := text
	if done and strike:
		t = "[s]%s[/s]" % t
	label.text = t
	if done:
		label.add_theme_color_override("default_color", Color("#6b5440"))
	box.queue_redraw()
