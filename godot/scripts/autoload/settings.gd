extends Node
## Player settings, saved apart from the game (user://settings.json). Autoloaded as Settings.

signal changed(key: String)

const DEFAULTS := {"music": 0.7, "sfx": 0.9, "amb": 0.8, "voices": true, "voiceVol": 0.6, "textSpeed": "normal",
	"textSize": 1.0, "vibrate": true, "quality": 1, "pace": "normal"}

var _s := DEFAULTS.duplicate()


func _ready() -> void:
	_s = DEFAULTS.duplicate()
	_s.merge(SaveGame.load_settings(), true)
	apply()


func get_value(k: String) -> Variant:
	return _s.get(k, DEFAULTS.get(k))


func set_value(k: String, v: Variant) -> void:
	_s[k] = v
	apply()
	SaveGame.save_settings(_s)
	changed.emit(k)


func apply() -> void:
	Sound.vol.music = float(_s.music)
	Sound.vol.sfx = float(_s.sfx)
	Sound.vol.amb = float(_s.amb)
	Sound.vol.voice = float(_s.voiceVol)
	Sound.apply_volumes()


func text_scale() -> float:
	return float(_s.textSize)


## Typewriter speed in characters per second (INF = instant).
func text_speed() -> float:
	return {"slow": 28.0, "normal": 55.0, "fast": 110.0, "instant": INF}.get(_s.textSpeed, 55.0)


func vibrate(ms: int = 12) -> void:
	if _s.vibrate:
		Input.vibrate_handheld(ms)
