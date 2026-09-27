class_name GlassRainOutside extends Node2D
## The rain falling outside a window, behind the glass (put it after the window view and before
## the room's painting, so the window frames cover it). It draws the streaks of a GlassRain.

@export var rain: GlassRain


func _process(_dt: float) -> void:
	queue_redraw()


func _draw() -> void:
	if rain == null or rain.intensity <= 0:
		return
	for s in rain.streaks:
		var p: Rect2 = rain.panes[s.r]
		var a := Vector2(s.x, s.y)
		var b := Vector2(s.x + s.len * 0.12, s.y - s.len)
		var seg := _clip(a, b, p)
		if seg.is_empty():
			continue
		draw_line(seg[0], seg[1], Color(214 / 255.0, 226 / 255.0, 238 / 255.0, s.a * rain.intensity), 1.1, true)


## The part of the segment a-b inside rect r (Liang-Barsky), or [].
static func _clip(a: Vector2, b: Vector2, r: Rect2) -> Array:
	var d := b - a
	var t0 := 0.0
	var t1 := 1.0
	var ps := [-d.x, d.x, -d.y, d.y]
	var qs := [a.x - r.position.x, r.end.x - a.x, a.y - r.position.y, r.end.y - a.y]
	for i in 4:
		if ps[i] == 0:
			if qs[i] < 0:
				return []
			continue
		var u: float = qs[i] / ps[i]
		if ps[i] < 0:
			t0 = maxf(t0, u)
		else:
			t1 = minf(t1, u)
		if t0 > t1:
			return []
	return [a + d * t0, a + d * t1]
