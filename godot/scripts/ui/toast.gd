class_name Toast extends PanelContainer
## A short message that drops in at the top of the screen and fades away.

@onready var icon_rect: TextureRect = $HBox/Icon
@onready var label: Label = $HBox/Text


func setup(text: String, icon: String, cls: String, secs: float) -> void:
	label.text = text
	var tex := Util.sprite(icon)
	icon_rect.texture = tex
	icon_rect.visible = tex != null
	if cls == "heart":
		theme_type_variation = &"ToastHeart"
	elif cls == "bad":
		theme_type_variation = &"ToastBad"
	modulate.a = 0.0
	position.y -= 19
	var tw := create_tween().set_parallel()
	tw.tween_property(self, "modulate:a", 1.0, 0.3)
	await get_tree().create_timer(secs).timeout
	if not is_instance_valid(self):
		return
	var out := create_tween()
	out.tween_property(self, "modulate:a", 0.0, 0.4)
	out.tween_callback(queue_free)
