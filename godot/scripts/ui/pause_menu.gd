class_name PauseMenu extends PanelContainer
## Paused: volumes, text speed and size, shift pace, vibration, graphics; how to play; save and
## quit. Each setting row in the scene is wired to its Settings key here.

signal close_requested

@onready var music: HSlider = $VBox/Music/Slider
@onready var sfx: HSlider = $VBox/Sfx/Slider
@onready var amb: HSlider = $VBox/Amb/Slider
@onready var voices: HSlider = $VBox/Voices/Slider
@onready var help_button: PillButton = $VBox/Actions/Help
@onready var quit_button: PillButton = $VBox/Actions/Quit
@onready var resume_button: PillButton = $VBox/Actions/Resume

## Setting rows with choices: node name -> [settings key, [values]]
const SEGS := {
	"TextSpeed": ["textSpeed", ["slow", "normal", "fast", "instant"]],
	"TextSize": ["textSize", [0.9, 1.0, 1.15, 1.3]],
	"Pace": ["pace", ["relaxed", "normal", "brisk"]],
	"Vibration": ["vibrate", [true, false]],
	"Graphics": ["quality", [0, 1, 2]],
}


func _ready() -> void:
	for pair in [[music, "music"], [sfx, "sfx"], [amb, "amb"], [voices, "voiceVol"]]:
		var s: HSlider = pair[0]
		var key: String = pair[1]
		s.value = float(Settings.get_value(key))
		s.value_changed.connect(func(v: float) -> void: Settings.set_value(key, v))
	for row: String in SEGS:
		var key: String = SEGS[row][0]
		var values: Array = SEGS[row][1]
		var seg := get_node("VBox/%s/Seg" % row) as HBoxContainer
		var group := ButtonGroup.new()
		for i in seg.get_child_count():
			var b := seg.get_child(i) as Button
			b.toggle_mode = true
			b.button_group = group
			b.button_pressed = _same(Settings.get_value(key), values[i])
			var v: Variant = values[i]
			b.pressed.connect(func() -> void:
				Settings.set_value(key, v)
				Sound.play("toggle", 0.5)
				if key == "quality":
					App.apply_quality())
	var at_title: bool = App.location != null and App.location.scene_kind == "title"
	quit_button.visible = not at_title
	help_button.pressed.connect(func() -> void:
		close_requested.emit()
		UI.menus.help())
	quit_button.pressed.connect(func() -> void:
		close_requested.emit()
		if G.phase != "shift":
			SaveGame.save()
		else:
			App.save_mid_shift()
		App.to_title())
	resume_button.pressed.connect(func() -> void: close_requested.emit())


static func _same(a: Variant, b: Variant) -> bool:
	if (a is float or a is int) and (b is float or b is int):
		return is_equal_approx(float(a), float(b))
	return a == b
