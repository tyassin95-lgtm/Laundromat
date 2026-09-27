extends Node2D
## The sky behind an exterior, in screen space (on a canvas layer below the world): a gradient,
## and the far skyline (bg/skyline) sliding at a quarter of the camera's speed. The lighting pass
## darkens it with everything else.

## Where the skyline sits (y on screen) and how big it is.
@export var skyline_y := -110.0
@export var skyline_scale := 1.0

@onready var skyline: Sprite2D = $Skyline


func sky_rect() -> Rect2:
	var cam := App.camera
	return Rect2(-cam.x * 0.25 - 100.0, skyline_y, 2400.0 * skyline_scale, 900.0 * skyline_scale)


func _process(_dt: float) -> void:
	var r := sky_rect()
	skyline.position = r.position
	skyline.scale = r.size / skyline.texture.get_size()
	queue_redraw()


func _draw() -> void:
	var loc := App.location
	var wet: bool = loc != null and loc.weather_now() in ["rain", "storm"]
	var top := Color("#8e9eae") if wet else Color("#8fb4d4")
	var bot := Color("#c4c8c4") if wet else Color("#e8dcc4")
	var vw := get_viewport_rect().size.x
	draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(vw, 0), Vector2(vw, 500), Vector2(0, 500)]), PackedColorArray([top, top, bot, bot]))
	draw_rect(Rect2(0, 500, vw, 220), bot)
