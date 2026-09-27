extends CanvasLayer
## The whole user interface, autoloaded as UI (scenes/ui/ui_root.tscn): the HUD, conversations,
## notices and menus, toasts, fades and day cards. The look comes from theme/game_theme.tres.
##
## Layers, back to front (children of Root): Hud, TitleMenu, ContextHost, Fader, Dialogue,
## MinigameHost, ModalHost, Toasts, CardHost (day cards, epilogue, credits), PopHost.

const MODAL := preload("res://scenes/ui/modal.tscn")
const NOTICE := preload("res://scenes/ui/notice.tscn")
const TOAST := preload("res://scenes/ui/toast.tscn")
const DAY_CARD := preload("res://scenes/ui/day_card.tscn")
const MONEY_POP := preload("res://scenes/ui/money_pop.tscn")
const CONTEXT_MENU := preload("res://scenes/ui/context_menu.tscn")
const NAME_ENTRY := preload("res://scenes/ui/name_entry.tscn")
const FOLD_GAME := preload("res://scenes/ui/fold_game.tscn")
const REPAIR_GAME := preload("res://scenes/ui/repair_game.tscn")

@onready var hud: Hud = $Root/Hud
@onready var title_menu: TitleMenu = $Root/TitleMenu
@onready var dialogue: DialogueBox = $Root/Dialogue
@onready var menus: Menus = $Menus
@onready var fader: ColorRect = $Root/Fader
@onready var toasts: VBoxContainer = $Root/Toasts
@onready var context_host: Control = $Root/ContextHost
@onready var minigame_host: Control = $Root/MinigameHost
@onready var modal_host: Control = $Root/ModalHost
@onready var card_host: Control = $Root/CardHost
@onready var pop_host: Control = $Root/PopHost

var _stack: Array[Modal] = []     # open modals, topmost last
var _overlays := 0                # minigames, day cards, the epilogue, the credits
var _fade_tween: Tween
var _base_sizes := {}


func _ready() -> void:
	var theme := ThemeDB.get_project_theme()
	if theme:
		for type in theme.get_font_size_type_list():
			for size_name in theme.get_font_size_list(type):
				_base_sizes[[type, size_name]] = theme.get_font_size(size_name, type)
		_base_sizes["default"] = theme.default_font_size
	Settings.changed.connect(_on_setting_changed)
	apply_text_scale()


func _on_setting_changed(key: String) -> void:
	if key == "textSize":
		apply_text_scale()


## Text size setting: scales every font size in the theme.
func apply_text_scale() -> void:
	var theme := ThemeDB.get_project_theme()
	if theme == null:
		return
	var ts := Settings.text_scale()
	for key in _base_sizes:
		if key is String:
			theme.default_font_size = roundi(_base_sizes[key] * ts)
		else:
			theme.set_font_size(key[1], key[0], roundi(_base_sizes[key] * ts))


# ------------------------------------------------------------------ text
## Script text for display: {name}, {shop}... filled in, *emphasis* in rust. Returns BBCode.
func format_text(s: String) -> String:
	var t := Util.escape_bb(s)
	t = t.replace("{name}", Util.escape_bb(G.player_name)).replace("{shop}", Util.escape_bb(G.shop))
	t = t.replace("{day}", str(G.day)).replace("{money}", "$%d" % roundi(G.money))
	t = t.replace("{petition}", str(G.petition)).replace("{community}", str(roundi(G.community)))
	for m in RegEx.create_from_string("\\{var\\.(\\w+)\\}").search_all(t):
		var v: Variant = G.vars.get(m.get_string(1), "")
		t = t.replace(m.get_string(), Util.escape_bb(str(v) if v != null else ""))
	return RegEx.create_from_string("\\*([^*]+)\\*").sub(t, "[color=#c4692e]$1[/color]", true)


# ------------------------------------------------------------------ modals
func modal(content: Control, opts: Dictionary = {}) -> Modal:
	var m: Modal = MODAL.instantiate()
	modal_host.add_child(m)
	m.setup(content, opts)
	_stack.append(m)
	m.closed.connect(func() -> void: _stack.erase(m))
	Sound.play(opts.get("sound", "open"), 0.5)
	return m


func close_all() -> void:
	while not _stack.is_empty():
		_stack[-1].close(true)


func has_modal() -> bool:
	return not _stack.is_empty()


## Android back: closes the top modal. True if something was closed (or can't be).
func back() -> bool:
	if _stack.is_empty():
		return false
	var top: Modal = _stack[-1]
	if top.can_close:
		top.close()
	return true


## Minigames, day cards, the epilogue and the credits hold the game too.
func has_overlay() -> bool:
	return _overlays > 0


func push_overlay() -> void:
	_overlays += 1


func pop_overlay() -> void:
	_overlays = maxi(0, _overlays - 1)


# ------------------------------------------------------------------ notices
## A notice panel (see Notice for the blocks). opts: ok (button label), buttons [{label, value,
## primary}], dismiss_value, close (show the ✕), sound. Returns the chosen button's value.
func notice(blocks: Array, opts: Dictionary = {}) -> Variant:
	var n: Notice = NOTICE.instantiate()
	var buttons: Array = opts.get("buttons", [{"label": opts.get("ok", "OK"), "value": true, "primary": true}])
	var m := modal(n, {"close": opts.get("close", false), "sound": opts.get("sound", "page"), "no_backdrop_close": true})
	n.build(blocks, buttons)
	var result := [opts.get("dismiss_value", null)]
	var choose := func(v: Variant) -> void:
		result[0] = v
		m.close(true)
	n.chosen.connect(choose)
	await m.closed
	return result[0]


func confirm(title: String, text: String, yes: String = "Yes", no: String = "Not now") -> bool:
	var blocks := [["h2", title]]
	if text != "":
		blocks.append(["p", Util.escape_bb(text)])
	var n: Notice = NOTICE.instantiate()
	var m := modal(n, {"no_backdrop_close": true})
	n.build(blocks, [{"label": no, "value": false}, {"label": yes, "value": true, "primary": true}])
	var result := [false]
	var choose := func(v: Variant) -> void:
		result[0] = v
		m.close(true)
	n.chosen.connect(choose)
	await m.closed
	return result[0]


## The name box on a new game. Returns the name, or "" if you went back.
func ask_name() -> String:
	var box: NameEntry = NAME_ENTRY.instantiate()
	var m := modal(box, {"close": false})
	box.setup("Rosa's granddaughter", "What's your name?", "Nora", 12, "Back", "Begin")
	var result := [""]
	var done := func(v: String) -> void:
		result[0] = v
		m.close(true)
	box.done.connect(done)
	await m.closed
	return result[0]


# ------------------------------------------------------------------ toasts, pops, fades, cards
func toast(text: String, icon: String = "", cls: String = "", ms: int = 2600) -> void:
	var t: Toast = TOAST.instantiate()
	toasts.add_child(t)
	t.setup(text, icon, cls, ms / 1000.0)
	while toasts.get_child_count() > 4:
		var old := toasts.get_child(0)
		toasts.remove_child(old)
		old.queue_free()


func money_pop(amount: float, pos: Vector2) -> void:
	var p: MoneyPop = MONEY_POP.instantiate()
	pop_host.add_child(p)
	p.setup(amount, pos)


func fade_out(secs: float = 0.45) -> void:
	await _fade(1.0, secs)
	await get_tree().create_timer(0.03).timeout


func fade_in(secs: float = 0.45) -> void:
	await _fade(0.0, secs)


func _fade(to: float, secs: float) -> void:
	if _fade_tween:
		_fade_tween.kill()
	fader.mouse_filter = Control.MOUSE_FILTER_STOP if to > 0 else Control.MOUSE_FILTER_IGNORE
	_fade_tween = create_tween()
	_fade_tween.tween_property(fader, "color:a", to, secs)
	await _fade_tween.finished


## A camera flash.
func flash() -> void:
	var f := ColorRect.new()
	f.color = Color(1, 1, 1, 0.9)
	f.mouse_filter = Control.MOUSE_FILTER_IGNORE
	f.set_anchors_preset(Control.PRESET_FULL_RECT)
	pop_host.add_child(f)
	var tw := create_tween()
	tw.tween_property(f, "color:a", 0.0, 0.5)
	tw.tween_callback(f.queue_free)


func day_card(l1: String, l2: String, l3: String, secs: float = 2.2) -> void:
	var c: DayCard = DAY_CARD.instantiate()
	card_host.add_child(c)
	push_overlay()
	await c.play(l1, l2, l3, secs)
	pop_overlay()


# ------------------------------------------------------------------ context menu
## A little row of buttons over something you tapped (a person, a machine). options:
## [{label, icon, run: Callable}]
func context_menu(pos: Vector2, title: String, options: Array) -> void:
	close_context_menu()
	var m: ContextMenu = CONTEXT_MENU.instantiate()
	context_host.add_child(m)
	m.setup(pos, title, options)
	Sound.play("pop", 0.5)


func close_context_menu() -> bool:
	var had := false
	for c in context_host.get_children():
		c.queue_free()
		had = true
	return had


# ------------------------------------------------------------------ minigames
## Folding: swipe along the arrows. Returns the quality (0..1).
func fold_game(color: String) -> float:
	var g: FoldGame = FOLD_GAME.instantiate()
	minigame_host.add_child(g)
	push_overlay()
	g.start(color)
	var q: float = await g.finished
	pop_overlay()
	return q


## Repairs: stop the needle in the green, one bolt at a time. Returns the quality (0..1).
func repair_game(bolts: int) -> float:
	var g: RepairGame = REPAIR_GAME.instantiate()
	minigame_host.add_child(g)
	push_overlay()
	g.start(bolts)
	var q: float = await g.finished
	pop_overlay()
	return q
