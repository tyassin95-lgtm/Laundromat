class_name GiftSlot extends Button
## One gift in a well of the gift box: its picture, name and how many you have.

@onready var icon_rect: TextureRect = $VBox/Icon
@onready var name_label: Label = $VBox/Name
@onready var qty: Label = $VBox/Qty


func setup(item: String, n: Variant) -> void:
	var it: Dictionary = ItemsData.ITEMS[item]
	icon_rect.texture = Util.sprite(it.sprite)
	name_label.text = it.name
	qty.text = "×%d" % int(n)
