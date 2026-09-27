class_name DayCard extends Control
## The words between days ("Week Two · Rinse · The offers start arriving in nicer envelopes.").

@onready var line1: Label = $VBox/Line1
@onready var line2: Label = $VBox/Line2
@onready var line3: Label = $VBox/Line3


func play(l1: String, l2: String, l3: String, secs: float) -> void:
	line1.text = l1
	line2.text = l2
	line3.text = l3
	modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 1.0, 0.6)
	await get_tree().create_timer(secs).timeout
	tw = create_tween()
	tw.tween_property(self, "modulate:a", 0.0, 0.8)
	await tw.finished
	queue_free()
