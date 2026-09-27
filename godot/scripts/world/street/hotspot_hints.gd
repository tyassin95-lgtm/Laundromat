extends Node2D
## The little dots that mark hotspots near you in an exterior.


func _process(_dt: float) -> void:
	queue_redraw()


func _draw() -> void:
	var loc := App.location
	if loc == null or loc.player == null:
		return
	for node in get_tree().get_nodes_in_group("hotspots"):
		var h := node as Hotspot
		if h == null or not loc.is_ancestor_of(h) or not h.enabled or not h.is_visible_in_tree():
			continue
		var r := h.rect()
		var x := r.get_center().x
		var y := r.position.y - 8.0 + sin(loc.t * 3.0 + r.position.x) * 3.0
		if absf(x - loc.player.position.x) > 420:
			continue
		draw_circle(Vector2(x, y), 7, Color(Color("#f7ecd4"), 0.75))
		draw_arc(Vector2(x, y), 7, 0, TAU, 20, Color(Color("#3a2a1e"), 0.75), 1.5, true)
		draw_circle(Vector2(x, y), 3, Color(Color("#c4692e"), 0.75))
