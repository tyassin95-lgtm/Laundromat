class_name SaveGame
## Save / load. The game autosaves at safe points (start of each phase, after sleeping, on pause).
## Files live in user:// as JSON.

const SAVE_PATH := "user://save.json"
const SETTINGS_PATH := "user://settings.json"
const CHECKPOINT_PATH := "user://checkpoint.json"


static func _read(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		return null
	var text := FileAccess.get_file_as_string(path)
	var data: Variant = JSON.parse_string(text)
	return Util.fix_numbers(data) if data is Dictionary else null


static func _write(path: String, data: Dictionary) -> bool:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		push_warning("save failed: %s" % error_string(FileAccess.get_open_error()))
		return false
	f.store_string(JSON.stringify(data))
	return true


static func exists() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


## A quick look at the save for the title menu: {name, day, money, phase, ending}, or {}.
static func peek() -> Dictionary:
	var d: Variant = _read(SAVE_PATH)
	if not d is Dictionary:
		return {}
	return {"name": d.get("player_name", ""), "day": d.get("day", 1), "money": d.get("money", 0), "phase": d.get("phase", ""), "ending": d.get("ending", "")}


static func save() -> bool:
	G.saved_at = int(Time.get_unix_time_from_system())
	return _write(SAVE_PATH, G.to_dict())


static func load_game() -> bool:
	var d: Variant = _read(SAVE_PATH)
	if not d is Dictionary:
		return false
	G.from_dict(d)
	return true


static func wipe() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(SAVE_PATH)


## Snapshot taken just before the final decision, so a "sell" ending can be rewound.
static func save_checkpoint() -> void:
	_write(CHECKPOINT_PATH, G.to_dict())


static func has_checkpoint() -> bool:
	return FileAccess.file_exists(CHECKPOINT_PATH)


static func restore_checkpoint() -> bool:
	var d: Variant = _read(CHECKPOINT_PATH)
	if not d is Dictionary:
		return false
	G.from_dict(d)
	G.flags.erase("ev_final_morning")
	G.flags.erase("checkpoint")
	G.flags.erase("ending_done")
	G.ending = ""
	G.phase = "morning"
	return _write(SAVE_PATH, G.to_dict())


static func load_settings() -> Dictionary:
	var d: Variant = _read(SETTINGS_PATH)
	return d if d is Dictionary else {}


static func save_settings(s: Dictionary) -> void:
	_write(SETTINGS_PATH, s)
