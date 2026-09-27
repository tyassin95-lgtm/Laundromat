class_name Lighting extends Node
## Lights the scene the way the painted rooms expect: a lightmap (the ambient colour plus a soft
## pool for every active SceneLight) is painted at quarter resolution into LightViewport, then
## laid over the whole screen with a multiply blend (the Lightmap rect on its own canvas layer).
## Things drawn on later layers (glows, emotes, the UI) aren't darkened.

const Q := 0.25                        # lightmap resolution

@onready var viewport: SubViewport = $LightViewport
@onready var painter: LightPainter = $LightViewport/Painter
@onready var overlay: TextureRect = $Layer/Lightmap


func _process(_dt: float) -> void:
	var loc := App.location
	if loc == null:
		overlay.visible = false
		return
	var cam := App.camera
	var vw := cam.vw()
	var size := Vector2i(ceili(vw * Q), ceili(Util.VH * Q))
	if viewport.size != size:
		viewport.size = size
	var st := loc.light_state()
	var amb: Color = st.ambient
	if amb.r8 >= 254 and amb.g8 >= 254 and amb.b8 >= 254 and st.lights.is_empty():
		overlay.visible = false
		return
	overlay.visible = true
	var lights := []
	var z := cam.zoom_k
	for l: Dictionary in st.lights:
		var s := cam.to_screen(l.pos) * Q
		var r: float = l.radius * Q * z
		if s.x + r < 0 or s.x - r > size.x:
			continue
		lights.append({"pos": s, "radius": r, "color": l.color, "intensity": clampf(l.intensity, 0.0, 2.0), "squash": l.squash})
	painter.ambient = amb
	painter.lights = lights
	painter.queue_redraw()
