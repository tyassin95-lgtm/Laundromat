class_name Epilogue extends Control
## One card of the epilogue: a picture, a name and what became of them. next() when read.

signal next

@onready var image: TextureRect = $Card/Image
@onready var title_label: Label = $Card/Title
@onready var text_label: RichTextLabel = $Card/Text
@onready var button: PillButton = $Card/Continue


func show_card(card: Dictionary) -> void:
	image.texture = Util.sprite(card.get("img", ""))
	image.visible = image.texture != null
	title_label.text = card.title
	text_label.text = "[center]%s[/center]" % UI.format_text(card.text)
	modulate.a = 0.0
	create_tween().tween_property(self, "modulate:a", 1.0, 1.0)
	await button.pressed
	Sound.play("page", 0.5)
	next.emit()
