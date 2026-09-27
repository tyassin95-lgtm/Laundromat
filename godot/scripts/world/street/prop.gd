class_name Prop extends Node2D
## Something standing in an exterior: a lamp post, a tree, a bench, a sign... Its Sprite child is
## the art (its bottom middle on this node, unless anchored otherwise). Lamps, glows and tap areas
## that belong to it are children too.

## A script expression (see ScriptLang): the prop only shows while it's true.
@export var when := ""
## Trees sway gently, and turn autumn from day 16.
@export var tree := false
## Hides the far city lights behind it at night.
@export var occludes_sky := true
## What tapping it does (its Tap child): sign | mural | market, or nothing.
@export var tap_action := ""

var t := 0.0

@onready var sprite: Sprite2D = get_node_or_null("Sprite")


func _ready() -> void:
	add_to_group("props")


func refresh() -> void:
	visible = when == "" or Story.eval(when)
	if tree and sprite and G.day >= 16:
		var autumn := Util.sprite("street_tree_autumn")
		if autumn and sprite.texture != autumn:
			var h := sprite.texture.get_height() * sprite.scale.y
			sprite.texture = autumn
			sprite.offset = Vector2(-autumn.get_width() / 2.0, -autumn.get_height())
			sprite.scale = Vector2.ONE * (h / autumn.get_height())


func _process(dt: float) -> void:
	if tree:
		t += dt
		rotation = sin(t * 0.8 + position.x) * 0.006
