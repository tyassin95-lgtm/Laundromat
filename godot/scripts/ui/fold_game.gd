class_name FoldGame extends Control
## Folding: swipe along the arrow to fold each part of the garment (or tap the arrow). Quicker
## and straighter swipes fold neater; the folding board and your folding skill help.
## finished(quality 0..1).

signal finished(quality: float)

const PART := preload("res://scenes/ui/fold_part.tscn")
## Garments on a grid of w x h units: their parts (rects, the edge they fold over) and the steps.
const GARMENTS := {
	"shirt": {"w": 20.0, "h": 16.0,
		"parts": [["body", 5, 1, 10, 15, ""], ["l", 0.3, 1, 5, 5.5, "right"], ["r", 14.7, 1, 5, 5.5, "left"]],
		"steps": [{"dir": "right", "part": "l", "fold": "flip", "arrow": [3, 4]}, {"dir": "left", "part": "r", "fold": "flip", "arrow": [17, 4]},
			{"dir": "up", "part": "body", "fold": "half", "arrow": [10, 13]}]},
	"towel": {"w": 20.0, "h": 14.0,
		"parts": [["a", 2, 1, 8, 12, "right"], ["b", 10, 1, 8, 12, ""]],
		"steps": [{"dir": "right", "part": "a", "fold": "flip", "arrow": [5, 7]}, {"dir": "up", "part": "b", "fold": "half", "arrow": [14, 11], "also": ["a"]}]},
	"pants": {"w": 20.0, "h": 16.0,
		"parts": [["top", 6, 1, 8, 4, ""], ["legL", 6, 5, 4, 10.5, "right"], ["legR", 10, 5, 4, 10.5, ""]],
		"steps": [{"dir": "right", "part": "legL", "fold": "flip", "arrow": [7, 10]}, {"dir": "up", "part": "legR", "fold": "third", "arrow": [12, 13], "also": ["legL"]}]},
}
const COLORS := ["#7fa0b0", "#c9b88f", "#b86a4a", "#6f8f6a", "#d9cfbf", "#5f6f8f", "#c48fa0", "#e0c070"]
const ARROWS := {"right": "➜", "left": "⬅", "up": "⬆", "down": "⬇"}
const DIRS := {"right": Vector2(1, 0), "left": Vector2(-1, 0), "up": Vector2(0, -1), "down": Vector2(0, 1)}

var kind := "shirt"
var def := {}
var parts := {}
var step := 0
var score := 0.0
var step_start := 0
var done := false
var easy := 0.0
var _down := false
var _start := Vector2.ZERO

@onready var board: Control = $Board
@onready var hint: Label = $Board/Hint
@onready var garment: Control = $Board/Garment
@onready var arrow: Label = $Board/Garment/Arrow
@onready var progress: HBoxContainer = $Board/Progress
@onready var trail: Node2D = $Board/Trail


func start(color: String) -> void:
	kind = Rng.shared.pick(["shirt", "shirt", "towel", "pants"])
	def = GARMENTS[kind]
	var col := Color(color if color != "" else Rng.shared.pick(COLORS))
	var gs := garment.size
	for p: Array in def.parts:
		var part: FoldPart = PART.instantiate()
		garment.add_child(part)
		garment.move_child(part, arrow.get_index())
		part.setup(kind, p[0], col)
		part.position = Vector2(p[1] / def.w * gs.x, p[2] / def.h * gs.y)
		part.size = Vector2(p[3] / def.w * gs.x, p[4] / def.h * gs.y)
		# folds turn over this edge, and squash towards the top
		part.pivot_offset = Vector2(part.size.x if p[5] == "right" else 0.0 if p[5] == "left" else part.size.x / 2.0, 0.0)
		parts[p[0]] = part
	for i in def.steps.size():
		progress.get_child(i).visible = true
	easy = (1.0 if "fold_board" in G.upgrades else 0.0) + G.skills.fold * 0.2
	Sound.play("cloth2", 0.8)
	_show_step()
	board.gui_input.connect(_on_board_input)


func _show_step() -> void:
	var s: Dictionary = def.steps[step]
	arrow.text = ARROWS[s.dir]
	var gs := garment.size
	arrow.position = Vector2(s.arrow[0] / def.w * gs.x, s.arrow[1] / def.h * gs.y) - arrow.size / 2.0
	step_start = Time.get_ticks_msec()


func _fold(accuracy: float) -> void:
	var s: Dictionary = def.steps[step]
	var part: FoldPart = parts[s.part]
	garment.move_child(part, arrow.get_index() - 1)
	_apply(part, s.fold)
	for a: String in s.get("also", []):
		_apply(parts[a], s.fold, true)
	var secs := (Time.get_ticks_msec() - step_start) / 1000.0
	var speed := clampf(1.4 - secs * 0.45 + easy * 0.25, 0.3, 1.0)
	score += clampf(accuracy * 0.6 + speed * 0.4 + easy * 0.05, 0.0, 1.0)
	(progress.get_child(step) as Control).modulate = Color("#e8b04e")
	Sound.play(Rng.shared.pick(["cloth1", "cloth3", "cloth4"]), 0.9, 1.0, 0.08)
	Sound.play("whoosh2", 0.3)
	Settings.vibrate(10)
	step += 1
	if step >= def.steps.size():
		_finish()
	else:
		_show_step()


func _apply(part: FoldPart, fold: String, also: bool = false) -> void:
	var tw := create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	match fold:
		"flip":
			tw.tween_property(part, "scale:x", -part.scale.x, 0.28)
		"half":
			tw.tween_property(part, "scale:y", 0.5, 0.28)
		"third":
			tw.set_parallel()
			tw.tween_property(part, "scale:y", 0.35, 0.28)
			tw.tween_property(part, "position:y", part.position.y - part.size.y * (0.025 if not also else 0.0), 0.28)


func _finish() -> void:
	done = true
	arrow.visible = false
	var q := score / def.steps.size()
	hint.text = "Perfect fold!" if q > 0.85 else "Nice and neat." if q > 0.65 else "Good enough!"
	if q > 0.85:
		Sound.play("sparkle", 0.6)
	await get_tree().create_timer(0.38).timeout
	garment.pivot_offset = garment.size / 2.0
	var tw := create_tween().set_parallel().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)
	tw.tween_property(garment, "scale", Vector2(0.35, 0.35), 0.45)
	tw.tween_property(garment, "position:y", garment.position.y + 640.0 * 0.35, 0.45)
	tw.tween_property(garment, "modulate:a", 0.0, 0.45)
	await get_tree().create_timer(0.52).timeout
	queue_free()
	finished.emit(q)


func _on_board_input(e: InputEvent) -> void:
	if done:
		return
	if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT:
		if e.pressed:
			_down = true
			_start = e.position
		elif _down:
			_down = false
			_release(e.position)
	elif e is InputEventMouseMotion and _down:
		trail.add(e.position)


func _release(p: Vector2) -> void:
	var d := p - _start
	var want: Vector2 = DIRS[def.steps[step].dir]
	if d.length() < 18:
		# a tap on the arrow also works
		if arrow.get_global_rect().grow(8).has_point(board.get_global_transform() * p):
			_fold(0.75)
		return
	var c := d.dot(want) / d.length()
	if c > 0.55:
		_fold(clampf((c - 0.55) / 0.45, 0.0, 1.0) * 0.6 + 0.4)
	else:
		Sound.play("error", 0.4)
		var tw := create_tween()
		arrow.pivot_offset = arrow.size / 2.0
		tw.tween_property(arrow, "scale", Vector2(1.3, 1.3), 0.08)
		tw.tween_property(arrow, "scale", Vector2.ONE, 0.17)
