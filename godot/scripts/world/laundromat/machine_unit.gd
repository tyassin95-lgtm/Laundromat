class_name MachineUnit extends Node2D
## One washer bay, or one dryer tower with its two drums (washer.tscn / dryer_tower.tscn).
## The node stands on the floor at the bay's middle. It shows whatever machine G.machines has in
## this bay: the model's art, the drums turning behind the glass, the door swinging open while
## you load it, the out-of-order sign, and a dashed outline when the bay is empty.

signal tapped(unit: MachineUnit, world_pos: Vector2)

@export_enum("washer", "dryer") var kind := "washer"
## Washer bay 0..4, or dryer tower 0..1.
@export var bay := 0
## Display height of the machine art (virtual px).
@export var height := 206.0

var t := 0.0
var _anim := {}        # machine id -> {t, dur}: the door swings open, then shut
var _drum := {}        # machine id -> {ang, dir, flip}: drum rotation

@onready var shake: Node2D = $Shake
@onready var body: Sprite2D = $Shake/Body
@onready var top_half: Sprite2D = get_node_or_null("Shake/TopHalf")
@onready var bottom_half: Sprite2D = get_node_or_null("Shake/BottomHalf")
@onready var drum_views: Array[DrumView] = [$Shake/Drum0, get_node_or_null("Shake/Drum1")]
@onready var glass_views: Array[MachineGlass] = [$Shake/Glass0, get_node_or_null("Shake/Glass1")]
@onready var broken_signs: Array[Sprite2D] = [$Shake/OutOfOrder0, get_node_or_null("Shake/OutOfOrder1")]
@onready var empty_bay: Node2D = $EmptyBay
@onready var lint_bunny: Sprite2D = get_node_or_null("LintBunny")
@onready var cat: Sprite2D = get_node_or_null("Cat")


func _ready() -> void:
	add_to_group("machine_units")
	$Tap.tapped.connect(func(p: Vector2) -> void: tapped.emit(self, p))


## The machines in this unit (a washer, or a tower's two drums), top drum first.
func machines() -> Array:
	var out := []
	for m in G.machines:
		if m.kind == kind and (m.slot == bay if kind == "washer" else int(m.slot) / 2 == bay):
			out.append(m)
	out.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.slot < b.slot)
	return out


func _art(m: Dictionary) -> Dictionary:
	return MachinesData.MACHINE_ART.get(Laundry.model_of(m).sprite, {"w": 200, "h": 330})


## The sprite box in this node's coordinates (feet at 0, 0).
func box(m: Dictionary) -> Rect2:
	var art := _art(m)
	var w: float = height * art.w / art.h
	return Rect2(-w / 2.0, -height, w, height)


## A machine's round door in local px: centre, glass radius, ring colour, hinge side. With open,
## the drum opening of the open-door art instead (it sits a little differently).
func door_local(m: Dictionary, open: bool = false) -> Dictionary:
	var b := box(m)
	var art := _art(m)
	var i: int = 0 if kind == "washer" else int(m.slot) % 2
	if open and art.has("open"):
		var o: Dictionary = art.open
		var od: Dictionary = o.doors[mini(o.doors.size() - 1, i)]
		var x0: float = b.position.x + o.dx * b.size.x
		var w: float = o.w * b.size.x
		return {"c": Vector2(x0 + od.cx * w, b.position.y + od.cy * b.size.y), "r": od.r * w, "open": true}
	var doors: Array = art.get("doors", [{"cx": 0.5, "cy": 0.55, "r": 0.27, "ring": "#999", "hinge": -1}])
	var d: Dictionary = doors[mini(doors.size() - 1, i)]
	return {"c": Vector2(b.position.x + d.cx * b.size.x, b.position.y + d.cy * b.size.y), "r": d.r * b.size.x, "ring": d.ring, "hinge": d.hinge}


## The door in world px: {cx, cy, r}.
func door_geom(m: Dictionary, open: bool = false) -> Dictionary:
	var d := door_local(m, open)
	var c: Vector2 = position + d.c
	return {"cx": c.x, "cy": c.y, "r": d.r}


## Top middle of a machine (or of its drum, for dryers): where its indicator floats. World px.
func top(m: Dictionary) -> Vector2:
	var b := box(m)
	if kind == "washer":
		return position + Vector2(0, b.position.y)
	var g := door_geom(m)
	return Vector2(position.x, g.cy - g.r * 1.9)


## Where a machine's progress ring or status bubble floats: over a washer; beside a dryer drum.
func indicator_at(m: Dictionary) -> Vector2:
	if kind == "washer":
		return top(m) - Vector2(0, 24)
	var g := door_geom(m)
	return Vector2(g.cx + g.r + 22, g.cy - g.r * 0.35)


func open_door(id: String, dur: float) -> void:
	_anim[id] = {"t": 0.0, "dur": dur}


func is_door_open(m: Dictionary) -> bool:
	var a: Dictionary = _anim.get(m.id, {})
	return not a.is_empty() and a.t < a.dur


## Where a running machine is in its cycle. Washers fill, wash (back and forth), drain and spin;
## dryers tumble, then cool down.
static func phase(m: Dictionary) -> Dictionary:
	var p: float = m.t / m.dur if m.dur > 0 else 0.0
	if m.kind == "dryer":
		if p < 0.88:
			return {"name": "tumble", "water": 0.0, "speed": 3.1, "heat": 1.0}
		return {"name": "cool", "water": 0.0, "speed": 1.8, "heat": 1.0 - (p - 0.88) / 0.12}
	if p < 0.08:
		return {"name": "fill", "water": p / 0.08 * 0.42, "speed": 1.2, "heat": 0.0}
	if p < 0.62:
		return {"name": "wash", "water": 0.42, "speed": 2.3, "heat": 0.0}
	if p < 0.7:
		return {"name": "drain", "water": 0.42 * (1.0 - (p - 0.62) / 0.08), "speed": 1.5, "heat": 0.0}
	if p < 0.96:
		return {"name": "spin", "water": 0.0, "speed": 3.0 + minf(1.0, (p - 0.7) / 0.06) * 15.0, "heat": 0.0}
	return {"name": "stop", "water": 0.0, "speed": 3.0 * (1.0 - (p - 0.96) / 0.04), "heat": 0.0}


static func running(m: Dictionary) -> bool:
	return m.state == "running" and not m.broken


func update(dt: float, particles: Particles) -> void:
	t += dt
	for k in _anim.keys():
		_anim[k].t += dt
		if _anim[k].t >= _anim[k].dur:
			_anim.erase(k)
	var ms := machines()
	for m in ms:
		var run := running(m)
		if not _drum.has(m.id):
			_drum[m.id] = {"ang": randf() * 6.0, "dir": 1.0, "flip": 3.0}
		var d: Dictionary = _drum[m.id]
		if run:
			var ph := phase(m)
			d.flip -= dt
			if ph.name == "wash" and d.flip <= 0:
				d.dir = -d.dir
				d.flip = Rng.shared.range_f(2.5, 4.5)
			if ph.name != "wash":
				d.dir = 1.0
			d.ang += d.dir * ph.speed * dt
		if m.broken and randf() < dt * 0.8:
			var g := door_geom(m)
			particles.emit("smoke", g.cx + 10, g.cy - g.r, 1)
		if run and m.kind == "washer" and phase(m).water > 0.2 and randf() < dt * 0.6:
			var g := door_geom(m)
			particles.emit("bubble", g.cx + (randf() - 0.5) * g.r, g.cy - g.r * 0.2, 1, {"override": {"life": 0.8}})
	_refresh(ms)


func _refresh(ms: Array) -> void:
	var empty := ms.is_empty()
	empty_bay.visible = empty
	shake.visible = not empty
	if lint_bunny:
		lint_bunny.visible = ms.any(func(d: Dictionary) -> bool: return d.lint >= 5 and not d.broken)
		lint_bunny.rotation = sin(t * 2.2 + bay) * 0.05
	if cat:
		cat.visible = bay == 0 and G.flag("cat_in_shop") and ms.any(func(d: Dictionary) -> bool: return running(d))
	queue_redraw()
	if empty:
		return
	var m: Dictionary = ms[0]
	var b := box(m)
	var art := _art(m)
	# a running machine rattles a little (harder on the spin)
	var sx := 0.0
	for d in ms:
		if running(d):
			var ph := phase(d)
			var amp := 1.5 if ph.name == "spin" else 0.6 if kind == "washer" else 0.45
			sx = sin(t * (55.0 if ph.name == "spin" else 30.0) + m.slot) * amp
			break
	shake.position.x = sx
	var closed_tex := Util.sprite(Laundry.model_of(m).sprite)
	var has_open: bool = art.has("open")
	var open_tex := Util.sprite(art.open.sprite) if has_open else null
	var open := []
	for d in ms:
		open.append(is_door_open(d) and has_open)
	var any_open: bool = open.has(true)
	var open_x := 0.0
	if has_open:
		open_x = b.position.x + (art.open.dx + art.open.w / 2.0) * b.size.x
	# the whole machine, or (a tower with a door open) each half on its own
	_place(body, open_tex if (any_open and kind == "washer") else closed_tex, open_x if (any_open and kind == "washer") else 0.0, 0.0, 1.0)
	body.visible = not (any_open and kind == "dryer")
	if top_half:
		top_half.visible = any_open and kind == "dryer"
		bottom_half.visible = top_half.visible
		if top_half.visible:
			var top_open := false
			var bottom_open := false
			for i in ms.size():
				if int(ms[i].slot) % 2 == 0:
					top_open = open[i]
				else:
					bottom_open = open[i]
			_place(top_half, open_tex if top_open else closed_tex, open_x if top_open else 0.0, 0.0, 0.465)
			_place(bottom_half, open_tex if bottom_open else closed_tex, open_x if bottom_open else 0.0, 0.465, 1.0)
	for i in 2:
		var dv := drum_views[i]
		if dv == null:
			continue
		var d: Dictionary = ms[i] if i < ms.size() else {}
		dv.visible = not d.is_empty()
		glass_views[i].visible = dv.visible and not open[i]
		broken_signs[i].visible = dv.visible and d.broken
		if d.is_empty():
			continue
		var g := door_local(d, open[i])
		var gc := door_local(d, false)
		dv.position = g.c
		dv.show_drum(d, g.r * 1.06, _drum.get(d.id, {"ang": 0.0}).ang, t)
		glass_views[i].position = gc.c
		glass_views[i].show_glass(d, gc.r)
		var sign := broken_signs[i]
		var st := sign.texture
		sign.position = gc.c + Vector2(-2, gc.r * 0.55)
		sign.scale = Vector2.ONE * (gc.r * 1.2 / st.get_height())


## Shows part of a machine's art (rows from v0 to v1 of its height) in a sprite, feet at the bay.
func _place(s: Sprite2D, tex: Texture2D, x: float, v0: float, v1: float) -> void:
	s.texture = tex
	s.centered = false
	var h := tex.get_height()
	var w := tex.get_width()
	s.region_enabled = v0 > 0.0 or v1 < 1.0
	s.region_rect = Rect2(0, h * v0, w, h * (v1 - v0))
	s.offset = Vector2(-w / 2.0, -h + h * v0)
	s.position = Vector2(x, 0)
	s.scale = Vector2.ONE * (height / h)


func _draw() -> void:
	var ms := machines()
	if ms.is_empty():
		return
	var b := box(ms[0])
	draw_set_transform(Vector2(0, 1), 0.0, Vector2(1, 5.0 / (b.size.x * 0.52)))
	draw_circle(Vector2.ZERO, b.size.x * 0.52, Color(Color("#1a120c"), 0.28))
	draw_set_transform(Vector2.ZERO)
