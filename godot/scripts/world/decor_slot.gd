class_name DecorSlot extends Node2D
## A place for a piece of decor in a room (a hook, a sill, a patch of floor...). It shows whatever
## G.placed has in slot_id, sized as DecorData.DECOR says, and is tappable when something's there.
## Lights and glows that belong to a lamp can be children (see SceneLight.needs_decor).

signal slot_tapped(slot: String, world_pos: Vector2)

@export var slot_id := ""
## stand: stands on the spot (bottom by default) · hang: hangs from a hook, swinging, its bottom
## at the spot · ceiling: hangs from the ceiling (top at ceiling_y) · flat: lies on the floor.
@export_enum("stand", "hang", "ceiling", "flat") var style := 0
## For "ceiling": world y of the top of the hanging piece.
@export var ceiling_y := 40.0
@export var sway_speed := 1.3
## Where the slot's spot is on the floor, from the node (a piece on a table: the table's feet).
@export var base_offset := Vector2.ZERO

var t := 0.0

@onready var item: Sprite2D = $Item
@onready var tap: TapArea = $Tap


func _ready() -> void:
	add_to_group("decor_slots")
	tap.tapped.connect(func(p: Vector2) -> void: slot_tapped.emit(slot_id, p))
	refresh()


func placed_id() -> String:
	return String(G.placed.get(slot_id, ""))


func floor_point() -> Vector2:
	return global_position + base_offset


func decor() -> Dictionary:
	return DecorData.DECOR.get(placed_id(), {})


func refresh() -> void:
	var d := decor()
	var tex := Util.sprite(d.get("sprite", ""))
	item.visible = tex != null
	tap.enabled = tex != null
	if tex == null:
		return
	var k: float = d.h / tex.get_height() if d.has("h") else d.w / tex.get_width()
	var size := tex.get_size() * k
	var ay: float = d.get("ay", 1.0)
	item.texture = tex
	item.centered = false
	item.scale = Vector2(k, k)
	item.rotation = 0.0
	item.modulate.a = 1.0
	var rect: Rect2
	match style:
		1:        # hang: rotates around the top, bottom at the spot
			item.offset = Vector2(-tex.get_width() / 2.0, 0)
			item.position = Vector2(0, -size.y)
			rect = Rect2(-size.x / 2.0, -size.y, size.x, size.y)
		2:        # ceiling: top at ceiling_y
			var top := ceiling_y - position.y
			item.offset = Vector2(-tex.get_width() / 2.0, 0)
			item.position = Vector2(0, top)
			rect = Rect2(-size.x / 2.0, top, size.x, size.y)
		3:        # flat on the floor
			item.offset = Vector2(-tex.get_width() / 2.0, -tex.get_height())
			item.position = Vector2.ZERO
			item.modulate.a = 0.96
			rect = Rect2(-size.x / 2.0, -size.y, size.x, size.y)
		_:
			item.offset = Vector2(-tex.get_width() / 2.0, -tex.get_height() * ay)
			item.position = Vector2.ZERO
			rect = Rect2(-size.x / 2.0, -size.y * ay, size.x, size.y)
	tap.set_rect(rect.grow(10.0))


func _process(dt: float) -> void:
	t += dt
	if not item.visible:
		return
	if style == 1:
		item.rotation = sin(t * sway_speed + global_position.x) * 0.02
	elif style == 2:
		item.rotation = sin(t * sway_speed) * 0.02
	var d := decor()
	if d.get("fn", "") == "tea" and App.location and App.location.scene_kind == "laundromat" and randf() < 0.02 * 60.0 * dt:
		App.location.particles.emit("steam", global_position.x - 10, global_position.y - float(d.get("h", 50)), 1)
