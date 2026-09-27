class_name NameEntry extends PanelContainer
## A notice with a text box: your name on a new game, the shop's name on its new sign.

signal done(value: String)

@onready var heading: Label = $VBox/Heading
@onready var prompt: Label = $VBox/Prompt
@onready var field: LineEdit = $VBox/Field
@onready var back_button: PillButton = $VBox/Actions/Back
@onready var ok_button: PillButton = $VBox/Actions/Ok

var _fallback := ""


func setup(title: String, text: String, value: String, max_len: int, back: String, ok: String) -> void:
	heading.text = title
	prompt.text = text
	field.text = value
	field.max_length = max_len
	back_button.text = back
	ok_button.text = ok
	_fallback = value
	back_button.pressed.connect(func() -> void: done.emit(""))
	ok_button.pressed.connect(_ok)
	field.text_submitted.connect(func(_t: String) -> void: _ok())
	await get_tree().create_timer(0.3).timeout
	if is_instance_valid(field):
		field.grab_focus()
		field.select_all()


func _ok() -> void:
	var v := RegEx.create_from_string("[<>{}*\\[\\]]").sub(field.text.strip_edges(), "", true)
	done.emit(v if v != "" else _fallback)
