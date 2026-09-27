class_name WindowSeat extends Node2D
## The seat under the front window, where you catch your breath: the shop's bench, or the seat
## you've placed there instead (decor slot "seat"). While you rest, you're drawn sitting on it.

## sprite, height, and where you sit (a fraction of its height from the top).
const SEATS := {
	"bench": ["prop_bench", 72.0, 0.031],
	"plastic_chair": ["furn_plastic_chair", 130.0, 0.406],
	"stool": ["furn_stool", 84.0, 0.056],
	"double_bench": ["furn_double_bench", 87.0, 0.427],
}
const SIT_H := 450.0 * 262.0 / 490.0     # the sitting pose's height
const SIT_SEAT := 0.37                    # its seat line, up from its feet

@onready var seat: Sprite2D = $Seat
@onready var sitter: Sprite2D = $Sitter


func _seat() -> Array:
	return SEATS.get(G.placed.get("seat", ""), SEATS.bench)


func refresh(sitting: bool) -> void:
	var st := _seat()
	var tex := Util.sprite(st[0])
	seat.texture = tex
	seat.centered = false
	seat.offset = Vector2(-tex.get_width() / 2.0, -tex.get_height())
	seat.scale = Vector2.ONE * (st[1] / tex.get_height())
	sitter.visible = sitting
	if sitting:
		var top: float = -st[1] * (1.0 - st[2])
		sitter.position.y = top + SIT_H * SIT_SEAT
	var w: float = st[1] * tex.get_width() / tex.get_height()
	$Tap.set_rect(Rect2(-w / 2.0 - 6.0 - 10.0, -st[1] - 20.0 - 10.0, w + 12.0 + 20.0, st[1] + 20.0 + 20.0))
