class_name Actor extends Node2D
## A character in the world. The art is single-frame "paper cut-outs", so nobody walks: to move,
## a character turns edge-on where it stands, a little arc of glints shows where it went, and it
## turns back to face you at the destination with a small landing squash. Very short moves are a
## quick hop instead. Life comes from breathing, squash and emotes.
##
## The node's position is the character's feet. The Body sprite is posed every frame; the
## Motes child draws the puffs and glints.

## Emitted when a move ends: true if it arrived, false if another move or stop() cut in.
signal arrived(ok: bool)

## Player poses: sprite and horizontal anchor (where the feet are, as a fraction of the width).
const PLAYER_POSES := {
	"idle": ["player_idle", 0.5], "look": ["player_idle_look", 0.47], "carry": ["player_carry", 0.48],
	"load": ["player_load_arms", 0.3], "mop": ["player_mop", 0.36], "reach": ["player_reach_clean", 0.42],
	"wave": ["player_wave", 0.45], "stretch": ["player_stretch", 0.5],
	"pet": ["player_pet", 0.4], "tea": ["player_tea", 0.51], "read": ["player_read", 0.5], "knit": ["player_knit_clean", 0.448],
	"sketch": ["player_sketch", 0.4], "water": ["player_water", 0.33], "photo": ["player_photo", 0.46], "feed": ["player_feed", 0.3],
}
const PLAYER_REF_H := 490.0      # natural height of player_idle; all poses share its scale
# Hop timings in seconds. The gap (while edge-on) grows a little with distance.
const HOP_OUT := 0.14
const HOP_IN := 0.24
const GAP_MIN := 0.06
const GAP_MAX := 0.22
const STEP := 0.18
const STEP_BELOW := 60.0

@export var id := "me"
@export var is_player := false
## The in-world sprite (NPCs).
@export var npc_sprite := ""
## Display height in virtual px at character scale 1.
@export var height := 262.0
## Hop speed; scenes lower it when you're tired and the hops get slower.
@export var speed := 300.0
## Width of the tap area.
@export var hit_w := 110.0
@export var facing := 1

var base_speed := 300.0
var pose := "idle"
var pose_timer := 0.0
var hop := {}                      # the move in progress
var arrived_paused := false        # landed while the game was paused; resolve on resume
var moving := false
var motes: Array[Dictionary] = []  # puffs and glints from hopping (world px)
var idle_t := 0.0
var alpha := 1.0
var scale_mul := 1.0
var emote := ""
var emote_t := 0.0
var emote_age := 0.0
var carrying := false
var squash := 0.0
var breath := randf() * 6.0
var char_scale := 1.0              # scene-level size multiplier (exteriors are smaller)
var _waiting := false
var _shadow := {}

@onready var body: Sprite2D = $Body
@onready var motes_node: Node2D = $Motes


func _ready() -> void:
	add_to_group("actors")
	base_speed = speed
	_update_visual()


## Sets up an NPC from the character data.
func setup_npc(who: String) -> void:
	var c: Dictionary = CharactersData.CHARACTERS[who]
	id = who
	is_player = false
	npc_sprite = c.get("sprite", "")
	height = c.get("h", 262)


func disp_h() -> float:
	return height * char_scale * scale_mul


# ------------------------------------------------------------------ moving
## Moves to (x, y), ending up facing `face` (1 right, -1 left) if given: the turn happens while
## the cut-out is edge-on, so it never visibly flips. Returns true on arrival, or false if
## another move or stop() cut in.
func walk_to(x: float, y: float, face: int = 0) -> bool:
	if arrived_paused:
		arrived_paused = false
		_settle(true)
	else:
		_settle(false)
	var d := Vector2(x, y).distance_to(position)
	if hop.is_empty() and d < 2:
		position = Vector2(x, y)
		if face != 0:
			facing = face
		return true
	moving = true
	idle_t = 0.0
	if not hop.is_empty():
		_retarget(x, y, face)
	else:
		_start_hop(x, y, d, face)
	_waiting = true
	return await arrived


## Pops into view where it stands (someone coming through the door).
func appear() -> bool:
	_settle(false)
	visible = true
	hop = _jump(position.x, position.y, 0)
	hop.phase = "in"
	moving = true
	_waiting = true
	return await arrived


## Turns edge-on and stays gone (someone leaving). Returns once out of sight.
func vanish() -> bool:
	_settle(false)
	hop = _jump(position.x, position.y, 0)
	hop.vanish = true
	puff(position.x, position.y, 6)
	_sfx("whoosh2", 0.2)
	moving = true
	_waiting = true
	return await arrived


func stop() -> void:
	if hop.get("vanish", false):
		visible = false
	hop = {}
	moving = false
	arrived_paused = false
	motes.clear()
	_settle(false)


func _settle(v: bool) -> void:
	if _waiting:
		_waiting = false
		arrived.emit(v)


func set_pose(p: String, secs: float = 0.0) -> void:
	pose = p
	pose_timer = secs
	idle_t = 0.0


func say(e: String, secs: float = 2.5) -> void:
	if emote != e:
		emote_age = 0.0
	emote = e
	emote_t = secs


# ------------------------------------------------------------------ hopping
func _hop_scale() -> float:
	return clampf(base_speed / maxf(1.0, speed), 1.0, 1.6)


func _jump(tx: float, ty: float, d: float) -> Dictionary:
	var k := _hop_scale()
	return {"kind": "jump", "phase": "out", "t": 0.0, "fx": position.x, "fy": position.y, "tx": tx, "ty": ty,
		"s0": minf(1.0, presence()), "glints": 0, "face": 0, "vanish": false,
		"out": HOP_OUT * k, "gap": (GAP_MIN + minf(GAP_MAX - GAP_MIN, d / 5000.0)) * k, "in": HOP_IN * k}


func _start_hop(tx: float, ty: float, d: float, face: int) -> void:
	if d < STEP_BELOW:
		hop = {"kind": "step", "t": 0.0, "fx": position.x, "fy": position.y, "tx": tx, "ty": ty, "dur": STEP * _hop_scale()}
		var f := face if face != 0 else (int(signf(tx - position.x)) if absf(tx - position.x) > 12 else 0)
		if f != 0:
			facing = f
		return
	hop = _jump(tx, ty, d)
	hop.face = face
	puff(position.x, position.y, 6)
	_sfx("whoosh2", 0.22)


## A new destination mid-move.
func _retarget(tx: float, ty: float, face: int) -> void:
	var h := hop
	if h.kind == "step" or h.get("vanish", false):
		hop = {}
		_start_hop(tx, ty, Vector2(tx, ty).distance_to(position), face)
		return
	if h.phase == "out":
		h.tx = tx
		h.ty = ty
		h.face = face
		return
	if h.phase == "gap":
		# already edge-on and out of sight: just move the landing spot
		h.tx = tx
		h.ty = ty
		h.face = face
		position = Vector2(tx, ty)
		if face != 0:
			facing = face
		elif absf(tx - h.fx) > 2:
			facing = 1 if tx > h.fx else -1
		return
	# turning back in: fold away again from wherever the turn has got to
	hop = _jump(tx, ty, Vector2(tx, ty).distance_to(position))
	hop.face = face
	_sfx("whoosh2", 0.16)


## Advances the move. Returns true on the frame it finishes.
func _step_hop(dt: float) -> bool:
	var h := hop
	if h.is_empty():
		return false
	h.t += dt
	if h.kind == "step":
		var p := minf(1.0, h.t / h.dur)
		var e := Util.ease_in_out_quad(p)
		position = Vector2(h.fx + (h.tx - h.fx) * e, h.fy + (h.ty - h.fy) * e)
		if p < 1:
			return false
		hop = {}
		squash = 0.05
		return true
	if h.phase == "gone":
		if h.t < 0.35:
			return false                   # let the puff settle before we're removed
		hop = {}
		visible = false
		return true
	if h.phase == "out":
		if h.t < h.out:
			return false
		if h.vanish:
			h.phase = "gone"
			h.t = 0.0
			return false
		h.phase = "gap"
		h.t = 0.0
		# edge-on nobody can see which way the cut-out faces, so it turns around here
		if h.face != 0:
			facing = h.face
		elif absf(h.tx - h.fx) > 2:
			facing = 1 if h.tx > h.fx else -1
		position = Vector2(h.tx, h.ty)
		return false
	if h.phase == "gap":
		_emit_glints(h, false)
		if h.t >= h.gap:
			_emit_glints(h, true)
			h.phase = "in"
			h.t = 0.0
		return false
	if h.t < h["in"]:
		return false
	hop = {}
	squash = 0.07
	puff(position.x, position.y, 5)
	_sfx("pop", 0.13, 1.3)
	return true


## 0 = edge-on (unseen) .. 1 = facing you. Overshoots a touch as it turns back in.
func presence() -> float:
	var h := hop
	if h.is_empty() or h.kind == "step":
		return 1.0
	if h.phase == "out":
		return h.s0 * (1.0 - Util.ease_in_quad(minf(1.0, h.t / h.out)))
	if h.phase == "gap" or h.phase == "gone":
		return 0.0
	return Util.ease_out_back(minf(1.0, h.t / h["in"]))


## How far off the floor (negative = up).
func lift() -> float:
	var h := hop
	if h.is_empty():
		return 0.0
	if h.kind == "step":
		return -sin(minf(1.0, h.t / h.dur) * PI) * 9.0 * char_scale
	var L := 12.0 * char_scale
	if h.phase == "out":
		return -L * Util.ease_out_quad(minf(1.0, h.t / h.out))
	if h.phase == "gap" or h.phase == "gone":
		return -L
	return -L * (1.0 - Util.ease_in_quad(minf(1.0, h.t / h["in"])))


func _sfx(sfx_name: String, vol: float, rate: float = 1.0) -> void:
	if not visible or alpha <= 0:
		return
	Sound.play(sfx_name, vol * (1.0 if is_player else 0.6), rate, 0.08)


## Soft dust puffs around the feet.
func puff(x: float, y: float, n: int) -> void:
	var k := char_scale
	var r := Rng.shared
	for i in n:
		var a := float(i) / n * TAU + r.range_f(-0.3, 0.3)
		var sp := r.range_f(50, 90) * k
		var life := r.range_f(0.38, 0.52)
		motes.append({"kind": "puff", "x": x + cos(a) * 14 * k, "y": y - 4 + sin(a) * 4 * k,
			"vx": cos(a) * sp, "vy": sin(a) * sp * 0.3 - 8, "life": life, "max": life, "size": r.range_f(8, 12) * k})


## Glints along an arc from where we were to where we're going, laid down over the gap.
func _emit_glints(h: Dictionary, all: bool) -> void:
	var d := Vector2(h.fx, h.fy).distance_to(Vector2(h.tx, h.ty))
	var n := roundi(clampf(d / 70.0, 3, 16))
	var upto := n if all else int(floor(n * minf(1.0, h.t / h.gap)))
	var hh := disp_h() * 0.55
	var p0 := Vector2(h.fx, h.fy - hh)
	var p1 := Vector2(h.tx, h.ty - hh)
	var c := Vector2((p0.x + p1.x) / 2.0, minf(p0.y, p1.y) - minf(150.0, 40.0 + d * 0.18))
	var r := Rng.shared
	while h.glints < upto:
		var u: float = (h.glints + 0.5) / n
		var v := 1.0 - u
		var life := 0.42 + u * 0.18
		var p := v * v * p0 + 2.0 * v * u * c + u * u * p1
		motes.append({"kind": "glint", "x": p.x, "y": p.y, "vx": r.range_f(-10, 10), "vy": r.range_f(-18, -4),
			"life": life, "max": life, "size": r.range_f(6, 10) * char_scale})
		h.glints += 1


func _step_motes(dt: float) -> void:
	var drag := exp(-4.0 * dt)
	for i in range(motes.size() - 1, -1, -1):
		var m := motes[i]
		m.life -= dt
		if m.life <= 0:
			motes.remove_at(i)
			continue
		m.vx *= drag
		m.vy *= drag
		m.x += m.vx * dt
		m.y += m.vy * dt
		if m.kind == "puff":
			m.size += 10.0 * dt * char_scale


# ------------------------------------------------------------------ update
## While a conversation or menu is open (paused), moves still finish on screen, so visitors take
## their places during a scene. The player's errands wait for the game to resume.
func update(dt: float, paused: bool = false) -> void:
	if _step_hop(dt):
		moving = false
		idle_t = 0.0
		if paused and is_player:
			arrived_paused = true
		else:
			_settle(true)
	_step_motes(dt)
	squash *= pow(0.001, dt)
	if not paused:
		if arrived_paused:
			arrived_paused = false
			_settle(true)
		breath += dt
		if emote_t > 0:
			emote_t -= dt
			emote_age += dt
			if emote_t <= 0:
				emote = ""
		if pose_timer > 0:
			pose_timer -= dt
			if pose_timer <= 0:
				pose = "idle"
		if moving:
			idle_t = 0.0
		else:
			idle_t += dt
	_update_visual()


## Which image and anchor to show right now: [texture, anchor x, scale].
func _frame() -> Array:
	if not is_player:
		var tex := Util.sprite(npc_sprite)
		return [tex, 0.5, disp_h() / (tex.get_height() if tex else 1.0)]
	var k := disp_h() / PLAYER_REF_H
	var p := pose
	if carrying and (p == "idle" or p == "look"):
		p = "carry"
	elif p == "idle" and idle_t < 2.5:
		p = "look"
	var def: Array = PLAYER_POSES.get(p, PLAYER_POSES.idle)
	var tex := Util.sprite(def[0])
	if tex == null:
		def = PLAYER_POSES.idle
		tex = Util.sprite(def[0])
	return [tex, def[1], k]


func _update_visual() -> void:
	if body == null:
		return
	var f := _frame()
	var tex: Texture2D = f[0]
	var pres := presence()
	_shadow = {}
	if tex == null or pres <= 0.01 or alpha <= 0:
		body.visible = false
	else:
		var lft := lift()
		var seen := minf(1.0, pres)
		# shadow: shrinks while the cut-out is edge-on or off the floor
		_shadow = {"a": 0.28 * alpha * (0.4 + 0.6 * seen),
			"rx": maxf(4.0, 42.0 * char_scale * scale_mul * (0.45 + 0.55 * seen) * (1.0 + lft / 90.0)),
			"ry": 9.0 * char_scale * (0.6 + 0.4 * seen)}
		var sy := 1.0 + (1.0 - seen) * 0.06 if not hop.is_empty() else 1.0 + sin(breath * 2.1) * 0.006
		sy -= squash
		var sx := (1.0 + squash * 0.6) * pres
		var lean := 0.0
		if not hop.is_empty() and hop.kind == "jump":
			var dir: float = signf(hop.tx - hop.fx) if hop.tx != hop.fx else float(facing)
			lean = (1.0 - seen) * 0.06 * dir
		var k: float = f[2]
		body.texture = tex
		body.centered = false
		body.offset = Vector2(-tex.get_width() * f[1], -tex.get_height())
		body.position = Vector2(0, lft)
		body.rotation = lean
		body.scale = Vector2(k * sx * (-1.0 if facing < 0 else 1.0), k * sy)
		body.modulate.a = alpha
		body.visible = true
	queue_redraw()
	motes_node.queue_redraw()


func _draw() -> void:
	if _shadow.is_empty():
		return
	draw_set_transform(Vector2(0, -2), 0.0, Vector2(1.0, _shadow.ry / _shadow.rx))
	draw_circle(Vector2.ZERO, _shadow.rx, Color(Color("#1a120c"), _shadow.a))
	draw_set_transform(Vector2.ZERO)


## The tap area (world px).
func bounds() -> Rect2:
	var h := disp_h()
	var w := hit_w * char_scale
	return Rect2(position.x - w / 2.0, position.y - h, w, h)


func near(x: float, y: float, d: float = 30.0) -> bool:
	return position.distance_to(Vector2(x, y)) < d
