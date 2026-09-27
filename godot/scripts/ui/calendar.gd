extends TextureRect
## The wall calendar: September, today marked, bills on Sundays and what's coming up.

const CELL := preload("res://scenes/ui/calendar_cell.tscn")

@onready var cells: GridContainer = $Cells


func _ready() -> void:
	var vw := get_viewport_rect().size.x
	var w := minf(minf(896.0, vw * 0.94), Util.VH * 0.92 * 536.0 / 405.0)
	custom_minimum_size = Vector2(w, w * 405.0 / 536.0)
	for d in range(1, 31):
		var c: CalendarCell = CELL.instantiate()
		cells.add_child(c)
		var events := []
		if G.weekday(d) == 6:
			events.append("Bills · closed")
		for m: Dictionary in StoryData.CALENDAR_MARKS:
			if m.day == d and (not m.has("flag") or G.flag(m.flag)):
				events.append(m.text)
		c.setup("%s %d" % [G.WEEKDAYS[G.weekday(d)].substr(0, 2), d], events, d == G.day, d < G.day)
