class_name PickupShelf extends Node2D
## The pickup shelf against the wall: finished orders wait on its three boards, three to a board,
## until their owners come by. (The Wi-Fi box sits on top once you buy it.)

const BAGS := {"item_drawstring_bag": "scn_bag_drawstring", "item_tote_bag": "scn_bag_tote", "item_hamper": "scn_bag_hamper", "item_wicker_basket": "scn_bag_basket"}
## Where things stand on each board, as a fraction of the shelf's height from its top.
@export var boards := PackedFloat32Array([0.113, 0.383, 0.658])

@onready var shelf: Sprite2D = $Shelf
@onready var wifi: Sprite2D = $Wifi
@onready var wifi_led: Node2D = $Wifi/Led


## The shelf sprite's box in this node's coordinates.
func box() -> Rect2:
	var s := shelf.texture.get_size() * shelf.scale
	return Rect2(shelf.position + shelf.offset * shelf.scale, s)


func refresh(t: float) -> void:
	wifi.visible = "wifi" in G.upgrades
	wifi_led.visible = sin(t * 3.0) > 0.6
	queue_redraw()


func _draw() -> void:
	pass


func items() -> Array:
	var out := []
	var b := box()
	var ready := []
	for id in G.shelf:
		var o := Laundry.order(id)
		if not o.is_empty():
			ready.append(o)
	for i in mini(9, ready.size()):
		var o: Dictionary = ready[i]
		var board := boards[2 - i / 3]
		var x := b.position.x + b.size.x * (0.24 + (i % 3) * 0.26)
		var y := b.position.y + b.size.y * board + 1.0
		var folded := "scn_towels" if int(String(o.id).substr(1)) % 2 == 1 else "scn_folded"
		if o.service == "wash_dry":
			out.append([BAGS.get(o.bag, "scn_bag_drawstring"), Vector2(x, y), 38.0])
		else:
			out.append([folded, Vector2(x, y), 26.0])
	return out
