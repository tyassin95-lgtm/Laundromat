extends Node
## The shape of a day: morning at home -> the shift in the laundromat -> a free evening -> sleep.
## Autoloaded as Day.

const STORY_WEATHER := {1: "rain", 2: "cloudy", 3: "clear", 7: "clear", 11: "rain", 13: "cloudy", 16: "cloudy", 17: "storm", 18: "rain", 20: "clear", 26: "rain", 27: "clear", 28: "clear"}
const CHAPTERS := {
	1: ["Week One", "Spin Cycle", "Everything Rosa left behind is still running. Mostly."],
	8: ["Week Two", "Rinse", "The offers start arriving in nicer envelopes."],
	15: ["Week Three", "Tumble", "Storm season on Linden Street."],
	22: ["Week Four", "Fold", "Everything comes down to what you keep."],
}
const WEATHER_LINES := {"clear": "Clear skies over Linden Street.", "cloudy": "A soft grey sky.", "rain": "Rain on the windows.", "storm": "Storm warnings all day."}

var late_warned := false


func weather_for(d: int) -> String:
	if STORY_WEATHER.has(d):
		return STORY_WEATHER[d]
	var r := Rng.new(G.rng_seed + d * 101).next()
	return "clear" if r < 0.34 else "cloudy" if r < 0.62 else "rain"


# ------------------------------------------------------------------ morning
func morning(silent_card: bool = false) -> void:
	G.phase = "morning"
	G.location = "home"
	G.time = 9.0 * 60.0 if G.is_sunday() else 7.0 * 60.0
	G.weather = weather_for(G.day)
	G.today = G.fresh_today()
	late_warned = false
	if not silent_card:
		var ch: Array = CHAPTERS.get(G.day, [])
		if not ch.is_empty() and G.day <= G.STORY_DAYS:
			await UI.day_card(ch[0], ch[1], ch[2], 2.6)
		else:
			await UI.day_card(G.WEEKDAYS_LONG[G.weekday()], "Day %d" % G.day, WEATHER_LINES.get(G.weather, ""), 1.5)
	await App.go("home", {"from": "bed"})
	SaveGame.save()
	await Story.trigger("home_morning")
	if App.location == null or App.location.scene_kind == "title":
		return                                     # the final choice ended the story
	Quests.morning_perks()
	await check_mail()
	var fallback := "Head downstairs and open the shop."
	if G.is_sunday():
		fallback = "Pay-what-you-can Sunday: open the shop if you like, or take the day off." if G.sunday_open() else "Sunday — the shop is closed. Rest, explore, see friends."
	UI.hud.set_goal(G.goal if G.goal != "" else fallback)


## Story letters arrive through "mail" events.
func check_mail() -> void:
	await Story.trigger("mail")


# ------------------------------------------------------------------ shift
func start_shift() -> void:
	if G.is_sunday() and not G.sunday_open():
		UI.toast("The shop is closed on Sundays.", "icon_calendar")
		return
	G.phase = "shift"
	G.time = maxf(G.time, Laundry.OPEN_AT)
	G.location = "laundromat"
	Laundry.plan_day()
	await App.go("laundromat", {"from": "backdoor"})
	UI.hud.set_mode("shift")
	Sound.play("shop_bell", 0.4)
	UI.hud.set_goal("" if G.goal.contains("downstairs") else G.goal)
	await Story.trigger("shift_start")
	SaveGame.save()


func ask_close_early() -> void:
	if G.phase != "shift":
		return
	var early := G.time < 17 * 60
	var busy := G.orders.any(func(o: Dictionary) -> bool: return o.stage != "done")
	var txt: String
	if early:
		txt = "It's only %s. Closing early disappoints walk-ins%s." % [Util.clock_str(G.time), ", and you'll stay late to finish the open orders" if busy else ""]
	else:
		txt = "You'll stay a little late to finish the open orders." if busy else "Flip the sign and call it a day?"
	var yes: bool = await UI.confirm("Close up for the day?", txt, "Close up", "Keep going")
	if not yes:
		return
	if early:
		G.add_stat("reputation", -minf(4.0, (17 * 60 - G.time) / 60.0))
	end_shift()


func end_shift() -> void:
	if G.phase != "shift":
		return
	var sc := App.location
	if sc and sc.scene_kind == "laundromat":
		sc.shift_running = false
		sc.jobs.clear()
		sc.set_carry([])
	var res := Laundry.close_shop()
	if G.cleanliness >= 80:
		G.vars.cleanCloses = G.var_num("cleanCloses") + 1
	G.phase = "evening"
	G.time = maxf(G.time, Laundry.CLOSE_AT)
	if res.leftovers > 0:
		G.time += 25 * res.leftovers
		G.add_stat("energy", -5 * res.leftovers)
	Sound.play("jingle_day", 0.6)
	UI.hud.set_mode("free")
	if sc and sc.has_method("update_sound"):
		sc.update_sound()
	await _shift_summary(res)
	await Story.trigger("shift_end")
	if not G.flag("map_unlocked") and G.day >= 1:
		G.flags.map_unlocked = true
		UI.hud.set_mode("free")
	UI.hud.set_goal(G.goal if G.goal != "" else "Evening. Head out the front door to explore — or go upstairs to rest.")
	scene_music()
	SaveGame.save()


func _shift_summary(res: Dictionary) -> void:
	var t := G.today
	var blocks := [["h2", "Closing time"],
		["row", "Drop-off orders", str(t.orders)],
		["row", "Late", str(t.late)],
		["row", "Self-service", Util.money(t.self_serve)]]
	if t.get("vending", 0.0) > 0:
		blocks.append(["row", "Snack & soap machine", Util.money(t.vending)])
	blocks.append(["row", "Tips", Util.money(t.tips)])
	blocks.append(["row", "Spent today", "-" + Util.money(t.expenses)])
	blocks.append(["total", "Takings today", Util.money(t.income), "pos"])
	if res.leftovers > 0:
		blocks.append(["p", "You stayed late to finish %d order%s." % [res.leftovers, "s" if res.leftovers > 1 else ""], "center"])
	blocks.append(["p", "[color=#6b5440]Cash on hand: [/color][b]%s[/b]" % Util.money(G.money), "center"])
	await UI.notice(blocks, {"ok": "Lock up"})


# ------------------------------------------------------------------ evening, travel
func scene_music() -> void:
	if Story.music_override != "":
		return
	var sc := App.location
	if sc == null:
		return
	var night := G.time >= 20 * 60 or G.time < 6 * 60
	var key := ""
	match sc.scene_kind:
		"laundromat":
			if G.record != "" and G.placed.get("lounge_table") == "record_player":
				key = G.record
			elif G.phase == "shift":
				key = "laundromat_day" if G.day % 2 == 1 else "laundromat_day2"
			else:
				key = "laundromat_night"
		"home":
			if G.record != "" and G.placed.get("h_table") == "record_player":
				key = G.record
			else:
				key = "morning" if G.phase == "morning" else "home_night" if night else "home"
		"street":
			key = LocationsData.LOCATIONS[sc.place].get("music", "street")
	if key != "":
		Sound.music(key, 2.5)


func leave_laundromat(where: String) -> void:
	if where == "home":
		if G.phase == "evening" or G.phase == "night":
			G.location = "home"
			await App.go("home", {"from": "door"})
			await Story.trigger("home_night")
		else:
			await App.go("home", {"from": "door"})
	else:
		await travel("street", "shop", true)


func open_map() -> void:
	if not G.flag("map_unlocked"):
		UI.toast("Finish your first day before exploring.", "icon_map")
		return
	if G.phase == "shift":
		UI.toast("The shop is open — explore after closing.", "icon_map")
		return
	G.flags.map_opened = true
	UI.menus.open_map()


func travel(loc: String, from: String = "", no_time: bool = false) -> void:
	var L0: Dictionary = LocationsData.LOCATIONS.get(loc, {})
	if L0.is_empty():
		return
	if not no_time and G.location != loc:
		G.time += float(L0.get("travel", 40))
	G.location = loc
	if L0.scene == "home":
		await App.go("home", {"from": "door"})
		if G.phase != "morning":
			await Story.trigger("home_night")
		return
	if L0.scene == "laundromat":
		await App.go("laundromat", {"from": "front"})
		await Story.trigger("location", {"loc": loc})
		return
	await App.go(loc, {"from": from})
	await Story.trigger("location", {"loc": loc})
	check_late()


func check_late() -> void:
	if G.phase == "morning" or G.phase == "shift":
		return
	if G.time >= 22 * 60 and not late_warned:
		late_warned = true
		UI.toast("It's getting late. Tomorrow comes early.", "icon_clock")
	if G.time >= 23 * 60 + 30 and App.location and App.location.scene_kind != "home":
		UI.toast("You can barely keep your eyes open. Time to head home.", "icon_home")
		get_tree().create_timer(0.9).timeout.connect(travel.bind("home"))


## Spends time on an activity (evening or morning).
func spend(minutes: float) -> bool:
	G.time += minutes
	UI.hud.refresh()
	check_late()
	return true


# ------------------------------------------------------------------ sleep
func sleep() -> void:
	if G.phase == "morning":
		var yes: bool = await UI.confirm("Go back to bed?", "You just got up. Skip today and sleep until tomorrow?", "Sleep", "Stay up")
		if not yes:
			return
	var ending_before := G.ending
	await Story.trigger("sleep")
	if G.ending != ending_before:
		return                                     # a story ending played instead
	G.phase = "night"
	Sound.music("", 1.5)
	await UI.fade_out(0.9)
	# energy: late nights cost you
	var late := maxf(0.0, G.time - 23 * 60) / 60.0
	G.energy = maxf(55.0, 100.0 - late * 15.0)
	G.stats.days += 1
	Diary.write_entry()
	if G.is_sunday():
		await pay_bills()
	G.day += 1
	for m in G.machines:
		m.lint = minf(8.0, float(m.get("lint", 0))) if m.kind == "dryer" else 0.0
	G.goal = ""
	if G.day > G.STORY_DAYS and G.ending == "":
		G.day = G.STORY_DAYS
	await morning()
	await UI.fade_in(0.6)


func bills_for(_d: int = -1) -> Array:
	var cycles := G.var_num("weekCycles")
	var heater := "water_heater" in G.upgrades
	var led := "led_bulbs" in G.upgrades
	var items := [
		["Rosa's loan payment", 175],
		["Water & gas" + (" (tankless heater)" if heater else ""), roundi((55 + cycles * 0.8) * (0.88 if heater else 1.0))],
		["Electric" + (" (LED bulbs)" if led else ""), roundi((35 + cycles * 0.45) * (0.66 if led else 1.0))],
		["Insurance", 25],
	]
	if G.flag("tax_reassessed"):
		items.append(["Property tax (reassessed)", 75])
	if G.flag("poster_deal"):
		items.append(["Crestline window ad", -120])
	return items


func pay_bills() -> void:
	var items := bills_for(G.day)
	var total := 0
	var blocks := [["h2", "Week's bills"]]
	for it: Array in items:
		total += it[1]
		blocks.append(["row", it[0], ("+" if it[1] < 0 else "") + Util.money(absf(it[1])), "pos" if it[1] < 0 else ""])
	blocks.append(["total", "Total", Util.money(total)])
	G.add_money(-total, "Weekly bills (week %d)" % G.week_of(G.day))
	G.bills_paid.append({"week": G.week_of(G.day), "total": total})
	G.vars.weekCycles = 0
	if G.money < 0:
		G.debt = -G.money
		G.flags.in_debt = true
		blocks.append(["p", "[color=#b3402f]You're %s in the red. The bank has started calling.[/color]" % Util.money(-G.money), "center"])
	else:
		G.flags.erase("in_debt")
		blocks.append(["p", "Paid in full. %s left in the till." % Util.money(G.money), "center"])
	Sound.play("jingle_sad" if G.money < 0 else "jingle_week", 0.6)
	await UI.fade_in(0.3)
	await UI.notice(blocks, {"ok": "Onward"})
	await UI.fade_out(0.3)


# ------------------------------------------------------------------ a cut to another place mid-script
func cut_to(place: String, arg: String = "") -> void:
	await UI.fade_out(0.4)
	G.location = place
	if place == "laundromat":
		await App.go("laundromat", {"from": arg if arg != "" else "backdoor", "no_fade": true})
	elif place == "home":
		await App.go("home", {"from": arg if arg != "" else "door", "no_fade": true})
	else:
		await App.go(place, {"from": arg, "no_fade": true})
	await UI.fade_in(0.4)


# ------------------------------------------------------------------ the end
func ending(id: String) -> void:
	G.ending = id
	if not id in G.endings_seen:
		G.endings_seen.append(id)
	G.flags.ending_done = true
	SaveGame.save()
	await UI.menus.play_ending(id)
	# after the credits, the shop keeps going (or not)
	if id == "sold":
		await App.to_title()
		return
	G.flags.epilogue = true
	G.goal = "Free play — keep Rosa's running as long as you like."
	SaveGame.save()
	await App.to_title()
