class_name TitleMenu extends Control
## The title screen's logo and menu (over the rainy street in scenes/world/title.tscn).

@onready var logo: Control = $Center/VBox/Logo
@onready var menu: VBoxContainer = $Center/VBox/Menu
@onready var continue_button: PillButton = $Center/VBox/Menu/Continue
@onready var new_button: PillButton = $Center/VBox/Menu/NewGame
@onready var settings_button: PillButton = $Center/VBox/Menu/Settings
@onready var credits_button: PillButton = $Center/VBox/Menu/Credits
@onready var corner_note: Label = $CornerNote

var _peek := {}
var _rewind := false


func _ready() -> void:
	visible = false
	continue_button.pressed.connect(_on_continue)
	new_button.pressed.connect(func() -> void: App.new_game(not _peek.is_empty()))
	settings_button.pressed.connect(func() -> void: UI.menus.open_pause())
	credits_button.pressed.connect(func() -> void: UI.menus.credits())


func open(peek: Dictionary, has_checkpoint: bool) -> void:
	_peek = peek
	_rewind = false
	var has_continue := false
	if not peek.is_empty() and peek.get("ending", "") == "sold":
		if has_checkpoint:
			continue_button.text = "Rewind to the last morning"
			_rewind = true
			has_continue = true
	elif not peek.is_empty():
		continue_button.text = "Continue · Free play" if peek.get("ending", "") != "" else "Continue · Day %d" % int(peek.get("day", 1))
		has_continue = true
	continue_button.visible = has_continue
	new_button.variant = "" if has_continue else "primary"
	visible = true
	# the logo rises in; the menu follows
	logo.modulate.a = 0.0
	menu.modulate.a = 0.0
	var tw := create_tween().set_parallel()
	tw.tween_property(logo, "modulate:a", 1.0, 1.6)
	tw.tween_property(menu, "modulate:a", 1.0, 1.0).set_delay(0.8)


func close() -> void:
	visible = false


func _on_continue() -> void:
	if _rewind:
		App.rewind()
	else:
		App.continue_game()
