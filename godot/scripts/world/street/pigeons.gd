extends Node2D
## Pigeons strutting about in the park: they hop, peck, and fly off when you come close.

## Where they gather (x from, x to, ground y from, ground y to).
@export var area := Rect2(1080, 624, 160, 30)

var birds: Array[Dictionary] = []


func _ready() -> void:
	var r := Rng.shared
	for i in 7:
		birds.append({"x": area.position.x + i * 22 + r.next() * 30, "y": area.position.y + r.next() * area.size.y, "hop": r.next() * 3, "f": 1 if r.next() < 0.5 else -1, "peck": 0.0, "jump": 0.0, "fly": 0.0})


## Tossed crumbs: everyone hops at once.
func feed() -> void:
	for b in birds:
		b.hop = 0.0


func bird_at(p: Vector2) -> Dictionary:
	for b in birds:
		if absf(p.x - b.x) < 30 and absf(p.y - b.y) < 24:
			return b
	return {}


func update(dt: float, player: Actor) -> void:
	var r := Rng.shared
	for b in birds:
		b.hop -= dt
		if b.hop < 0:
			b.hop = r.range_f(0.6, 2.4)
			if r.next() < 0.45:
				b.peck = r.range_f(0.4, 1.1)
			else:
				b.x += r.range_f(-18, 18)
				b.f = 1 if r.next() < 0.5 else -1
				b.jump = 0.2
		if b.peck > 0:
			b.peck -= dt
		if b.jump > 0:
			b.jump -= dt
		if player and absf(player.position.x - b.x) < 70 and absf(player.position.y - b.y) < 40 and player.moving:
			b.fly = 1.0
		if b.fly > 0:
			b.fly -= dt
			b.y -= 160 * dt
			b.x += 90 * b.f * dt
			if b.fly <= 0:
				b.fly = 0.0
				b.y = area.position.y + r.next() * area.size.y
				b.x = area.position.x - 20 + r.next() * 180
	queue_redraw()


func _draw() -> void:
	var t: float = App.location.t if App.location else 0.0
	for b in birds:
		var hop := sin(b.jump / 0.2 * PI) * 6.0 if b.jump > 0 else 0.0
		var s := "pigeon_stand"
		if b.fly > 0:
			s = "pigeon_fly_up" if sin(t * 22 + b.x) > 0 else "pigeon_fly_down"
		elif b.peck > 0:
			s = "pigeon_peck"
		var tex := Util.sprite(s)
		if tex == null:
			continue
		var h := 26.0 if s == "pigeon_stand" else 19.0 if s == "pigeon_peck" else 30.0
		var w := h * tex.get_width() / tex.get_height()
		draw_set_transform(Vector2(b.x, b.y - hop), 0.0, Vector2(-1.0 if b.f < 0 else 1.0, 1.0))
		draw_texture_rect(tex, Rect2(-w / 2.0, -h, w, h), false)
		draw_set_transform(Vector2.ZERO)
