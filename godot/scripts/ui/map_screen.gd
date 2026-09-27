extends Control
## The neighbourhood map: a pin for each place, with the faces of friends you'd find there
## tonight and a "!" where something's waiting. Tap a pin to go.

signal travel(place: String)

const PIN := preload("res://scenes/ui/map_pin.tscn")

@onready var sheet: TextureRect = $Sheet
@onready var time_label: Label = $TimeBar/HBox/Time


func _ready() -> void:
	var vw := get_viewport_rect().size.x
	var w := minf(vw, Util.VH * 16.0 / 9.0)
	sheet.custom_minimum_size = Vector2(w, w * 9.0 / 16.0)
	sheet.size = sheet.custom_minimum_size
	sheet.position = (get_viewport_rect().size - sheet.size) / 2.0
	time_label.text = "%s · %s" % [G.date_label(), Util.clock_str(G.time)]
	for key: String in LocationsData.MAP_ORDER:
		var L: Dictionary = LocationsData.LOCATIONS[key]
		var pin: MapPin = PIN.instantiate()
		sheet.add_child(pin)
		pin.setup(key, L, key == G.location, UI.menus.who_is_at(key), Story.has_location_event(key))
		pin.position = Vector2(L.map[0] / 100.0 * sheet.size.x, L.map[1] / 100.0 * sheet.size.y)
		pin.chosen.connect(func(k: String) -> void: travel.emit(k))
