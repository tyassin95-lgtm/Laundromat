class_name GlassRain extends Node2D
## Rain seen through a window. This node draws the drops on the glass itself (put it after the
## room's painting): small beads that sit and gather, and every so often one grows heavy and runs
## down, leaving a thin wet trail. A GlassRainOutside node draws the rain falling outside, behind
## the glass, from the same simulation.

## The window panes, in world px.
@export var panes: Array[Rect2] = []
## 0 (dry) .. 1 (storm)
@export var intensity := 0.0

var beads: Array[Dictionary] = []
var runs: Array[Dictionary] = []
var streaks: Array[Dictionary] = []
var t := 0.0
var _r := Rng.shared


func _area() -> float:
	var a := 0.0
	for p in panes:
		a += p.size.x * p.size.y
	return a


func _bead(i: int) -> Dictionary:
	var p := panes[i]
	return {"r": i, "x": p.position.x + _r.next() * p.size.x, "y": p.position.y + _r.next() * p.size.y, "s": _r.range_f(0.7, 1.9)}


func _pane() -> int:
	return _r.range_i(0, panes.size() - 1)


func update(dt: float) -> void:
	t += dt
	var k := intensity
	if k <= 0 or panes.is_empty():
		beads.clear()
		runs.clear()
		streaks.clear()
		queue_redraw()
		return
	var want := roundi(_area() / 900.0 * k)
	while beads.size() < want:
		beads.append(_bead(_pane()))
	if beads.size() > want:
		beads.resize(want)
	# a bead now and then gets heavy and runs
	if _r.next() < dt * 1.6 * k and runs.size() < 14:
		var i := _pane()
		var p := panes[i]
		runs.append({"r": i, "x": p.position.x + _r.next() * p.size.x, "y": p.position.y + _r.next() * p.size.y * 0.4, "v": 0.0, "s": _r.range_f(1.8, 3.2), "trail": [], "hold": _r.range_f(0, 0.6)})
	for j in range(runs.size() - 1, -1, -1):
		var d := runs[j]
		d.hold -= dt
		if d.hold > 0:
			continue
		# runs in little surges: it sticks, lets go, sticks again
		if _r.next() < dt * 1.5:
			d.hold = _r.range_f(0.05, 0.35)
		d.v = minf(160.0, d.v + 260.0 * dt)
		d.y += d.v * dt
		d.x += (_r.next() - 0.5) * 10 * dt
		d.trail.append({"x": d.x, "y": d.y, "t": t})
		while not d.trail.is_empty() and t - d.trail[0].t > 1.6:
			d.trail.pop_front()
		var pane := panes[d.r]
		if d.y > pane.end.y + 4:
			runs.remove_at(j)
		else:
			for b in beads:
				if b.r == d.r and absf(b.x - d.x) < d.s + 1 and absf(b.y - d.y) < 3:
					b.merge(_bead(b.r), true)
					b.y = panes[b.r].position.y + _r.next() * panes[b.r].size.y * 0.3
	var want_streaks := roundi(_area() / 2600.0 * k)
	while streaks.size() < want_streaks:
		var i := _pane()
		var p := panes[i]
		streaks.append({"r": i, "x": p.position.x + _r.next() * (p.size.x + 40), "y": p.position.y - _r.next() * p.size.y, "v": _r.range_f(520, 820), "len": _r.range_f(14, 30), "a": _r.range_f(0.18, 0.4)})
	if streaks.size() > want_streaks:
		streaks.resize(want_streaks)
	for s in streaks:
		var p := panes[s.r]
		s.y += s.v * dt
		s.x -= s.v * 0.12 * dt
		if s.y - s.len > p.end.y:
			s.y = p.position.y - _r.next() * 40
			s.x = p.position.x + _r.next() * (p.size.x + 40)
	queue_redraw()


func _draw() -> void:
	if intensity <= 0:
		return
	for i in panes.size():
		var p := panes[i]
		# a faint film of water and mist low on the glass
		var top := p.position.y + p.size.y * 0.55
		var film := PackedVector2Array([Vector2(p.position.x, top), Vector2(p.end.x, top), p.end, Vector2(p.position.x, p.end.y)])
		var clear := Color(220 / 255.0, 230 / 255.0, 238 / 255.0, 0.0)
		var mist := Color(220 / 255.0, 230 / 255.0, 238 / 255.0, 0.16 * intensity)
		draw_polygon(film, PackedColorArray([clear, clear, mist, mist]))
	for b in beads:
		if not panes[b.r].has_point(Vector2(b.x, b.y)):
			continue
		draw_set_transform(Vector2(b.x, b.y + b.s * 0.15), 0.0, Vector2(1, 1.1))
		draw_circle(Vector2.ZERO, b.s, Color(28 / 255.0, 40 / 255.0, 52 / 255.0, 0.28))
		draw_set_transform(Vector2.ZERO)
		draw_circle(Vector2(b.x - b.s * 0.35, b.y - b.s * 0.4), maxf(0.45, b.s * 0.32), Color(1, 1, 1, 0.55))
	for d in runs:
		var pane := panes[d.r]
		var trail: Array = d.trail
		for k in range(1, trail.size()):
			var p0: Dictionary = trail[k - 1]
			var p1: Dictionary = trail[k]
			if p1.y > pane.end.y:
				break
			var a := 1.0 - (t - p1.t) / 1.6
			draw_line(Vector2(p0.x, p0.y), Vector2(p1.x, p1.y), Color(200 / 255.0, 218 / 255.0, 232 / 255.0, 0.22 * a), d.s * 0.55, true)
		if d.y <= pane.end.y:
			draw_set_transform(Vector2(d.x, d.y), 0.0, Vector2(1, 1.25 / 0.85))
			draw_circle(Vector2.ZERO, d.s * 0.85, Color(24 / 255.0, 36 / 255.0, 48 / 255.0, 0.34))
			draw_set_transform(Vector2.ZERO)
			draw_circle(Vector2(d.x - d.s * 0.3, d.y - d.s * 0.5), d.s * 0.3, Color(1, 1, 1, 0.7))
