class_name ShopRow extends HBoxContainer
## A row in a catalog or a list: a picture, a name, a line about it and a button.

@onready var icon_rect: TextureRect = $Icon
@onready var name_label: Label = $Info/Name
@onready var desc_label: Label = $Info/Desc
@onready var button: PillButton = $Button


func setup(img: String, title: String, desc: String, btn_label: String, run: Callable, disabled: bool = false) -> void:
	icon_rect.texture = Util.sprite(img)
	name_label.text = title
	desc_label.text = desc
	desc_label.visible = desc != ""
	button.visible = btn_label != ""
	button.text = btn_label
	button.disabled = disabled
	if run.is_valid():
		button.pressed.connect(func() -> void: run.call())


func _draw() -> void:
	draw_dashed_line(Vector2(0, size.y - 0.8), Vector2(size.x, size.y - 0.8), Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.2), 1.6, 4.0)
