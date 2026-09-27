@tool
class_name FaceIcon extends TextureRect
## A portrait in a circle with a ring (friends in the journal, faces on tickets and the map).
## Icons (not faces) are shown whole, with some padding.

@export var sprite_name := "":
	set(v):
		sprite_name = v
		texture = Util.sprite(v) if v != "" else null
		_apply()
@export var ring_color := Color("#3f6c74"):
	set(v):
		ring_color = v
		_apply()
@export var is_icon := false:
	set(v):
		is_icon = v
		_apply()
@export var silhouette := false:
	set(v):
		silhouette = v
		_apply()
@export var fade := 1.0:
	set(v):
		fade = v
		_apply()


func _ready() -> void:
	material = (material as ShaderMaterial).duplicate() if material else null
	_apply()


func _apply() -> void:
	var m := material as ShaderMaterial
	if m == null:
		return
	m.set_shader_parameter("ring_color", ring_color)
	m.set_shader_parameter("cover", not is_icon)
	m.set_shader_parameter("padding", 0.13 if is_icon else 0.0)
	m.set_shader_parameter("silhouette", silhouette)
	m.set_shader_parameter("fade", fade)
