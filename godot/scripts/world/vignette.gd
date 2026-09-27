extends ColorRect
## Darkens the edges of the screen (a shader). Its strength comes from the place on screen.

## Added on top of the place's own vignette (the title screen uses a second, heavier pass).
@export var extra := false


func _process(_dt: float) -> void:
	var loc := App.location
	var s := 0.0
	if loc:
		s = loc.title_vignette() if extra else loc.vignette_strength()
	(material as ShaderMaterial).set_shader_parameter("strength", s)
	visible = s > 0.0
