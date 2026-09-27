extends Node
## The story director: event triggers, script commands, talking, gifts and friendship.
## Autoloaded as Story. Scripts live in res://data/story/*.txt (see ScriptLang).

var busy := false
var music_override := ""
var last_event_data := {}
var runner: ScriptRunner

signal _next_turn(ticket: int)
var _queue: Array[int] = []
var _ticket := 0


func _ready() -> void:
	ScriptLang.register_speakers(CharactersData.CHARACTERS.keys())
	for tag: String in StoryData.SCRIPTS:
		var path := "res://data/story/%s.txt" % tag
		ScriptLang.load_script(FileAccess.get_file_as_string(path), tag)
	runner = ScriptRunner.new(self)


# ------------------------------------------------------------------ script host
func context() -> Dictionary:
	var hearts := {}
	for f in G.FRIENDS + G.NEIGHBOURS:
		hearts[f] = G.hearts_of(f)
	var ctx := {
		"flag": G.flags, "var": G.vars, "vars": G.vars, "hearts": hearts, "pts": G.hearts, "day": G.day, "money": G.money,
		"community": G.community, "petition": G.petition, "rep": G.reputation, "stars": G.stars(), "energy": G.energy,
		"weekday": G.weekday(), "time": G.time, "phase": G.phase, "item": G.inv, "seen": G.seen, "name": G.player_name,
		"weather": G.weather, "loc": G.location, "skill": G.skills, "socks": G.collections.socks.size(),
		"records": G.collections.records.size(), "ending": G.ending if G.ending != "" else null,
		"partner": G.flags.get("partner"), "ev": last_event_data,
		"talkedToday": func(w: String) -> bool: return G.talked.get(w) == G.day,
		"owns": func(d: String) -> bool: return d in G.decor,
		"placed": func(d: String) -> bool: return d in G.placed.values(),
		"upgrade": func(u: String) -> bool: return u in G.upgrades,
		"found": func(id: String) -> bool: return id in G.collections.socks,
	}
	ctx.merge(Quests.helpers())
	return ctx


func eval(src: String) -> bool:
	return runner.eval(src)


func say(who: String, expr: String, text: String) -> void:
	await UI.dialogue.say(who, expr, text)


func choose(options: Array) -> int:
	return await UI.dialogue.choose(options)


func mark_seen(id: String) -> void:
	G.seen[id] = G.day


# ------------------------------------------------------------------ playing
## Plays a script node as a conversation (the game pauses while it's open).
func play(node_id: String) -> void:
	if not ScriptLang.has_node(node_id):
		push_warning("missing node " + node_id)
		return
	if busy:
		_ticket += 1
		var mine := _ticket
		_queue.append(mine)
		while true:
			var turn: int = await _next_turn
			if turn == mine:
				break
	busy = true
	App.ui_block += 1
	Sound.duck(0.6)
	UI.dialogue.open()
	await runner.run(node_id)
	UI.dialogue.close()
	Sound.duck(1.0)
	App.ui_block -= 1
	busy = false
	UI.hud.refresh()
	if not _queue.is_empty():
		_next_turn.emit(_queue.pop_front())


func _event_matches(ev: Dictionary, on: String, data: Dictionary) -> bool:
	if ev.on != on:
		return false
	if ev.get("once", true) and G.flag("ev_" + ev.id):
		return false
	if ev.has("day") and ev.day != G.day:
		return false
	if ev.has("minDay") and G.day < ev.minDay:
		return false
	if ev.has("maxDay") and G.day > ev.maxDay:
		return false
	if ev.get("who", "") != "" and ev.who != data.get("who", ""):
		return false
	if ev.has("loc") and ev.loc != data.get("loc", G.location):
		return false
	if ev.has("at") and (G.time < ev.at or G.time > ev.at + 90):
		return false
	if ev.has("weekday") and ev.weekday != G.weekday():
		return false
	if ev.get("cond", "") != "" and not runner.eval(ev.cond):
		return false
	return true


## Finds and plays the story event for a trigger. Returns true if something played.
func trigger(on: String, data: Dictionary = {}) -> bool:
	var keep := last_event_data
	last_event_data = data               # conditions can look at it as ev.*
	for ev: Dictionary in StoryData.all_events():
		if not _event_matches(ev, on, data):
			continue
		if ev.get("once", true):
			G.flags["ev_" + ev.id] = true
		last_event_data = data
		if ev.has("node"):
			await play(ev.node)
		return true
	last_event_data = keep
	return false


## Would trigger(on, data) play something right now? (No side effects.)
func pending(on: String, data: Dictionary = {}) -> bool:
	var keep := last_event_data
	last_event_data = data
	var found := false
	for ev: Dictionary in StoryData.all_events():
		if _event_matches(ev, on, data):
			found = true
			break
	last_event_data = keep
	return found


## A neighbour at the counter: their story moment if one is due, otherwise a quick chat.
func neighbour_chat(who: String) -> void:
	var played := await trigger("arrive", {"who": who})
	if not played:
		await play(pick_chatter(who))
	G.flags["met_" + who] = true
	if G.talked.get(who) != G.day:
		G.talked[who] = G.day
		G.today.talked.append(who)
		add_hearts(who, 25, true)


func has_location_event(loc: String) -> bool:
	for ev: Dictionary in StoryData.all_events():
		if ev.on != "location" or ev.get("loc", "") != loc or G.flag("ev_" + ev.id):
			continue
		if ev.has("day") and ev.day != G.day:
			continue
		if ev.has("minDay") and G.day < ev.minDay:
			continue
		if ev.has("maxDay") and G.day > ev.maxDay:
			continue
		if ev.has("weekday") and ev.weekday != G.weekday():
			continue
		if ev.get("cond", "") != "" and not runner.eval(ev.cond):
			continue
		return true
	return false


## Time-based events during the shift.
func on_minute() -> void:
	if busy:
		return
	trigger("time")


func can_visit(who: String) -> bool:
	if G.flag("away_" + who):
		return false
	if who == "maya" and G.flag("maya_left"):
		return false
	return true


# ------------------------------------------------------------------ friendship
func add_hearts(who: String, pts: int, quiet: bool = false) -> void:
	var neighbour := who in G.NEIGHBOURS
	if not who in G.FRIENDS and not neighbour:
		return
	var before := G.hearts_of(who)
	G.hearts[who] = maxi(0, mini(500 if neighbour else 1000, int(G.hearts.get(who, 0)) + pts))
	var after := G.hearts_of(who)
	G.today.hearts[who] = int(G.today.hearts.get(who, 0)) + pts
	var loc := App.location
	var actor: Actor = loc.find_actor(who) if loc else null
	if after > before:
		Sound.play("heart", 0.7)
		Settings.vibrate(20)
		UI.toast("%s — %d ♥" % [CharactersData.display_name(who), after], "icon_heart", "heart", 3000)
		if actor:
			loc.particles.emit("heart", actor.position.x, actor.position.y - actor.disp_h() * 0.8, 3)
	elif pts > 0 and not quiet:
		if actor:
			loc.particles.emit("heart", actor.position.x, actor.position.y - actor.disp_h() * 0.8, 1)
	elif pts < 0 and not quiet:
		UI.toast("%s seems hurt." % CharactersData.display_name(who), "icon_heart", "bad")


func talk(who: String, place: String = "") -> void:
	# a story conversation takes priority
	var played := await trigger("talk", {"who": who, "place": place})
	if not played:
		await play(pick_chatter(who))
	if G.talked.get(who) != G.day:
		G.talked[who] = G.day
		G.today.talked.append(who)
		add_hearts(who, 12, true)


func pick_chatter(who: String) -> String:
	var scene_name := App.location.scene_kind if App.location else ""
	var pool := []
	for c: Dictionary in StoryData.CHATTER.get(who, []):
		if c.has("min") and G.hearts_of(who) < c.min:
			continue
		if c.has("max") and G.hearts_of(who) > c.max:
			continue
		if c.has("from") and G.day < c.from:
			continue
		if c.has("until") and G.day > c.until:
			continue
		if c.has("place") and c.place != scene_name:
			continue
		if c.has("cond") and not runner.eval(c.cond):
			continue
		pool.append(c)
	if pool.is_empty():
		return "chat_generic"
	var count := int(G.vars.get("chat_" + who, 0))
	var rng := Rng.new(G.rng_seed + G.day * 31 + who.length() * 7 + count)
	G.vars["chat_" + who] = count + 1
	# prefer lines not heard recently
	var fresh := pool.filter(func(c: Dictionary) -> bool: return not G.seen.has(c.node) or G.day - int(G.seen[c.node]) > 4)
	return rng.pick(fresh if not fresh.is_empty() else pool).node


func gift_to(who: String) -> void:
	var c: Dictionary = CharactersData.CHARACTERS[who]
	if G.gifted.get(who) == G.day:
		UI.toast("You already gave %s something today." % c.name, "icon_heart")
		return
	var item: String = await UI.menus.pick_gift(who)
	if item == "":
		return
	var it: Dictionary = ItemsData.ITEMS[item]
	G.take_item(item, 1)
	G.gifted[who] = G.day
	G.vars["gave_%s_%s" % [who, item]] = G.day      # errands can ask for a particular gift
	G.stats.gifts += 1
	var tags: Array = it.get("tags", [item])
	var react := "neutral"
	var pts := 12
	if tags.any(func(t: String) -> bool: return t in c.get("loves", [])):
		react = "love"
		pts = 55
	elif tags.any(func(t: String) -> bool: return t in c.get("likes", [])):
		react = "like"
		pts = 30
	elif tags.any(func(t: String) -> bool: return t in c.get("dislikes", [])):
		react = "dislike"
		pts = -12
	G.vars.lastGift = it.name
	if react == "love" or react == "like":
		var k := "knownLoves_" + who
		var known: Array = G.vars.get(k, [])
		for t in tags:
			if t in c.get("loves", []) and not t in known:
				known.append(t)
		G.vars[k] = known
	var specific := "gift_%s_%s" % [who, item]
	await play(specific if ScriptLang.has_node(specific) else "gift_%s_%s" % [who, react])
	add_hearts(who, pts)


# ------------------------------------------------------------------ commands
func command(cmd: String, args: String, _runner: ScriptRunner) -> Variant:
	var a := ScriptLang.split_args(args)
	var a0: String = a[0] if a.size() > 0 else ""
	var a1: String = a[1] if a.size() > 1 else ""
	var loc := App.location
	match cmd:
		"rel":
			add_hearts(a0, a1.to_int())
		"money":
			var n := a0.to_float()
			var label := " ".join(a.slice(1))
			G.add_money(n, label if label != "" else ("Received" if n >= 0 else "Paid"))
			Sound.play("coins" if n >= 0 else "coin", 0.7)
			UI.toast("%s$%d" % ["+" if n >= 0 else "-", absi(roundi(n))], "icon_coin", "bad" if n < 0 else "")
			UI.hud.refresh()
		"community":
			var n := a0.to_float()
			G.add_stat("community", n)
			if n > 0:
				UI.toast("Community spirit +%d" % n, "icon_home")
			elif n < 0:
				UI.toast("Community spirit %d" % n, "icon_home", "bad")
		"petition":
			G.petition = maxi(0, G.petition + a0.to_int())
			if a0.to_int() > 0:
				UI.toast("+%s petition signatures (%d)" % [a0, G.petition], "icon_journal")
		"rep":
			G.add_stat("reputation", a0.to_float())
		"energy":
			G.add_stat("energy", a0.to_float())
			UI.hud.refresh()
		"flag":
			G.flags[a0] = true if a.size() < 2 else ScriptLang.parse_value(a1)
		"unflag":
			G.flags.erase(a0)
		"set":
			G.vars[a0] = ScriptLang.parse_value(a[2] if a1 == "=" and a.size() > 2 else a1)
		"add":
			G.vars[a0] = G.var_num(a0) + a1.to_float()
		"give":
			var n := a1.to_int() if a1 != "" else 1
			G.give_item(a0, n)
			var it: Dictionary = ItemsData.ITEMS.get(a0, {})
			if not it.is_empty():
				UI.toast("Got %s%s" % [it.name, " ×%d" % n if n > 1 else ""], it.sprite)
			Sound.play("pop", 0.6)
		"take":
			G.take_item(a0, a1.to_int() if a1 != "" else 1)
		"decor":
			if not a0 in G.decor:
				G.decor.append(a0)
			var dn := " ".join(a.slice(1))
			UI.toast("New decor: %s" % (dn if dn != "" else a0), "icon_home")
		"place":
			G.placed[a0] = a1
			if not a1 in G.decor:
				G.decor.append(a1)
		"record":
			if not a0 in G.collections.records:
				G.collections.records.append(a0)
				UI.toast("New record for the collection!", "item_vinyl")
		"upgrade":
			if not a0 in G.upgrades:
				G.upgrades.append(a0)
		"skill":
			G.skills[a0] = mini(5, int(G.skills.get(a0, 0)) + (a1.to_int() if a1 != "" else 1))
			UI.toast("%s skill %d" % [Util.cap(a0), G.skills[a0]], "icon_star")
			Sound.play("sparkle", 0.6)
		"sfx":
			Sound.play(a0, a1.to_float() if a1 != "" else 0.9)
		"music":
			Sound.music("" if a0 == "none" else a0, a1.to_float() if a1 != "" else 2.0)
			music_override = a0
		"resume_music":
			music_override = ""
			Day.scene_music()
		"wait":
			await App.wait(a0.to_float() if a0 != "" else 0.5)
		"visit":
			if loc and loc.has_method("spawn_visitor"):
				var stay := 90.0
				var si := a.find("stay")
				if si >= 0 and si + 1 < a.size() and a[si + 1].to_float() > 0:
					stay = a[si + 1].to_float()
				var opts := {"order": "order" in a, "stay": stay}
				if "counter" in a:
					opts.to = loc.counter_spot()
				loc.spawn_visitor(a0, opts)
				await App.wait(0.2)
		"await_arrival":
			if loc and loc.has_method("spawn_visitor"):
				var v: Dictionary = loc.visitors.get(a0, {})
				var i := 0
				while not v.is_empty() and v.state == "enter" and i < 40:
					await App.wait(0.1)
					i += 1
		"leave":
			if loc and loc.has_method("visitor_leave") and loc.visitors.has(a0):
				loc.visitor_leave(loc.visitors[a0])
		"pin":
			if loc and loc.has_method("spawn_visitor") and loc.visitors.has(a0):
				loc.visitors[a0].pinned = a1 != "off"
		"stay":
			if loc and loc.has_method("spawn_visitor") and loc.visitors.has(a0):
				loc.visitors[a0].leave_at = G.time + (a1.to_float() if a1.to_float() > 0 else 60.0)
		"emote":
			var act: Actor = loc.find_actor(a0) if loc else null
			if act:
				act.say(a1, a[2].to_float() if a.size() > 2 else 2.5)
		"pose":
			var act: Actor = loc.find_actor(a0) if loc else null
			if act:
				act.set_pose(a1, a[2].to_float() if a.size() > 2 else 1.5)
		"shake":
			App.camera.shake = a0.to_float() if a0 != "" else 6.0
			get_tree().create_timer(a1.to_float() if a1 != "" else 0.5).timeout.connect(func() -> void: App.camera.shake = 0.0)
			Settings.vibrate(60)
		"letter":
			await UI.menus.show_letter(a0)
		"goal":
			UI.hud.set_goal(args.trim_prefix("\"").trim_suffix("\""))
		"toast":
			UI.toast(args.trim_prefix("\"").trim_suffix("\""))
		"unlock":
			G.flags["unlocked_" + a0] = true
			if a0 == "map":
				G.flags.map_unlocked = true
			UI.hud.set_mode(UI.hud.mode)
		"weather":
			G.weather = a0
			if loc and loc.has_method("update_sound"):
				loc.update_sound()
			UI.hud.refresh()
		"time":
			if a0.begins_with("+"):
				G.time += a0.substr(1).to_float()
			else:
				var hm := a0.split(":")
				G.time = hm[0].to_float() * 60.0 + (hm[1].to_float() if hm.size() > 1 else 0.0)
			UI.hud.refresh()
		"diary":
			G.today.notes.append(args.trim_prefix("\"").trim_suffix("\""))
		"order":
			var ch: Dictionary = CharactersData.CHARACTERS.get(a0, {})
			Laundry.create_order({"who": a0, "name": ch.get("name", a0), "service": a1 if a1 != "" else "wash_fold"})
		"policy":
			G.policies[a0] = ScriptLang.parse_value(a1)
		"power":
			if loc and "power_out" in loc:
				loc.power_out = a0 == "off"
		"cat":
			G.flags.cat_in_shop = a0 != "off"
		"fade":
			var secs := a1.to_float() if a1 != "" else 0.5
			if a0 == "out":
				await UI.fade_out(secs)
			else:
				await UI.fade_in(secs)
		"card":
			var parts := []
			for m in RegEx.create_from_string("\"([^\"]*)\"").search_all(args):
				parts.append(m.get_string(1))
			while parts.size() < 3:
				parts.append("")
			await UI.day_card(parts[0], parts[1], parts[2])
		"hud":
			UI.hud.show_hud(a0 != "off")
		"portraits_clear":
			UI.dialogue.clear_portraits()
		"call":
			if Calls.has(a0):
				var r: Variant = await Calls.run(a0, a.slice(1))
				if r is Dictionary and r.has("goto"):
					return r
		"jump":
			return {"goto": a0}
		"ending":
			await Day.ending(a0)
			return {"stop": true}
		"scene":
			await Day.cut_to(a0, a1)
		"phase":
			G.phase = a0
		"quest":
			Quests.command(a0, a1)
		"romance":
			Quests.romance(a0, a1)
		_:
			push_warning("[story] unknown command %s %s" % [cmd, args])
	return null
