extends Node
## Errands (side missions) and romance: state, script commands and the checks that notice
## progress. Autoloaded as Quests. The errands themselves are in QuestsData.
##
## G.quests[id] = {state: active | later | done, day, at: {counter: value when started}, steps, ready}

var _t := 0.0


func get_quest(id: String) -> Dictionary:
	return G.quests.get(id, {})


# ------------------------------------------------------------------ helpers for script expressions
func helpers() -> Dictionary:
	return {"questNew": quest_new, "questActive": quest_active, "questReady": quest_ready, "questDone": quest_done,
		"gained": gained, "gave": gave, "romanceOpen": romance_open}


func quest_new(id: String) -> bool:
	var s := get_quest(id)
	return s.is_empty() or (s.state == "later" and G.day - int(s.day) >= 2)


func quest_active(id: String) -> bool:
	return get_quest(id).get("state", "") == "active"


func quest_ready(id: String) -> bool:
	return quest_active(id) and steps_done(id) == QuestsData.QUESTS[id].steps.size()


func quest_done(id: String) -> bool:
	return get_quest(id).get("state", "") == "done"


## True once that gift has been given since the errand started.
func gave(who: String, item: String, id: String) -> bool:
	var d: Variant = G.vars.get("gave_%s_%s" % [who, item])
	var s := get_quest(id)
	return d != null and not s.is_empty() and d >= s.day


func romance_open(who: String) -> bool:
	return not G.flag("spark_" + who) and not G.flag("friend_" + who) and not G.flag("partner")


## How much a counter in G.vars has grown since the errand started.
func gained(id: String, key: String) -> float:
	return G.var_num(key) - float(get_quest(id).get("at", {}).get(key, 0))


func steps_done(id: String) -> int:
	var n := 0
	for st: Dictionary in QuestsData.QUESTS[id].steps:
		if Story.eval(st.done):
			n += 1
		else:
			break
	return n


# ------------------------------------------------------------------ <<quest start|later|done id>>
func command(verb: String, id: String) -> void:
	if not QuestsData.QUESTS.has(id):
		push_warning("[quests] unknown quest " + id)
		return
	var def: Dictionary = QuestsData.QUESTS[id]
	match verb:
		"start":
			var at := {}
			for k in def.get("track", []):
				at[k] = G.var_num(k)
			G.quests[id] = {"state": "active", "day": G.day, "at": at, "steps": 0}
			G.quests[id].steps = steps_done(id)
			Sound.play("sparkle", 0.5)
			UI.toast("New errand: %s" % def.title, def.icon, "", 3200)
		"later":
			G.quests[id] = {"state": "later", "day": G.day}
		"done":
			var s: Dictionary = G.quests.get(id, {})
			s.state = "done"
			s.done_day = G.day
			G.quests[id] = s
			_reward(id, def.get("reward", {}))


func _reward(id: String, r: Dictionary) -> void:
	var def: Dictionary = QuestsData.QUESTS[id]
	if r.has("money"):
		G.add_money(r.money, "Errand: %s" % def.title)
	if r.has("hearts") and CharactersData.CHARACTERS.has(def.giver) and def.giver != "biscuit":
		Story.add_hearts(def.giver, r.hearts)
	if r.has("community"):
		G.add_stat("community", r.community)
	if r.has("rep"):
		G.add_stat("reputation", r.rep)
	if r.has("skill"):
		G.skills[r.skill] = mini(5, int(G.skills.get(r.skill, 0)) + 1)
	if r.has("flag"):
		G.flags[r.flag] = true
	var items: Dictionary = r.get("items", {})
	for item: String in items:
		G.give_item(item, items[item])
	if r.has("record") and not r.record in G.collections.records:
		G.collections.records.append(r.record)
	G.stats.errands = int(G.stats.get("errands", 0)) + 1
	Sound.play("jingle_day", 0.55)
	var parts := []
	if r.has("money"):
		parts.append("+$%d" % r.money)
	for item: String in items:
		var it: Dictionary = ItemsData.ITEMS.get(item, {})
		parts.append("%s%s" % [it.get("name", item), " ×%d" % items[item] if items[item] > 1 else ""])
	UI.toast("Errand done: %s%s" % [def.title, " — " + ", ".join(parts) if not parts.is_empty() else ""], def.icon, "heart", 4200)
	G.today.notes.append("Finished an errand: %s." % def.title)
	UI.hud.refresh()


## Called by the game loop: about once a second, tick off errand steps as they happen.
func update(dt: float) -> void:
	_t += dt
	if _t < 1.0:
		return
	_t = 0.0
	if G.quests.is_empty() or App.paused():
		return
	for id: String in G.quests:
		var s: Dictionary = G.quests[id]
		if s.state != "active" or not QuestsData.QUESTS.has(id):
			continue
		var def: Dictionary = QuestsData.QUESTS[id]
		var n := steps_done(id)
		if n > int(s.get("steps", 0)):
			s.steps = n
			if n >= def.steps.size():
				if not s.get("ready", false):
					s.ready = true
					Sound.play("sparkle", 0.6)
					var who := "go and see Biscuit" if def.giver == "biscuit" else "tell " + CharactersData.display_name(def.giver)
					UI.toast("Errand ready: %s — %s." % [def.title, who], CharactersData.face_or_icon(def.giver) if def.giver != "biscuit" else def.icon, "", 4200)
			else:
				var step_text: String = def.steps[n - 1].text
				UI.toast("Errand: %s ✓ %s" % [def.title, RegEx.create_from_string(" \\(.*\\)$").sub(step_text, "")], def.icon, "", 3200)


## For the journal: progress of a counted step (" (2/3)").
func progress(id: String, step: Dictionary) -> String:
	if not step.has("count"):
		return ""
	var have := clampi(int(gained(id, step.count[0])), 0, int(step.count[1]))
	return " (%d/%d)" % [have, step.count[1]]


# ------------------------------------------------------------------ <<romance who verb>>
func romance(who: String, verb: String) -> void:
	var R: Dictionary = QuestsData.ROMANCE.get(who, {})
	if R.is_empty() or not CharactersData.CHARACTERS.has(who):
		push_warning("[romance] unknown " + who)
		return
	var cname := CharactersData.display_name(who)
	match verb:
		"spark":
			G.flags["spark_" + who] = true
			Story.add_hearts(who, 30)
			Sound.play("heart", 0.8)
			G.today.notes.append("Something changed with %s today. Something good, I think." % cname)
		"friend":
			G.flags["friend_" + who] = true
			Story.add_hearts(who, 15, true)
		"invite":
			var d := G.day if G.time < 19 * 60 else G.day + 1
			G.vars["date_" + who] = d
			var when := "tonight" if d == G.day else "tomorrow evening"
			G.goal = "Meet %s at %s %s, after 5 pm." % [cname, R.placeName, when]
			UI.hud.set_goal(G.goal)
			UI.toast("A date with %s: %s, %s." % [cname, R.placeName, when], "icon_heart", "heart", 3600)
		"later":
			G.vars["rom_later_" + who] = G.day
		"dated":
			G.flags["dated_" + who] = true
			G.vars["date_" + who] = 0
			G.vars["dates_" + who] = G.var_num("dates_" + who) + 1
			if G.goal.contains(cname):
				G.goal = ""
				UI.hud.set_goal("")
			Story.add_hearts(who, 60)
			G.today.notes.append("A date with %s. I'm still smiling, writing this." % cname)
		"missed":
			G.vars["date_" + who] = 0
			G.vars["rom_later_" + who] = G.day
			if G.goal.contains(cname):
				G.goal = ""
				UI.hud.set_goal("")
		"partner":
			G.flags.partner = who
			G.flags["partner_" + who] = true
			G.flags["rom_%s_asked" % who] = true
			Story.add_hearts(who, 80)
			Sound.play("jingle_week", 0.6)
			UI.toast("You and %s ♥" % cname, "icon_heart", "heart", 4000)
		"slow":
			G.vars["rom_slow_" + who] = G.day      # they'll ask again in a few days
		_:
			push_warning("[romance] unknown step " + verb)


## A partner sometimes leaves coffee by the door in the morning.
func morning_perks() -> void:
	var p: Variant = G.flags.get("partner")
	if p is String and CharactersData.CHARACTERS.has(p) and G.day % 3 == 1 and (G.day - 1) % 7 != 6:
		G.add_stat("energy", 10)
		var face := CharactersData.face_or_icon(p)
		UI.toast("%s left a coffee by the door for you, with a note: \"Go get 'em.\" +energy" % CharactersData.display_name(p), face if face != "" else "item_coffee_mug", "heart", 4200)
	if G.flag("biscuit_bond"):
		G.add_stat("energy", 5)


## Romance status for the journal ("" if nothing).
func status(who: String) -> String:
	if G.flags.get("partner") == who:
		return "Together ♥"
	if G.flag("dated_" + who):
		return "Dating"
	if ScriptLang.truthy(G.vars.get("date_" + who)):
		return "Date planned"
	if G.flag("spark_" + who):
		return "Sweet on you"
	return ""
