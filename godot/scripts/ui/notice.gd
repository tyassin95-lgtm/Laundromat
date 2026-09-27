class_name Notice extends PanelContainer
## A paper notice (letters, summaries, questions). Its content is built from blocks, each a small
## scene in scenes/ui/blocks:
##   ["h2", text] · ["h3", text] · ["p", bbcode, align] · ["letter", bbcode, align]
##   ["corporate", logo, bbcode, signature] · ["row", left, right, style] · ["total", left, right, style]
##   ["shop_row", {img, name, desc, button, run, disabled}]
## (style: "" | "pos" | "neg"), then a row of buttons; chosen(value) says which was pressed.

signal chosen(value: Variant)

const HEADING := preload("res://scenes/ui/blocks/heading.tscn")
const SUBHEADING := preload("res://scenes/ui/blocks/subheading.tscn")
const TEXT := preload("res://scenes/ui/blocks/text_block.tscn")
const LETTER := preload("res://scenes/ui/blocks/letter_block.tscn")
const CORPORATE := preload("res://scenes/ui/blocks/corporate_block.tscn")
const ROW := preload("res://scenes/ui/blocks/summary_row.tscn")
const SHOP_ROW := preload("res://scenes/ui/blocks/shop_row.tscn")
const BUTTON := preload("res://scenes/ui/pill_button.tscn")

@onready var scroll: ScrollContainer = $VBox/Scroll
@onready var body: VBoxContainer = $VBox/Scroll/Body
@onready var actions: HFlowContainer = $VBox/Actions


func build(blocks: Array, buttons: Array) -> void:
	var vw := get_viewport_rect().size.x
	custom_minimum_size.x = minf(640.0, vw * 0.92)
	for b: Array in blocks:
		add_block(b)
	for b: Dictionary in buttons:
		var btn: PillButton = BUTTON.instantiate()
		btn.text = b.label
		btn.variant = "primary" if b.get("primary", false) else ""
		var value: Variant = b.get("value")
		btn.pressed.connect(func() -> void: chosen.emit(value))
		actions.add_child(btn)
	actions.visible = not buttons.is_empty()
	_fit.call_deferred()


func add_block(b: Array) -> Control:
	var c: Control
	match b[0]:
		"h2":
			c = HEADING.instantiate()
			c.text = b[1]
		"h3":
			c = SUBHEADING.instantiate()
			c.text = b[1]
		"p", "letter":
			c = (TEXT if b[0] == "p" else LETTER).instantiate()
			var align: String = b[2] if b.size() > 2 else ""
			c.text = ("[center]%s[/center]" % b[1]) if align == "center" else b[1]
		"corporate":
			c = CORPORATE.instantiate()
			c.setup(b[1], b[2], b[3] if b.size() > 3 else "")
		"row", "total":
			c = ROW.instantiate()
			c.setup(b[1], b[2], b[3] if b.size() > 3 else "", b[0] == "total")
		"shop_row":
			c = SHOP_ROW.instantiate()
			var d: Dictionary = b[1]
			c.setup(d.img, d.name, d.get("desc", ""), d.get("button", ""), d.get("run", Callable()), d.get("disabled", false))
	if c:
		body.add_child(c)
	return c


## Scroll only when the notice would be taller than the screen.
func _fit() -> void:
	await get_tree().process_frame
	var max_h := get_viewport_rect().size.y * 0.94 - 96.0 - actions.size.y
	scroll.custom_minimum_size.y = minf(body.get_combined_minimum_size().y, max_h)
