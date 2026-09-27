class_name Modal extends Control
## A panel over a dimmed screen (notices, the journal, the catalog, the map...). Tapping the dim
## backdrop or the ✕ closes it (unless it can't be closed). UI.modal() opens one.

signal closed

var can_close := true
var _closed := false
var _backdrop_closes := true

@onready var backdrop: ColorRect = $Backdrop
@onready var holder: CenterContainer = $Center
@onready var close_button: Button = $Close


func setup(content: Control, opts: Dictionary) -> void:
	can_close = opts.get("close", true)
	_backdrop_closes = can_close and not opts.get("no_backdrop_close", false)
	close_button.visible = can_close
	if opts.get("clear", false):
		backdrop.color.a = 0.0
	holder.add_child(content)
	backdrop.gui_input.connect(_on_backdrop_input)
	close_button.pressed.connect(close)
	# fade the backdrop in and pop the panel up
	modulate.a = 0.0
	content.scale = Vector2(0.85, 0.85)
	var tw := create_tween().set_parallel()
	tw.tween_property(self, "modulate:a", 1.0, 0.2)
	tw.tween_property(content, "scale", Vector2.ONE, 0.32).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	content.resized.connect(func() -> void: content.pivot_offset = content.size / 2.0)


func _on_backdrop_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT and _backdrop_closes:
		close()


func close(silent: bool = false) -> void:
	if _closed:
		return
	_closed = true
	if not silent:
		Sound.play("close", 0.5)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 0.0, 0.15)
	tw.tween_callback(queue_free)
	closed.emit()
