class_name TapArea extends Area2D
## Something you can tap in the world: its CollisionShape2D children (rectangles or circles)
## are the hit area. When several overlap, the one with the highest priority wins.

signal tapped(world_pos: Vector2)

@export var priority := 0.0
@export var enabled := true


func _ready() -> void:
	add_to_group("tap_areas")
	monitoring = false
	monitorable = false
	input_pickable = false


func contains(p: Vector2) -> bool:
	for c in get_children():
		var cs := c as CollisionShape2D
		if cs == null or cs.disabled or cs.shape == null:
			continue
		var local := cs.global_transform.affine_inverse() * p
		if cs.shape is RectangleShape2D:
			var size: Vector2 = (cs.shape as RectangleShape2D).size
			if Rect2(-size / 2.0, size).has_point(local):
				return true
		elif cs.shape is CircleShape2D:
			if local.length() <= (cs.shape as CircleShape2D).radius:
				return true
	return false


## Makes the first shape a rectangle covering r (in this node's own coordinates).
func set_rect(r: Rect2) -> void:
	for c in get_children():
		var cs := c as CollisionShape2D
		if cs == null:
			continue
		var shape := cs.shape as RectangleShape2D
		if shape == null:
			shape = RectangleShape2D.new()
			cs.shape = shape
		shape.size = r.size
		cs.position = r.get_center()
		return
