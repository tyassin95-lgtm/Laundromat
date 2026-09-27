class_name CalendarCell extends PanelContainer
## A day on the calendar.

@onready var number: RichTextLabel = $VBox/Number
@onready var events: Label = $VBox/Events


func setup(label: String, evs: Array, today: bool, past: bool) -> void:
	number.text = ("[s]%s[/s]" % label) if past else label
	if past:
		number.modulate.a = 0.55
	events.text = "\n".join(evs)
	events.visible = not evs.is_empty()
	if today:
		theme_type_variation = &"CalendarToday"
