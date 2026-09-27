extends Sprite2D
## The sign hanging in the door glass, turned to OPEN during business hours.

var t := 0.0
@onready var _open := Util.sprite("sign_open")
@onready var _closed := Util.sprite("sign_closed")


func _process(dt: float) -> void:
	t += dt
	var loc := App.location
	var open: bool = loc != null and loc.get("shift_running") == true
	var tex := _open if open else _closed
	if texture != tex:
		var h := texture.get_height() * scale.y
		texture = tex
		offset = Vector2(-tex.get_width() / 2.0, 0)
		scale = Vector2.ONE * (h / tex.get_height())
	rotation = sin(t * 1.7) * 0.015
