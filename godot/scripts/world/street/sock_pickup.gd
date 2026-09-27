class_name SockPickup extends Node2D
## A lost sock lying about in an exterior, for the collection (from day 3, until you pick it up).

@export var sock_id := ""


func refresh() -> void:
	visible = G.day >= 3 and not sock_id in G.collections.socks
