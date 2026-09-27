class_name DialogueBox extends Control
## Visual-novel style conversations: portraits rising from behind the text box's top corners,
## a name plate, typewriter text (with voice blips), and choices stacked above the box.
## Story.play() opens it; the script runner calls say() and choose().

signal _advance
signal _chosen(index: int)

const CHOICE := preload("res://scenes/ui/choice_button.tscn")

var _typing := false
var _waiting := false
var _shown := 0.0
var _speed := 55.0
var _pitch := 1.0
var _blip_gap := 0
var _plain := ""
var _tween: Tween

@onready var shade: Control = $Shade
@onready var stage: Control = $Stage
@onready var portrait_left: TextureRect = $Stage/PortraitLeft
@onready var portrait_right: TextureRect = $Stage/PortraitRight
@onready var box: PanelContainer = $Stage/Box
@onready var text_label: RichTextLabel = $Stage/Box/Text
@onready var name_plate: PanelContainer = $Stage/NamePlate
@onready var name_label: Label = $Stage/NamePlate/Name
@onready var next_mark: Label = $Stage/Box/Next
@onready var choices: VBoxContainer = $Stage/Choices


func _ready() -> void:
	visible = false
	gui_input.connect(_on_input)


func is_open() -> bool:
	return visible


func open() -> void:
	if visible:
		return
	visible = true
	modulate.a = 1.0
	_clear_portraits()
	name_plate.visible = false
	text_label.text = ""
	next_mark.visible = false
	for c in choices.get_children():
		c.queue_free()
	shade.modulate.a = 0.0
	box.modulate.a = 0.0
	box.position.y = 32.0
	var tw := create_tween().set_parallel()
	tw.tween_property(shade, "modulate:a", 1.0, 0.25)
	tw.tween_property(box, "modulate:a", 1.0, 0.3)
	tw.tween_property(box, "position:y", 0.0, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func close() -> void:
	if not visible:
		return
	_typing = false
	_waiting = false
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 0.0, 0.2)
	tw.tween_callback(func() -> void:
		visible = false
		modulate.a = 1.0)


## One line. who: a character id, or "" for narration. Returns when the player taps on.
func say(who: String, expr: String, text: String) -> void:
	if not visible:
		open()
	for c in choices.get_children():
		c.queue_free()
	var bb := UI.format_text(text)
	if who != "":
		var side := _show_portrait(who, expr)
		name_label.text = CharactersData.display_name(who)
		name_plate.visible = name_label.text != ""
		_place_name_plate(side)
		text_label.theme_type_variation = &"DialogueText"
		text_label.text = bb
	else:
		name_plate.visible = false
		text_label.theme_type_variation = &"NarrationText"
		text_label.text = "[center]%s[/center]" % bb
		_dim(portrait_left, true)
		_dim(portrait_right, true)
	next_mark.visible = false
	await _typewrite(who)
	next_mark.visible = true
	_waiting = true
	await _advance


## Choices over the box. Returns the index of the one picked.
func choose(options: Array) -> int:
	next_mark.visible = false
	for c in choices.get_children():
		c.queue_free()
	var font := get_theme_font("font", "Button")
	var fs := get_theme_font_size("font_size", "Button")
	var widest := 0.0
	for o: String in options:
		widest = maxf(widest, font.get_string_size(UI.format_text(o), HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x)
	var max_w := minf(576.0, stage.size.x * 0.8)
	choices.custom_minimum_size.x = minf(widest + 84.0, max_w)
	for i in options.size():
		var b: Button = CHOICE.instantiate()
		b.text = _plain_text(UI.format_text(options[i]))
		b.pressed.connect(func() -> void:
			Sound.play("select", 0.7)
			for c in choices.get_children():
				c.queue_free()
			_chosen.emit(i))
		choices.add_child(b)
		b.modulate.a = 0.0
		var tw := create_tween()
		tw.tween_interval(i * 0.07)
		tw.tween_property(b, "modulate:a", 1.0, 0.3)
	return await _chosen


## Clears the portraits (between scenes).
func clear_portraits() -> void:
	_clear_portraits()


## Android back / a tap: finish the line, or go on to the next.
func tap() -> void:
	if _typing:
		_finish_typing()
	elif _waiting:
		_waiting = false
		next_mark.visible = false
		Sound.play("tick", 0.4)
		_advance.emit()


func _on_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		accept_event()
		tap()


# ------------------------------------------------------------------ typing
func _typewrite(who: String) -> void:
	_speed = Settings.text_speed()
	_pitch = float(CharactersData.CHARACTERS.get(who, {}).get("voice", 1.0))
	_plain = text_label.get_parsed_text()
	if is_inf(_speed):
		text_label.visible_characters = -1
		return
	text_label.visible_characters = 0
	_shown = 0.0
	_blip_gap = 0
	_typing = true
	while _typing:
		await get_tree().process_frame


func _process(delta: float) -> void:
	if not _typing:
		return
	var total := text_label.get_total_character_count()
	var before := int(_shown)
	_shown += minf(delta, 0.1) * _speed
	var now := mini(int(_shown), total)
	text_label.visible_characters = now
	if now > before:
		_blip_gap -= now - before
		var ch := _plain.substr(now - 1, 1) if now - 1 < _plain.length() else ""
		if _blip_gap <= 0 and Settings.get_value("voices") and RegEx.create_from_string("[A-Za-z0-9]").search(ch):
			Sound.play("blip", 0.28, _pitch * (0.94 + randf() * 0.12), 0.0, 0.0, true)
			_blip_gap = 3
	if now >= total:
		_finish_typing()


func _finish_typing() -> void:
	_typing = false
	text_label.visible_characters = -1


# ------------------------------------------------------------------ portraits
func _show_portrait(who: String, expr: String) -> String:
	var c: Dictionary = CharactersData.CHARACTERS.get(who, {})
	var side: String = "left" if c.get("side", "right") == "left" else "right"
	var img := portrait_left if side == "left" else portrait_right
	var other := portrait_right if side == "left" else portrait_left
	var src := CharactersData.portrait_for(who, expr)
	if src != "":
		var was_hidden := not img.visible or img.get_meta("who", "") != who
		img.texture = Util.sprite(src)
		img.set_meta("who", who)
		img.visible = true
		_dim(img, false)
		_fit_portrait(img, side)
		if was_hidden:
			# rise into view
			img.modulate.a = 0.0
			var y := img.position.y
			img.position.y = y + 40.0
			var tw := create_tween().set_parallel()
			tw.tween_property(img, "modulate:a", 1.0, 0.35)
			tw.tween_property(img, "position:y", y, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		else:
			# a little bump when they speak again
			var y := img.position.y
			var tw := create_tween()
			tw.tween_property(img, "position:y", y - 9.6, 0.1)
			tw.tween_property(img, "position:y", y, 0.15)
	else:
		img.visible = false
		img.set_meta("who", "")
	_dim(other, true)
	return side


## Portraits are 320 px tall, their feet 38 px below the top of the text box.
func _fit_portrait(img: TextureRect, side: String) -> void:
	var tex := img.texture
	if tex == null:
		return
	var h := 320.0
	var w := h * tex.get_width() / tex.get_height()
	img.size = Vector2(w, h)
	img.position = Vector2(16.0 if side == "left" else stage.size.x - 16.0 - w, box.position.y + 38.4 - h)
	img.pivot_offset = Vector2(w / 2.0, h)


func _dim(img: TextureRect, on: bool) -> void:
	img.modulate = Color(0.55, 0.55, 0.55, img.modulate.a) if on else Color(1, 1, 1, img.modulate.a)
	img.scale = Vector2(0.94, 0.94) if on else Vector2.ONE


func _clear_portraits() -> void:
	for img in [portrait_left, portrait_right]:
		img.visible = false
		img.set_meta("who", "")


func _place_name_plate(side: String) -> void:
	await get_tree().process_frame
	var w := name_plate.size.x
	name_plate.position = Vector2(41.6 if side == "left" else stage.size.x - 41.6 - w, box.position.y - 46.4)


static func _plain_text(bb: String) -> String:
	return RegEx.create_from_string("\\[[^\\]]*\\]").sub(bb, "", true)
