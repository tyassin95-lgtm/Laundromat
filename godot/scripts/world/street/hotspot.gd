class_name Hotspot extends TapArea
## A place in an exterior you can do something at (go into a shop, take a photo, sketch...).
## Tapping it walks you over and runs the activity (Activities.a_<act>). A little dot marks it.

@export var hotspot_id := ""
@export var label := ""
## The activity to run.
@export var act := ""
## For photos: which kind of photo you get (photo, photo_night, photo_garden).
@export var photo := ""
## For photos and sketches: what it's called in your collection.
@export var title := ""
## A script expression: the hotspot is only there while it's true.
@export var when := ""

const PAD := 6.0


func _ready() -> void:
	super()
	add_to_group("hotspots")


## The spot's own rectangle (world px), without the tap padding.
func rect() -> Rect2:
	var cs := get_child(0) as CollisionShape2D
	var size: Vector2 = (cs.shape as RectangleShape2D).size - Vector2(PAD, PAD) * 2.0
	return Rect2(cs.global_position - size / 2.0, size)


func info() -> Dictionary:
	var r := rect()
	return {"id": hotspot_id, "label": label, "act": act, "photo": photo, "title": title, "x": r.position.x, "y": r.position.y, "w": r.size.x, "h": r.size.y}
