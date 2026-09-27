class_name Notebook extends TextureRect
## The notebook (the journal and the catalog): two pages and tabs down the right edge. Each tab
## fills the pages with a builder: a Callable taking (left: VBoxContainer, right: VBoxContainer).

const TAB := preload("res://scenes/ui/notebook_tab.tscn")

var _pages := {}             # key -> [label, builder]
var current := ""

@onready var left: VBoxContainer = $Left/Content
@onready var right: VBoxContainer = $Right/Content
@onready var left_scroll: ScrollContainer = $Left
@onready var right_scroll: ScrollContainer = $Right
@onready var tabs: VBoxContainer = $Tabs


func _ready() -> void:
	var vw := get_viewport_rect().size.x
	var w := minf(minf(1376.0, vw - 208.0), Util.VH * 0.94 * 592.0 / 410.0)
	custom_minimum_size = Vector2(w, w * 410.0 / 592.0)


## pages: [[key, label, builder], ...]
func setup(pages: Array, first: String) -> void:
	for p: Array in pages:
		_pages[p[0]] = [p[1], p[2]]
		var t: Button = TAB.instantiate()
		t.text = p[1]
		t.set_meta("key", p[0])
		t.pressed.connect(func() -> void:
			show_page(p[0])
			Sound.play("page", 0.5))
		tabs.add_child(t)
	show_page(first if _pages.has(first) else pages[0][0])


func show_page(key: String) -> void:
	current = key
	for t: Button in tabs.get_children():
		var on: bool = t.get_meta("key") == key
		t.button_pressed = on
		t.theme_type_variation = &"TabButtonOn" if on else &"TabButton"
	refresh()


## Rebuilds the pages (after buying something, say).
func refresh() -> void:
	for c in left.get_children() + right.get_children():
		c.get_parent().remove_child(c)
		c.queue_free()
	left_scroll.scroll_vertical = 0
	right_scroll.scroll_vertical = 0
	_pages[current][1].call(left, right)


func _process(_dt: float) -> void:
	# the tabs stick out past the notebook's right edge
	for t: Button in tabs.get_children():
		var on: bool = t.get_meta("key") == current
		t.position.x = t.size.x * (0.88 if on else 0.8)
