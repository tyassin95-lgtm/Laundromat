class_name GridItem extends PanelContainer
## A tile in a collection (a sock, a record): its picture and name, dark and "???" while locked.

@onready var icon_rect: TextureRect = $VBox/Icon
@onready var label: Label = $VBox/Name


func setup(img: String, title: String, locked: bool) -> void:
	icon_rect.texture = Util.sprite(img)
	label.text = "???" if locked else title
	if locked:
		icon_rect.self_modulate = Color(0, 0, 0, 0.25)
		label.add_theme_color_override("font_color", Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.5))
