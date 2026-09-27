extends Node2D
## The wall clock tells the game's time: an hour hand and a minute hand, nothing else.


func _process(_dt: float) -> void:
	var t := G.time
	$Hour.rotation = fmod(t / 60.0, 12.0) / 12.0 * TAU
	$Minute.rotation = fmod(t, 60.0) / 60.0 * TAU
