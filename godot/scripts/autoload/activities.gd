extends Node
## Things to do at home and around the neighbourhood: hobbies, errands, collectibles.
## Autoloaded as Activities. run("sketch", {...}) plays the activity called a_sketch.


func _loc() -> Location:
	return App.location


func _pose(p: String, secs: float) -> void:
	var sc := _loc()
	if sc and sc.player:
		sc.player.set_pose(p, secs)


func _spend(minutes: float) -> void:
	Day.spend(minutes)


func run(act: String, o: Dictionary = {}) -> void:
	var method := "a_" + act
	if not has_method(method):
		push_warning("no activity " + act)
		return
	var played := await Story.trigger("act", {"act": act, "loc": o.get("loc", "")})
	if played and o.get("storyOnly", false):
		return
	await call(method, o)
	UI.hud.refresh()


# ------------------------------------------------------------------ home
func a_door(_o: Dictionary) -> void:
	if G.phase == "morning":
		if G.is_sunday() and not G.sunday_open():
			var go_out: bool = await UI.confirm("Sunday", "The shop is closed on Sundays. Head out into the neighbourhood?", "Go out", "Stay in")
			if go_out:
				G.phase = "evening"
				Day.open_map()
			return
		Sound.play("door_open", 0.7)
		await Day.start_shift()
		return
	if not G.flag("map_unlocked"):
		await App.go("laundromat", {"from": "backdoor"})
		return
	var choice: Variant = await UI.notice([["h2", "Head out?"], ["p", "Go down to the shop, or out into the neighbourhood.", "center"]],
		{"buttons": [{"label": "Stay", "value": 0}, {"label": "The shop", "value": 1}, {"label": "Neighbourhood map", "value": 2, "primary": true}], "dismiss_value": 0})
	if choice == 1:
		G.location = "laundromat"
		await App.go("laundromat", {"from": "backdoor"})
		await Story.trigger("location", {"loc": "laundromat"})
	elif choice == 2:
		Day.open_map()


func a_sleep(_o: Dictionary) -> void:
	if G.phase == "morning":
		UI.toast("You just got up! The day is waiting.", "icon_home")
		return
	if G.time < 19 * 60 and G.phase != "night":
		var ok: bool = await UI.confirm("Turn in early?", "The evening is still young. Sleep now and end the day?", "Sleep", "Not yet")
		if not ok:
			return
	_pose("stretch", 1.2)
	await App.wait(0.8)
	var sc := _loc()
	if sc and sc.has_method("tuck_in"):
		await sc.tuck_in()
	await Day.sleep()


func a_tea(_o: Dictionary) -> void:
	if not G.take_item("tea", 1):
		UI.toast("The tea tin is empty. (Supplies catalog: tea)", "item_teacup", "bad")
		return
	_pose("reach", 1.4)
	Sound.play("kettle", 0.55)
	var sc := _loc()
	if sc:
		sc.particles.emit("steam", 255, 250, 10)
	await App.wait(1.4)
	Sound.play("cup", 0.8)
	_pose("tea", 2.4)
	if sc and sc.player:
		sc.particles.emit("steam", sc.player.position.x + 14 * sc.player.facing, sc.player.position.y - 230, 5)
	G.add_stat("energy", 15)
	_spend(15)
	UI.toast(Rng.shared.pick(["Strong and sweet, the way Rosa made it.", "A mug of tea. The rain can wait.", "Steam on the window, warmth in your hands."]) + " +energy", "item_teacup")


func a_pet_cat(_o: Dictionary) -> void:
	var sc := _loc()
	if G.vars.get("pettedCat") == G.day:
		Sound.play("meow2", 0.5)
		UI.toast("Biscuit opens one eye, judges you, and goes back to sleep.", "item_cat_bed")
		return
	G.vars.pettedCat = G.day
	G.vars.catDays = G.var_num("catDays") + 1
	_pose("pet", 2.2)
	Sound.play("purr", 0.8)
	if sc:
		sc.particles.emit("heart", 880, 620, 3)
	G.add_stat("energy", 6)
	await App.wait(1.2)
	Sound.play("meow", 0.6)
	UI.toast(Rng.shared.pick(["Biscuit purrs like a tiny dryer.", "Biscuit headbutts your hand. Approved.", "A warm, orange loaf of cat. +energy"]), "item_cat_bed")


func a_sketch(o: Dictionary) -> void:
	if G.energy < 8:
		UI.toast("Too tired to hold a pencil straight.", "item_sketchbook", "bad")
		return
	_pose("sketch", 2.6)
	Sound.play("pencil", 0.8)
	await App.wait(2.2)
	var title: String = o.get("title", "")
	if title == "":
		title = Rng.shared.pick(["Rosa's window", "Biscuit, asleep", "Rain on the rooftops", "The kettle"])
	G.collections.sketches.append({"title": title, "day": G.day})
	G.give_item("sketch", 1)
	G.vars.sketches = G.var_num("sketches") + 1
	if o.get("title", "") != "":
		G.vars.sketchesOut = G.var_num("sketchesOut") + 1    # out and about, not at home
	if int(G.vars.sketches) % 3 == 0 and G.skills.sketch < 5:
		G.skills.sketch += 1
		UI.toast("Sketching skill %d!" % G.skills.sketch, "icon_star")
		Sound.play("sparkle", 0.6)
	G.add_stat("energy", 3)
	_spend(30)
	UI.toast("You sketched \"%s\"." % title, "item_sketchbook")
	await Story.trigger("sketched", {"title": title})


func a_knit(_o: Dictionary) -> void:
	if not G.flag("learned_knit"):
		UI.toast("Rosa's yarn basket. You never learned to knit… maybe someone could teach you.", "item_yarn_basket")
		return
	if G.energy < 8:
		UI.toast("Too tired to count stitches.", "item_yarn_basket", "bad")
		return
	_pose("knit", 2.8)
	Sound.play("knitting", 0.8)
	await App.wait(2.4)
	G.vars.knitProgress = G.var_num("knitProgress") + 1 + (1 if G.skills.knit >= 3 else 0)
	G.add_stat("energy", 3)
	_spend(45)
	if G.vars.knitProgress >= 2:
		G.vars.knitProgress = 0
		G.give_item("scarf", 1)
		G.vars.scarves = G.var_num("scarves") + 1
		if int(G.vars.scarves) % 2 == 0 and G.skills.knit < 5:
			G.skills.knit += 1
			UI.toast("Knitting skill %d!" % G.skills.knit, "icon_star")
		UI.toast("You finished a scarf! Lumpy in places, warm everywhere.", "item_yarn_basket")
	else:
		UI.toast("Half a scarf. Knit one, purl one, wonder about everything.", "item_yarn_basket")


func a_read(_o: Dictionary) -> void:
	_pose("read", 3.2)
	Sound.play("page", 0.7)
	G.add_stat("energy", 7)
	_spend(30)
	UI.toast(Rng.shared.pick(FlavorData.READING), "item_novel", "", 4200)


func a_window(_o: Dictionary) -> void:
	var lines: Array = FlavorData.WINDOW_LINES.get(G.weather, [])
	UI.toast(Rng.shared.pick(lines) if not lines.is_empty() else "The rooftops, going about their business.", "icon_home", "", 3800)


func a_water(o: Dictionary) -> void:
	if o.get("loc", "") == "garden":
		await _garden_water()
		return
	if G.vars.get("watered") == G.day:
		UI.toast("The plants are happy. Don't drown them.", "item_pothos")
		return
	G.vars.watered = G.day
	_pose("water", 1.8)
	Sound.play("drop", 0.6)
	await App.wait(1.4)
	G.vars.plantGrowth = G.var_num("plantGrowth") + 1
	G.add_stat("energy", 2)
	_spend(10)
	if int(G.vars.plantGrowth) % 3 == 0:
		G.give_item("cutting", 1)
		UI.toast("The pothos put out a new vine — you pot a cutting.", "item_pothos")
	else:
		UI.toast("You water the plants. The pothos looks smug.", "item_pothos")


func a_rosa_journal(_o: Dictionary) -> void:
	var unlocked := FlavorData.ROSA_JOURNAL.filter(func(e: Dictionary) -> bool: return G.day >= e.day and (not e.has("flag") or G.flag(e.flag)))
	if unlocked.is_empty():
		return
	var unread := {}
	for e: Dictionary in unlocked:
		if not G.flag("rj_%d" % e.id):
			unread = e
			break
	var e: Dictionary = unread if not unread.is_empty() else unlocked[-1]
	G.flags["rj_%d" % e.id] = true
	Sound.play("book_open", 0.7)
	await UI.notice([["h2", "Rosa's journal"], ["letter", e.date], ["letter", UI.format_text(e.text)]], {"ok": "Close the journal", "sound": "page"})
	if not unread.is_empty():
		G.add_stat("energy", 2)
		_spend(15)
	else:
		UI.toast("That's the last page Rosa wrote… that you've reached so far.", "item_journal")


# ------------------------------------------------------------------ the neighbourhood
func a_enter_shop(_o: Dictionary) -> void:
	G.location = "laundromat"
	await App.go("laundromat", {"from": "front"})
	await Story.trigger("location", {"loc": "laundromat"})


func a_cafe(_o: Dictionary) -> void:
	if G.time >= 21 * 60:
		UI.toast("The Corner Cup is closed. Chairs up on the tables.", "item_coffee_mug")
		return
	var buy: bool = await UI.confirm("The Corner Cup", "A coffee to go? (%s) — or a tea, but don't tell Remy." % Util.money(4), "Buy coffee", "Just looking")
	if not buy:
		return
	if G.money < 4:
		UI.toast("Not enough cash.", "icon_coin", "bad")
		return
	G.add_money(-4, "Coffee at the Corner Cup")
	G.give_item("coffee", 1)
	Sound.play("cup", 0.8)
	G.add_stat("energy", 6)
	_spend(10)
	UI.toast("Coffee in hand (+1 to your bag). Warm, strong, a little heart in the foam.", "item_coffee_mug")


func a_alder(_o: Dictionary) -> void:
	UI.toast("Eviction notices taped inside the lobby door. Somebody drew a frowny face on one." if G.flag("alder_sold") else "The Alder Arms. June's lived here for forty-four years.", "icon_home", "", 3800)


func a_bodega(_o: Dictionary) -> void:
	if G.flag("bodega_closed"):
		UI.toast("Delgado's is dark. \"FOR LEASE.\" Thirty-one years, and then a paper sign.", "icon_home", "bad", 3800)
		return
	if G.time >= 21 * 60:
		UI.toast("Luis is pulling the shutter down. \"Mañana, mija!\"", "icon_home")
		return
	var buy: bool = await UI.confirm("Delgado's", "Luis waves you in. Flowers from the bucket by the door? (%s)" % Util.money(6), "Buy flowers", "Just saying hi")
	if buy:
		if G.money < 6:
			UI.toast("Not enough cash.", "icon_coin", "bad")
			return
		G.add_money(-6, "Flowers from Delgado's")
		G.give_item("flowers", 1)
		Sound.play("coins", 0.6)
		UI.toast("Marigolds and daisies, wrapped in yesterday's paper.", "decor_flower_vase")
	else:
		UI.toast("Luis tells you about his granddaughter, the Mets, and the rent. Mostly the rent.", "icon_speech", "", 3600)
	_spend(10)


func a_photo(o: Dictionary) -> void:
	if not G.flag("has_camera"):
		UI.toast("A good view. If only you had a camera…", "item_camera")
		return
	var key := "photo_%s%d" % [o.get("id", o.get("title", "")), G.day]
	if G.vars.has(key):
		UI.toast("You already took a photo here today.", "item_camera")
		return
	G.vars[key] = 1
	_pose("photo", 1.6)
	await App.wait(0.6)
	Sound.play("camera", 0.9)
	UI.flash()
	var tod := "at night" if G.time >= 20 * 60 else "at dusk" if G.time >= 17 * 60 else "in the morning" if G.phase == "morning" else "by day"
	var wx: String = {"rain": "in the rain", "storm": "in a storm", "cloudy": "under grey skies", "clear": ""}.get(G.weather, "")
	var title := "%s %s%s" % [o.get("title", "Somewhere"), tod, ", " + wx if wx != "" else ""]
	var kind: String = o.get("photo", "photo")
	if kind == "photo_night" and G.time < 19 * 60:
		kind = "photo"
	G.give_item(kind, 1)
	if not G.collections.photos.any(func(p: Dictionary) -> bool: return p.title == title):
		G.collections.photos.append({"title": title, "day": G.day})
	G.vars.photos = G.var_num("photos") + 1
	G.today.photos = int(G.today.get("photos", 0)) + 1
	if int(G.vars.photos) % 3 == 0 and G.skills.photo < 5:
		G.skills.photo += 1
		UI.toast("Photography skill %d!" % G.skills.photo, "icon_star")
	_spend(15)
	UI.toast("Photo: \"%s\"" % title, "item_camera", "", 3200)


func a_market(_o: Dictionary) -> void:
	# Luis took June's advice and runs a stall now
	if G.flag("delgado_stall") and G.vars.get("lime_day") != G.day:
		G.vars.lime_day = G.day
		UI.toast("Luis waves from a fruit stall under a hand-painted sign: DELGADO'S — NOW OUTDOORS.", "item_apron", "", 3600)
		Story.add_hearts("delgado", 10, true)
	UI.menus.open_catalog("market")
	_spend(20)


func a_pigeons(_o: Dictionary) -> void:
	var sc := _loc()
	Sound.play("pigeons", 0.6)
	if sc and sc.has_method("feed_pigeons"):
		sc.feed_pigeons()
	_pose("feed", 1.8)
	await App.wait(1.0)
	if G.vars.get("pigeons") == G.day:
		UI.toast("The pigeons have eaten. They are now simply loitering.", "icon_star")
		return
	G.vars.pigeons = G.day
	G.add_stat("energy", 3)
	_spend(15)
	if sc and sc.find_actor("walt"):
		Story.add_hearts("walt", 8)
		UI.toast("Walt grunts. \"Not too much. They get lazy.\" He tosses a crumb anyway.", "icon_heart", "", 3600)
	else:
		UI.toast("You scatter some crumbs. Instant popularity.", "icon_star")


func _garden_water() -> void:
	if G.vars.get("gardenWater") == G.day:
		UI.toast("The beds are soaked. The squash is practically swimming.", "item_pothos")
		return
	if G.energy < 10:
		UI.toast("Too tired to haul watering cans.", "item_pothos", "bad")
		return
	G.vars.gardenWater = G.day
	G.vars.gardenDays = G.var_num("gardenDays") + 1
	_pose("water", 2.2)
	Sound.play("drop", 0.6)
	await App.wait(1.8)
	G.add_stat("energy", -4)
	G.add_stat("community", 1)
	_spend(25)
	var sc := _loc()
	if sc and sc.find_actor("june"):
		Story.add_hearts("june", 14)
		UI.toast("June beams. \"You have your grandmother's arms. Rosa could carry four cans.\"", "icon_heart", "", 3600)
	else:
		UI.toast("You water the raised beds. The tomatoes look grateful. (+community)", "item_pothos")


func a_flowers(_o: Dictionary) -> void:
	if G.vars.get("flowers") == G.day:
		UI.toast("Leave some for the bees.", "decor_flower_vase")
		return
	if not G.flag("met_june"):
		UI.toast("These are someone's flowers. Better ask first.", "decor_flower_vase")
		return
	G.vars.flowers = G.day
	_pose("pet", 1.4)
	await App.wait(1.0)
	G.give_item("flowers", 1)
	_spend(10)
	UI.toast("A handful of marigolds and daisies. (June said you could.)", "decor_flower_vase")
