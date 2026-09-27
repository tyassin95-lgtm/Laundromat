class_name Diary
## Writes the player's diary entry at the end of each day from what happened.


static func write_entry() -> String:
	var t := G.today
	var rng := Rng.new(G.rng_seed + G.day * 977)
	var parts := []
	var wx: String = {"clear": "Sunny", "cloudy": "Grey skies", "rain": "Rain all day", "storm": "What a storm"}.get(G.weather, "")
	parts.append("%s. %s." % [G.WEEKDAYS_LONG[G.weekday()], wx])
	if t.orders > 0:
		var cash := roundi(t.income)
		var n: int = t.orders
		parts.append(rng.pick([
			"%d drop-off%s, $%d in the till." % [n, "s" if n > 1 else "", cash],
			"Folded %d load%s today. $%d earned." % [n, "s" if n > 1 else "", cash],
			"$%d today, %d order%s%s." % [cash, n, "s" if n > 1 else "", ", %d late (ugh)" % t.late if t.late > 0 else ""],
		]))
	elif G.weekday() == 6:
		parts.append("No shop today. Just me, the neighbourhood, and a lot of walking.")
	for n in t.notes:
		parts.append(n)
	var gained := []
	for who in t.hearts:
		if t.hearts[who] >= 20:
			gained.append([who, t.hearts[who]])
	gained.sort_custom(func(a: Array, b: Array) -> bool: return a[1] > b[1])
	if not gained.is_empty():
		var who: String = gained[0][0]
		var cname := CharactersData.display_name(who)
		if G.hearts_of(who) >= 6:
			parts.append(rng.pick(["%s feels like family already." % cname, "I think %s might actually like me. Like, really." % cname, "Spent time with %s. The good kind of tired." % cname]))
		else:
			parts.append(rng.pick(["Talked with %s. I'm starting to get them." % cname, "%s is growing on me. Abuela said they would." % cname, "Good moment with %s today." % cname]))
	if G.energy < 25:
		parts.append("I am so tired my bones are tired.")
	if G.money < 50:
		parts.append("Money is… tight. Very tight.")
	if G.cleanliness < 35:
		parts.append("The floor is a disgrace. Tomorrow: mop.")
	if t.photos > 0:
		parts.append("Took some photos. Abuela's camera still works.")
	parts.append(rng.pick(["Biscuit snored.", "The machines hummed me to sleep.", "Tomorrow, again.", "Lights off. Lights on tomorrow.", "", ""]))
	var text := " ".join(parts.filter(func(p: String) -> bool: return p != ""))
	G.diary.append({"day": G.day, "text": text})
	if G.diary.size() > 60:
		G.diary.pop_front()
	return text
