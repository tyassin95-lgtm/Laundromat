class_name MapPin extends Control
## A place on the map: a round badge with its icon, faces of friends there, its name below.
## The node sits on the pin's point (bottom middle).

signal chosen(place: String)

const FACE := preload("res://scenes/ui/face_icon.tscn")

var place := ""

@onready var bubble: Button = $Bubble
@onready var icon_rect: TextureRect = $Bubble/Icon
@onready var faces: HBoxContainer = $Bubble/Faces
@onready var event_badge: Label = $Bubble/Event
@onready var label_panel: PanelContainer = $Label
@onready var label: Label = $Label/Text


func setup(key: String, L: Dictionary, here: bool, who: Array, has_event: bool) -> void:
	place = key
	icon_rect.texture = Util.sprite(L.icon)
	label.text = L.name
	event_badge.visible = has_event
	bubble.set_meta("here", here)
	bubble.queue_redraw()
	for w: String in who:
		var f: FaceIcon = FACE.instantiate()
		var c: Dictionary = CharactersData.CHARACTERS[w]
		f.sprite_name = "face_%s_%s" % [c.portrait, c.defaultExpr]
		f.ring_color = Color("#fff4dd")
		f.custom_minimum_size = Vector2(35.2, 35.2)
		faces.add_child(f)
	bubble.pressed.connect(func() -> void:
		Sound.play("select", 0.6)
		chosen.emit(place))
