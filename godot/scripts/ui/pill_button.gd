@tool
class_name PillButton extends Button
## A button on the painted pill (the game's buttons). variant: "" | small | primary | small_primary.
## It clicks when pressed.

@export_enum("", "small", "primary", "small_primary") var variant := "":
	set(v):
		variant = v
		theme_type_variation = {"": &"", "small": &"SmallButton", "primary": &"PrimaryButton", "small_primary": &"SmallPrimaryButton"}.get(v, &"")
## An icon from assets/sprites (shown before the text).
@export var icon_name := "":
	set(v):
		icon_name = v
		icon = Util.sprite(v) if v != "" else null


func _ready() -> void:
	expand_icon = false
	if not Engine.is_editor_hint():
		pressed.connect(func() -> void: Sound.play("click", 0.7))
