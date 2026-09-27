extends TextureRect
## Choosing a gift: what you have that can be given, in the six wells of the gift box, a page at
## a time. picked(item) with the item id ("" = none).

signal picked(item: String)

const SLOT := preload("res://scenes/ui/gift_slot.tscn")
## The wells painted on ui_slots.webp (left, top, width, height as fractions).
const WELLS := [[0.1171, 0.1809, 0.2098, 0.2839], [0.3881, 0.1809, 0.215, 0.2839], [0.6643, 0.1809, 0.215, 0.2839],
	[0.1189, 0.5452, 0.2098, 0.2839], [0.3899, 0.5452, 0.2115, 0.2839], [0.6643, 0.5452, 0.2133, 0.2839]]

var items := []
var page := 0

@onready var title_label: Label = $Title
@onready var wells: Control = $Wells
@onready var prev_button: PillButton = $Pager/Prev
@onready var next_button: PillButton = $Pager/Next


func _ready() -> void:
	var vw := get_viewport_rect().size.x
	var w := minf(minf(736.0, vw * 0.9), Util.VH * 0.8 * 572.0 / 398.0)
	custom_minimum_size = Vector2(w, w * 398.0 / 572.0)
	prev_button.pressed.connect(func() -> void:
		page = maxi(0, page - 1)
		_render())
	next_button.pressed.connect(func() -> void:
		page = mini(ceili(items.size() / 6.0) - 1, page + 1)
		_render())


func setup(who: String, gift_items: Array) -> void:
	title_label.text = "A gift for %s" % CharactersData.display_name(who)
	items = gift_items
	$Pager.visible = items.size() > 6
	_render.call_deferred()


func _render() -> void:
	for c in wells.get_children():
		c.queue_free()
	var sz := size if size.x > 0 else custom_minimum_size
	var slice := items.slice(page * 6, page * 6 + 6)
	for i in slice.size():
		var k: String = slice[i][0]
		var s: GiftSlot = SLOT.instantiate()
		wells.add_child(s)
		var wr: Array = WELLS[i]
		s.position = Vector2(wr[0] * sz.x, wr[1] * sz.y)
		s.size = Vector2(wr[2] * sz.x, wr[3] * sz.y)
		s.setup(k, slice[i][1])
		s.pressed.connect(func() -> void: picked.emit(k))
