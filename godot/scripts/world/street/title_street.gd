extends Street
## The title screen: Linden Street at night, in the rain, the laundromat glowing. The menu itself
## is UI (UI.title_menu); this only sets the stage and drifts the camera. Thunder, now and then.

var drift := 0.0
var flash_t := 0.0


func time_now() -> float:
	return 22.0 * 60.0 + 10.0


func weather_now() -> String:
	return "rain"


func enter(_opts: Dictionary) -> void:
	await super({})
	for a: Actor in npcs.values():
		a.queue_free()
	npcs.clear()
	player.visible = false
	rain.intensity = 0.75
	cam().x = 560.0
	cam().zoom_k = 1.08
	drift = 0.0
	Sound.set_ambience({"amb_rain_out": 0.55, "amb_city": 0.2}, 2.0)
	Sound.music("title", 2.5)
	UI.hud.set_mode("hidden")


func on_tap(_screen_pos: Vector2) -> void:
	pass                                     # the menu handles input


func title_vignette() -> float:
	return 0.45


func flash_alpha() -> float:
	return clampf(flash_t * 1.2, 0.0, 1.0)


func update(dt: float) -> void:
	t += dt
	particles.update(dt)
	rain.update(dt)
	drift += dt
	var target := 870.0 - vw() / 2.0 + sin(drift * 0.05) * 60.0
	cam().x = Util.damp(cam().x, camera_clamp(target), 1.2, dt)
	cam().zoom_k = Util.damp(cam().zoom_k, 1.05, 0.5, dt)
	if randf() < dt * 0.05:
		Sound.play("thunder_far", 0.25)
		flash_t = 0.15
	if flash_t > 0:
		flash_t -= dt
	if bg_lights:
		bg_lights.modulate.a = night() * 0.5
		bg_lights.visible = true
