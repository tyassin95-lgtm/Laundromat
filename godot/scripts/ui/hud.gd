class_name Hud extends Control
## The heads-up display: the date and time, money, stars and energy; the goal ribbon; the round
## buttons (menu, journal, catalog, map, close up); and during the shift the order tickets.
## Modes: hidden | shift | free | home.

const TICKET := preload("res://scenes/ui/order_ticket.tscn")
const WEATHER_ICON := {"clear": "☀", "cloudy": "☁", "rain": "☂", "storm": "⛈"}

var mode := "hidden"
var _top_tween: Tween
var _goal_tween: Tween

@onready var top: Control = $Top
@onready var time_chip: PanelContainer = $Top/Left/TimeChip
@onready var time_label: RichTextLabel = $Top/Left/TimeChip/HBox/Time
@onready var money_chip: PanelContainer = $Top/Right/MoneyChip
@onready var money_label: Label = $Top/Right/MoneyChip/HBox/Money
@onready var rep_chip: PanelContainer = $Top/Right/RepChip
@onready var stars: HBoxContainer = $Top/Right/RepChip/HBox/Stars
@onready var energy: EnergyBar = $Top/Right/RepChip/HBox/Energy
@onready var goal_panel: PanelContainer = $Goal
@onready var goal_label: Label = $Goal/HBox/Text
@onready var buttons: VBoxContainer = $Buttons
@onready var btn_close: RoundButton = $Buttons/Close
@onready var btn_map: RoundButton = $Buttons/Map
@onready var btn_catalog: RoundButton = $Buttons/Catalog
@onready var btn_journal: RoundButton = $Buttons/Journal
@onready var btn_menu: RoundButton = $Buttons/Menu
@onready var tickets: HBoxContainer = $Tickets


func _ready() -> void:
	top.modulate.a = 0.0
	top.visible = false
	buttons.visible = false
	tickets.visible = false
	goal_panel.visible = false
	btn_menu.pressed.connect(func() -> void: UI.menus.open_pause())
	btn_journal.pressed.connect(func() -> void: UI.menus.open_journal())
	btn_catalog.pressed.connect(func() -> void: UI.menus.open_catalog())
	btn_map.pressed.connect(func() -> void: Day.open_map())
	btn_close.pressed.connect(func() -> void: Day.ask_close_early())
	time_chip.gui_input.connect(_chip_input.bind("calendar"))
	money_chip.gui_input.connect(_chip_input.bind("ledger"))
	rep_chip.gui_input.connect(_chip_input.bind("shop"))


func _chip_input(e: InputEvent, what: String) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		accept_event()
		if what == "calendar":
			UI.menus.open_calendar()
		else:
			UI.menus.open_journal(what)


func set_mode(m: String) -> void:
	mode = m
	var show := m != "hidden"
	_show_top(show)
	buttons.visible = show
	tickets.visible = m == "shift"
	btn_menu.visible = show
	btn_journal.visible = show
	btn_catalog.visible = m in ["shift", "free", "home"]
	btn_map.visible = m == "free" and G.flag("map_unlocked")
	btn_close.visible = m == "shift"
	refresh()
	refresh_tickets()


## Shows or hides the whole HUD (scripts turn it off for cutscenes).
func show_hud(on: bool) -> void:
	_show_top(on)
	buttons.visible = on
	tickets.visible = on and mode == "shift"


func _show_top(on: bool) -> void:
	if _top_tween:
		_top_tween.kill()
	_top_tween = create_tween().set_parallel()
	if on:
		top.visible = true
	_top_tween.tween_property(top, "modulate:a", 1.0 if on else 0.0, 0.3)
	_top_tween.tween_property(top, "position:y", 0.0 if on else -48.0, 0.3)
	if not on:
		_top_tween.chain().tween_callback(func() -> void: top.visible = false)


func refresh() -> void:
	var w: String = WEATHER_ICON.get(G.weather, "")
	time_label.text = "%s [font_size=%d][color=#6b5440]%s[/color][/font_size] [font_size=%d]%s[/font_size]" % [
		G.date_label(), roundi(16 * Settings.text_scale()), w, roundi(23.2 * Settings.text_scale()), Util.clock_str(G.time)]
	money_label.text = Util.money(G.money)
	var st := G.stars()
	for i in stars.get_child_count():
		var s := stars.get_child(i) as TextureRect
		var on := st >= i + 1 - 0.25
		s.self_modulate = Color.WHITE if on else Color(0.55, 0.55, 0.55, 0.45)
	energy.value = G.energy / 100.0
	btn_close.glow = mode == "shift" and G.time >= 17 * 60
	btn_map.glow = mode == "free" and G.flag("map_unlocked") and not G.flag("map_opened")
	btn_close.queue_redraw()
	btn_map.queue_redraw()


func set_goal(text: String) -> void:
	G.goal = text
	if _goal_tween:
		_goal_tween.kill()
	_goal_tween = create_tween().set_parallel()
	if text != "":
		goal_label.text = text
		goal_panel.visible = true
		_goal_tween.tween_property(goal_panel, "modulate:a", 1.0, 0.4)
		_goal_tween.tween_property(goal_panel, "position:x", 12.8, 0.4)
	else:
		_goal_tween.tween_property(goal_panel, "modulate:a", 0.0, 0.4)
		_goal_tween.tween_property(goal_panel, "position:x", 12.8 - 32.0, 0.4)
		_goal_tween.chain().tween_callback(func() -> void: goal_panel.visible = false)


func refresh_tickets() -> void:
	for c in tickets.get_children():
		c.queue_free()
	if mode != "shift":
		return
	var active := G.orders.filter(func(o: Dictionary) -> bool: return o.stage != "done")
	active.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.due < b.due)
	var loc := App.location
	var carry: Array = loc.carry if loc and "carry" in loc else []
	for o in active.slice(0, 6):
		var t: OrderTicket = TICKET.instantiate()
		tickets.add_child(t)
		t.setup(o, o.id in carry)
