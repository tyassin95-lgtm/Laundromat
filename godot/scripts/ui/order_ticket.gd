class_name OrderTicket extends PanelContainer
## An order ticket along the bottom of the screen during the shift: who, what service, how far
## along (wash, dry, fold), and when it's due. Tap it to read the order.

var order := {}
var selected := false

@onready var face: FaceIcon = $VBox/Who/Face
@onready var who: Label = $VBox/Who/Name
@onready var kind: Label = $VBox/Kind
@onready var stage: StageBar = $VBox/Stage
@onready var due: Label = $VBox/Due
@onready var note_icon: TextureRect = $NoteIcon


func setup(o: Dictionary, is_selected: bool) -> void:
	order = o
	selected = is_selected
	face.sprite_name = o.icon if o.icon != "" else "icon_basket"
	who.text = o.name
	kind.text = RegularsData.SERVICES[o.service].label
	var stages := Laundry.stages_of(o)
	stage.setup(stages.size(), Laundry.stage_index(o), o.stage != "counter")
	var late_soon: bool = not o.late and G.time > o.due - 30 and o.stage != "ready"
	if o.stage == "ready":
		due.text = "Ready ✓"
	elif o.stage == "counter":
		due.text = "At the counter"
	else:
		due.text = "Late!" if o.late else "Due " + Util.clock_str(o.due)
	if o.late or late_soon:
		due.add_theme_color_override("font_color", Color("#b3402f"))
	note_icon.visible = o.note != ""
	gui_input.connect(_on_input)
	# slide in
	pivot_offset = Vector2(size.x / 2.0, size.y)
	modulate.a = 0.0
	var tw := create_tween().set_parallel()
	tw.tween_property(self, "modulate:a", 1.0, 0.35)
	queue_redraw()


func _on_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		accept_event()
		UI.menus.order_info(order)


func _draw() -> void:
	# the torn top edge, and a gold outline on the ticket you're holding
	draw_dashed_line(Vector2(4, 2.8), Vector2(size.x - 4, 2.8), Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.25), 5.6, 6.0)
	if selected:
		draw_rect(Rect2(Vector2(-3.2, -3.2), size + Vector2(6.4, 6.4)), Color("#e8b04e"), false, 3.2)
