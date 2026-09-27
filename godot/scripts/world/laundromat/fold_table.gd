class_name FoldTable extends Node2D
## The folding table. While you fold, you're drawn standing at it (the Folder sprite); a neat
## stack shows what's been folded today.

@onready var folder: Sprite2D = $Folder
@onready var stack: Sprite2D = $Stack

var _anim := 0.0
var _folder_y := 0.0


func _ready() -> void:
	_folder_y = folder.position.y


func refresh(dt: float, folding: bool) -> void:
	folder.visible = folding
	if folding:
		_anim += dt
		folder.position.y = _folder_y + sin(_anim * 6.0) * 1.5 * 0.3
	else:
		_anim = 0.0
	stack.visible = int(G.today.get("orders", 0)) > 0
