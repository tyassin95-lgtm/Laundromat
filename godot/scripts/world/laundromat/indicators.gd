extends Node2D
## Over the lit laundromat: progress rings and "ready" bubbles on the machines, the bell over the
## counter when bags are waiting, and gold arrows showing where the laundry you hold can go.

const FONT := preload("res://theme/fonts/fraunces_bold.tres")
const INK := Color("#3a2a1e")

var t := 0.0


func _process(dt: float) -> void:
	t += dt
	queue_redraw()


func _bubble(p: Vector2, icon: String, color: Color, label: String, bounce: bool) -> void:
	var y := p.y + (sin(t * 5.0) * 4.0 if bounce else 0.0)
	var c := Vector2(p.x, y)
	draw_circle(c, 19, color)
	draw_arc(c, 19, 0, TAU, 32, INK, 2.0, true)
	draw_colored_polygon(PackedVector2Array([c + Vector2(-6, 16), c + Vector2(0, 26), c + Vector2(6, 16)]), color)
	if icon != "":
		var tex := Util.sprite(icon)
		if tex:
			draw_texture_rect(tex, Rect2(c.x - 13, c.y - 13, 26, 26), false)
	if label != "":
		var w := FONT.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 18).x
		draw_string(FONT, Vector2(c.x - w / 2.0, c.y + 1 + (FONT.get_ascent(18) - FONT.get_descent(18)) / 2.0), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, INK)


func _ring(p: Vector2, progress: float, icon: String) -> void:
	draw_circle(p, 17, Color(247 / 255.0, 236 / 255.0, 212 / 255.0, 0.92))
	draw_arc(p, 14, 0, TAU, 32, Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.25), 4.0, true)
	draw_arc(p, 14, -PI / 2.0, -PI / 2.0 + TAU * clampf(progress, 0.0, 1.0), 32, Color("#3f6c74"), 4.0, true)
	var tex := Util.sprite(icon)
	if tex:
		draw_texture_rect(tex, Rect2(p.x - 9, p.y - 9, 18, 18), false)


func _hint(x: float, y: float) -> void:
	var pts := PackedVector2Array([Vector2(x - 12, y - 16), Vector2(x + 12, y - 16), Vector2(x, y)])
	draw_colored_polygon(pts, Color(232 / 255.0, 176 / 255.0, 78 / 255.0, 0.55 + 0.35 * sin(t * 6.0)))
	pts.append(pts[0])
	draw_polyline(pts, INK, 1.5, true)


func _draw() -> void:
	var loc := App.location as Laundromat
	if loc == null:
		return
	for m in G.machines:
		var unit := loc.unit_of(m)
		if unit == null:
			continue
		var p := unit.indicator_at(m)
		if m.broken:
			_bubble(p, "icon_wrench", Color("#f4c9b8"), "", true)
		elif m.state == "running":
			_ring(p, m.t / m.dur if m.dur > 0 else 0.0, "icon_coin" if m.load == "self" else ("icon_washer" if m.kind == "washer" else "icon_dryer"))
		elif m.state == "done" and m.load != "self":
			_bubble(p, "", Color("#e8d38a"), "✓", true)
		elif m.kind == "dryer" and m.lint >= 5:
			_bubble(p, "icon_dryer", Color("#ddd7cc"), "", false)
	# the counter bell
	if G.orders.any(func(o: Dictionary) -> bool: return o.stage == "counter"):
		_bubble(loc.bell_spot(), "icon_basket", Color("#f7ecd4"), "", true)
	# hints for the laundry you're holding
	var held := loc.carried()
	if held.is_empty():
		return
	var o: Dictionary = held[0]
	var step := Laundry.next_step(o)
	var bob := sin(t * 5.0) * 4.0
	# free machines of the right kind, or (hands full) finished ones you can swap with
	var full := not loc.can_carry_more()
	for m in G.machines:
		var ok: bool = Laundry.is_free(m) or (full and m.state == "done" and m.load != "" and m.load != "self" and not m.broken)
		if not ok:
			continue
		var unit := loc.unit_of(m)
		if step == "wash" and m.kind == "washer":
			var p := unit.top(m)
			_hint(p.x, p.y - 8 + bob)
		elif step == "dry" and m.kind == "dryer":
			var g := unit.door_geom(m)
			_hint(g.cx - g.r - 16, g.cy + bob)
	if step == "fold":
		var p := loc.fold_hint_spot()
		_hint(p.x, p.y + bob)
	if step == "shelf":
		var p := loc.shelf_hint_spot()
		_hint(p.x, p.y + bob)
	# what you're carrying
	var icon := "icon_washer" if step == "wash" else "icon_dryer" if step == "dry" else "icon_towels" if step == "fold" else "icon_basket"
	if loc.player.visible:
		_bubble(loc.player.position + Vector2(30, -290), icon, Color("#f7ecd4"), "", false)
