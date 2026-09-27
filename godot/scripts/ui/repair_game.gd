class_name RepairGame extends Control
## Repairs: tap the glowing bolt, then tap again when the needle is in the green. Every bolt
## tightened; the fewer misses, the better the repair. finished(quality 0..1).

signal finished(quality: float)

const SPOTS := [[22, 30], [50, 26], [78, 32], [28, 62], [55, 58], [76, 66]]

var bolts: Array[Control] = []
var idx := 0
var attempts := 0
var hits := 0
var mode := "pick"
var pos := 0.0
var dir := 1.0
var zone_w := 16.0
var speed := 95.0
var zone_a := 0.0

@onready var board: Control = $Board
@onready var panel: Control = $Board/Panel
@onready var hint: Label = $Board/Hint
@onready var gauge: Control = $Board/Gauge


func start(n: int) -> void:
	var skill := G.skills.repair + (1.5 if "tool_kit" in G.upgrades else 0.0)
	zone_w = clampf(16.0 + skill * 4.0, 16.0, 36.0)
	speed = 95.0 - skill * 6.0
	var spots := Rng.shared.shuffle(SPOTS).slice(0, n)
	for s: Array in spots:
		var b: Control = preload("res://scenes/ui/repair_bolt.tscn").instantiate()
		panel.add_child(b)
		b.set_meta("at", Vector2(s[0], s[1]) / 100.0)
		bolts.append(b)
	gauge.visible = false
	board.gui_input.connect(_on_input)
	_place.call_deferred()
	_set_target()


func _place() -> void:
	for b in bolts:
		b.position = panel.size * (b.get_meta("at") as Vector2) - b.size / 2.0


func _set_target() -> void:
	for i in bolts.size():
		bolts[i].set_meta("target", i == idx)
		bolts[i].queue_redraw()
	hint.text = "Tap the glowing bolt"


func _start_gauge() -> void:
	mode = "gauge"
	gauge.visible = true
	zone_a = 12.0 + randf() * (76.0 - zone_w)
	gauge.set_meta("zone", Vector2(zone_a, zone_a + zone_w))
	pos = 0.0
	dir = 1.0
	hint.text = "Tap when the needle is in the green!"


func _process(dt: float) -> void:
	if mode != "gauge":
		return
	pos += dir * speed * dt
	if pos > 100:
		pos = 100
		dir = -1
	if pos < 0:
		pos = 0
		dir = 1
	gauge.set_meta("needle", pos)
	gauge.queue_redraw()


func _on_input(e: InputEvent) -> void:
	if not (e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT):
		return
	if mode == "pick":
		var b := bolts[idx]
		if b.get_global_rect().has_point(board.get_global_transform() * e.position):
			Sound.play("metal_click", 0.7)
			_start_gauge()
		return
	if mode != "gauge":
		return
	attempts += 1
	if pos >= zone_a and pos <= zone_a + zone_w:
		hits += 1
		Sound.play("ratchet", 0.8)
		Settings.vibrate(25)
		bolts[idx].set_meta("target", false)
		bolts[idx].set_meta("done", true)
		bolts[idx].queue_redraw()
		gauge.visible = false
		idx += 1
		if idx >= bolts.size():
			mode = "done"
			hint.text = "Fixed! It hums again."
			Sound.play("machine_start", 0.8, 1.0, 0.0, 0.3)
			await get_tree().create_timer(1.1).timeout
			queue_free()
			finished.emit(clampf(float(hits) / maxf(attempts, 1), 0.0, 1.0))
		else:
			mode = "pick"
			_set_target()
	else:
		Sound.play("clank", 0.8, 1.0, 0.1)
		Settings.vibrate(40)
		var x := board.position.x
		var tw := create_tween()
		tw.tween_property(board, "position:x", x - 6, 0.06)
		tw.tween_property(board, "position:x", x + 6, 0.06)
		tw.tween_property(board, "position:x", x, 0.06)
		hint.text = "Clank. Try again…"
