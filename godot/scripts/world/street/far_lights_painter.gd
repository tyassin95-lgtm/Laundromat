extends Node2D
## Draws the far lights and the foreground's black silhouettes into FarLights' SubViewport.

var _lights := Util.background("skyline_lights")


func _draw() -> void:
	var fl := get_parent().get_parent()
	var loc := App.location
	if loc == null or _lights == null:
		return
	var k := 0.5
	var r: Rect2 = fl.backdrop.sky_rect()
	draw_texture_rect(_lights, Rect2(r.position * k, r.size * k), false)
	var cam := App.camera
	var z := cam.zoom_k
	var half := Vector2(cam.vw() / 2.0, Util.VH / 2.0)
	var world := Transform2D(0.0, Vector2(z, z) * k, 0.0, (-Vector2(cam.x, cam.y) * z + half * (1.0 - z)) * k)
	var black := Color(0, 0, 0, 1)
	var bg: Sprite2D = fl.background
	if bg and bg.texture:
		draw_set_transform_matrix(world * bg.global_transform)
		draw_texture_rect(bg.texture, Rect2(bg.offset, bg.texture.get_size()), false, black)
	# trees, lamp posts and signs stand in front of the far city too
	for node in get_tree().get_nodes_in_group("props"):
		var p := node as Prop
		if p == null or not loc.is_ancestor_of(p) or not p.is_visible_in_tree() or not p.occludes_sky or p.sprite == null:
			continue
		var s := p.sprite
		draw_set_transform_matrix(world * s.global_transform)
		var size := s.texture.get_size()
		draw_texture_rect(s.texture, Rect2(s.offset, size), false, black)
	draw_set_transform_matrix(Transform2D.IDENTITY)
