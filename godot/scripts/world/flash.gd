extends ColorRect
## A white flash over the whole screen (lightning on the title screen).


func _process(_dt: float) -> void:
	var a: float = App.location.flash_alpha() if App.location else 0.0
	modulate.a = a
	visible = a > 0.0
