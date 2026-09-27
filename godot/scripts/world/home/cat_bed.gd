extends Sprite2D
## Biscuit, asleep in his bed, breathing. Now and then a z floats up.

var t := 0.0
var _scale_y := 1.0


func _ready() -> void:
	_scale_y = scale.y


func _process(dt: float) -> void:
	t += dt
	scale.y = _scale_y * (1.0 + sin(t * 1.6) * 0.012)
	var loc := App.location
	if loc and randf() < 0.004:
		loc.particles.emit("zzz", global_position.x + 14, global_position.y - 52, 1)
