extends TextureRect
## The far city's lit windows at night (bg/skyline_lights), added over the lit scene, but only
## where you can see the sky: the street's painting and its props are cut out of them. The cut is
## made in a half-resolution SubViewport (Mask) where the lights are drawn and then covered by
## black silhouettes of the foreground; this rect lays the result over the screen additively.

@export var backdrop: Node2D          # the SkyBackdrop (where the skyline is)
@export var background: Sprite2D      # the street's painting

@onready var viewport: SubViewport = $Mask
@onready var painter: Node2D = $Mask/Painter


func _process(_dt: float) -> void:
	var loc := App.location
	var n: float = loc.night() if loc else 0.0
	visible = n > 0.02
	if not visible:
		return
	modulate.a = n
	var vw := App.camera.vw()
	var size := Vector2i(ceili(vw * 0.5), 360)
	if viewport.size != size:
		viewport.size = size
	painter.queue_redraw()
