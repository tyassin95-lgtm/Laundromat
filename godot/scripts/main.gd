extends Node
## The main scene: the World (the place on screen goes in here), the one camera, the lighting pass
## and the vignette. The UI lives in the UI autoload. Taps and drags on the world arrive here.

const DRAG_START := 14.0       # px of movement before a press becomes a drag
const LONG_PRESS := 0.55       # s: a press held this long isn't a tap

var _press := {}


func _ready() -> void:
	App.start(self)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_press = {"start": event.position, "last": event.position, "dragging": false, "time": Time.get_ticks_msec()}
		elif not _press.is_empty():
			var held := (Time.get_ticks_msec() - int(_press.time)) / 1000.0
			if not _press.dragging and held < LONG_PRESS:
				App.on_tap(event.position)
			_press = {}
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and not _press.is_empty():
		var dx: float = event.position.x - _press.last.x
		_press.last = event.position
		if not _press.dragging and event.position.distance_to(_press.start) > DRAG_START:
			_press.dragging = true
		if _press.dragging:
			App.on_drag(dx)
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_cancel"):
		App.on_back()
		get_viewport().set_input_as_handled()
