class_name ShopCounter extends Node2D
## The counter under the price board: bags that customers drop off wait on it (three show).

## Where things stand on the counter, as a fraction of its height from its top.
@export var top_fraction := 0.047

@onready var sprite: Sprite2D = $Counter


func box() -> Rect2:
	var s := sprite.texture.get_size() * sprite.scale
	return Rect2(sprite.position + sprite.offset * sprite.scale, s)


func top_y() -> float:
	var b := box()
	return b.position.y + b.size.y * top_fraction + 1.0


func items() -> Array:
	var out := []
	var waiting := G.orders.filter(func(o: Dictionary) -> bool: return o.stage == "counter")
	var n := mini(3, waiting.size())
	for i in n:
		var o: Dictionary = waiting[i]
		out.append([PickupShelf.BAGS.get(o.bag, "scn_bag_drawstring"), Vector2(18 + i * 38 - (n - 1) * 19, top_y()), 56.0])
	return out
