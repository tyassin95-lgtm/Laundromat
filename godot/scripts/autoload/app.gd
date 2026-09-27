extends Node
## The director: switches between places (with a fade), knows when the game is paused behind a
## conversation or a menu, and runs the title menu, new game and continue flows.
## Autoloaded as App. The main scene (scenes/main.tscn) registers itself with start().

var main: Node                   # scenes/main.tscn
var camera: GameCamera           # the one camera, owned by the main scene
var location: Location           # the place on screen (a scene from scenes/world/)
var ui_block := 0                # > 0 while a script or minigame holds the game
var switching := false
var time_scale := 1.0


func start(main_scene: Node) -> void:
	main = main_scene
	camera = main.get_node("Camera")
	await set_scene("title")
	show_title_menu()


func _process(delta: float) -> void:
	var dt := minf(0.05, maxf(0.0, delta)) * time_scale
	if location == null:
		return
	location.update(dt)
	camera.apply()
	if location.scene_kind != "title":
		Quests.update(dt)
		G.play_seconds += dt


## True while the world should hold still (a conversation, a menu, a minigame...).
func paused() -> bool:
	return ui_block > 0 or UI.has_modal() or UI.dialogue.is_open() or UI.has_overlay()


func wait(seconds: float) -> void:
	await get_tree().create_timer(maxf(0.0, seconds)).timeout


# ------------------------------------------------------------------ places
func set_scene(place: String, opts: Dictionary = {}) -> void:
	if location:
		location.exit()
		location.queue_free()
		location = null
	var path: String = LocationsData.SCENES.get(place, "")
	var packed: PackedScene = load(path)
	location = packed.instantiate()
	camera.reset()
	main.get_node("World").add_child(location)
	await location.enter(opts)


## Scene change with a fade (unless the caller already faded: opts.no_fade).
func go(place: String, opts: Dictionary = {}) -> void:
	switching = true
	UI.close_context_menu()
	if not opts.get("no_fade", false):
		await UI.fade_out(0.35)
	await set_scene(place, opts)
	switching = false
	if not opts.get("no_fade", false):
		await UI.fade_in(0.35)


# ------------------------------------------------------------------ input from the main scene
func on_tap(screen_pos: Vector2) -> void:
	if not paused() and location and not switching:
		location.on_tap(screen_pos)


func on_drag(dx: float) -> void:
	if not paused() and location and location.scene_kind != "title":
		location.pan(dx)


# ------------------------------------------------------------------ title & game start
func show_title_menu() -> void:
	UI.title_menu.open(SaveGame.peek(), SaveGame.has_checkpoint())


func to_title() -> void:
	UI.close_all()
	UI.dialogue.close()
	ui_block = 0
	await UI.fade_out(0.5)
	UI.hud.set_mode("hidden")
	UI.hud.set_goal("")
	await set_scene("title")
	await UI.fade_in(0.6)
	show_title_menu()


func new_game(has_save: bool) -> void:
	if has_save:
		var ok: bool = await UI.confirm("Start over?", "This replaces your current save.", "Start fresh", "Cancel")
		if not ok:
			return
	var player_name: String = await UI.ask_name()
	if player_name == "":
		return
	SaveGame.wipe()
	G.reset(player_name)
	UI.title_menu.close()
	await _prologue()


func _prologue() -> void:
	Sound.music("title", 1.5)
	await Story.play("prologue")
	await UI.fade_out(0.9)
	await Day.morning(false)
	await UI.fade_in(0.8)


## After selling, go back to the morning of the final decision.
func rewind() -> void:
	if not SaveGame.restore_checkpoint():
		UI.toast("Nothing to rewind to.", "", "bad")
		return
	await continue_game()


func continue_game() -> void:
	if not SaveGame.load_game():
		UI.toast("That save could not be read.", "", "bad")
		return
	UI.title_menu.close()
	Laundry.ensure_machine_fields()
	await UI.fade_out(0.5)
	if G.phase == "shift" and not G.sim_save.is_empty():
		Laundry.from_save(G.sim_save)
		G.location = "laundromat"
		await set_scene("laundromat", {"from": "backdoor"})
		UI.hud.set_mode("shift")
	elif G.phase == "morning" or G.phase == "shift":
		G.phase = "morning"
		await Day.morning(true)
	else:
		var loc := G.location if G.location != "" else "home"
		if loc == "home":
			await set_scene("home", {"from": "door"})
		elif loc == "laundromat":
			await set_scene("laundromat", {"from": "front"})
		else:
			await set_scene(loc)
	UI.hud.set_goal(G.goal)
	UI.hud.refresh()
	await UI.fade_in(0.6)
	UI.toast("Welcome back, %s. %s · %s" % [G.player_name, G.date_label(), Util.money(G.money)], "icon_home")


func save_mid_shift() -> void:
	G.sim_save = Laundry.to_save()
	SaveGame.save()


# ------------------------------------------------------------------ platform
func _notification(what: int) -> void:
	match what:
		NOTIFICATION_APPLICATION_PAUSED, NOTIFICATION_WM_CLOSE_REQUEST:
			on_pause()
		NOTIFICATION_WM_GO_BACK_REQUEST:
			on_back()


func on_pause() -> void:
	if location and location.scene_kind != "title" and G.ending != "sold":
		if G.phase == "shift":
			save_mid_shift()
		else:
			SaveGame.save()


## Android back button (or Escape).
func on_back() -> void:
	if UI.close_context_menu():
		return
	if UI.has_overlay():
		return
	if UI.dialogue.is_open():
		UI.dialogue.tap()
		return
	if UI.back():
		return
	if location and location.scene_kind == "title":
		var leave: bool = await UI.confirm("Leave the laundromat?", "Your progress is saved.", "Exit", "Stay")
		if leave:
			get_tree().quit()
		return
	UI.menus.open_pause()
