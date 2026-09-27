class_name SupplyShelf extends Node2D
## The wall shelf of supplies: detergent jugs (one per five loads, up to four), softener, spare
## parts and the tea tin show when you have them.

## The two boards, as fractions of the shelf's height from its top.
@export var boards := PackedFloat32Array([0.14, 0.613])

@onready var sprite: Sprite2D = $Shelf


func items() -> Array:
	var s := sprite.texture.get_size() * sprite.scale
	var b := Rect2(sprite.position + sprite.offset * sprite.scale, s)
	var top := b.position.y + b.size.y * boards[0] + 1.0
	var low := b.position.y + b.size.y * boards[1] + 1.0
	var out := []
	var jugs := mini(4, ceili(ceilf(float(G.inv.get("detergent", 0))) / 5.0))
	for i in jugs:
		out.append(["scn_detergent", Vector2(b.position.x + 20 + i * 24, top), 30.0])
	if float(G.inv.get("softener", 0)) > 0:
		out.append(["scn_softener", Vector2(b.position.x + 18, low), 28.0])
	if float(G.inv.get("parts", 0)) > 0:
		out.append(["scn_coin_tray", Vector2(b.position.x + 56, low), 12.0])
	if float(G.inv.get("tea", 0)) > 0:
		out.append(["scn_teacup", Vector2(b.position.x + 94, low), 16.0])
	return out
