class_name Calls
## Custom logic that story scripts invoke with <<call name args>>.

const NAMES := ["gather", "dismiss", "inspection", "hearing", "checkpoint", "keepEnding", "ensureBoard", "crowd", "knownLove"]


static func has(call_name: String) -> bool:
	return call_name in NAMES


## Runs a call. It may return {goto: node} to jump the script elsewhere.
static func run(call_name: String, args: Array) -> Variant:
	match call_name:
		"gather": return await gather(args)
		"dismiss": dismiss()
		"inspection": return inspection()
		"hearing": hearing()
		"checkpoint": checkpoint()
		"keepEnding": return keep_ending()
		"ensureBoard": ensure_board()
		"crowd": G.add_stat("community", float(args[0]) if args.size() > 0 and float(args[0]) != 0 else 5.0)
		"knownLove": known_love(args[0], args[1])
	return null


## Brings friends into the laundromat for group scenes.
static func gather(who: Array) -> void:
	var sc := App.location
	if sc == null or not sc.has_method("spawn_visitor"):
		return
	var spots := {"walt": {"x": 1470, "y": 652}, "june": {"x": 1300, "y": 668}, "maya": {"x": 1610, "y": 670}, "remy": {"x": 1150, "y": 680}}
	for w: String in (who if not who.is_empty() else G.FRIENDS):
		if not Story.can_visit(w) and not (w == "maya" and G.day <= 28):
			continue
		var v: Dictionary = sc.spawn_visitor(w, {"stay": 600.0, "to": spots[w]})
		v.pinned = true
	await App.wait(1.6)


static func dismiss() -> void:
	var sc := App.location
	if sc == null or not sc.has_method("visitor_leave"):
		return
	for v: Dictionary in sc.visitors.values():
		v.pinned = false
		sc.visitor_leave(v)


## The city inspection on day 19.
static func inspection() -> Dictionary:
	var broken := G.machines.filter(func(m: Dictionary) -> bool: return m.broken).size()
	var clean := G.cleanliness
	G.vars.inspectBroken = broken
	G.vars.inspectClean = roundi(clean)
	if broken == 0 and clean >= 45:
		return {"goto": "inspection_pass"}
	return {"goto": "inspection_fail"}


## Who will speak at the hearing, and does it work?
static func hearing() -> void:
	var speakers := []
	if G.hearts_of("june") >= 5 or G.flag("june_testifies"):
		speakers.append("june")
	if G.hearts_of("walt") >= 5 or G.flag("walt_testifies"):
		speakers.append("walt")
	if G.hearts_of("remy") >= 5 and G.flag("commission_refused"):
		speakers.append("remy")
	if G.hearts_of("maya") >= 5 and G.flag("maya_track"):
		speakers.append("maya")
	# neighbours who like you enough stand up too
	var neighbours := G.NEIGHBOURS.filter(func(w: String) -> bool: return G.flag("met_" + w) and G.hearts_of(w) >= 3)
	G.vars.speakers = speakers.size() + neighbours.size()
	for s in speakers + neighbours:
		G.flags["speaks_" + s] = true
	var score := speakers.size() * 18.0 + neighbours.size() * 5.0 + minf(G.petition, 200) * 0.22 + G.community * 0.35
	if G.flag("kai_intel"):
		score += 6
	if G.flag("poster_deal"):
		score -= 12
	if G.flag("tenants_meetings"):
		score += 8
	if G.flag("storm_open_all_night"):
		score += 6
	G.vars.hearingScore = roundi(score)
	var won := score >= 85
	G.flags.hearing_done = true
	G.flags["hearing_won" if won else "hearing_lost"] = true


## Snapshot before the final decision, so "sell" can be undone from the title screen.
static func checkpoint() -> void:
	G.flags.checkpoint = true
	SaveGame.save()
	SaveGame.save_checkpoint()


## Which "keep" ending the player earned.
static func keep_ending() -> Dictionary:
	var friends := G.FRIENDS.filter(func(w: String) -> bool: return G.hearts_of(w) >= 6).size()
	var commons := G.flag("hearing_won") and G.community >= 65 and G.money >= 0 and friends >= 2
	return {"goto": "ending_commons" if commons else "ending_holdout"}


static func ensure_board() -> void:
	if not "bulletin_board" in G.placed.values():
		if not "bulletin_board" in G.decor:
			G.decor.append("bulletin_board")
		G.placed.wall_b = "bulletin_board"
		if App.location and App.location.has_method("refresh_decor"):
			App.location.refresh_decor()
		UI.toast("June hung a community board on the wall.", "furn_bulletin_board")


static func known_love(who: String, tag: String) -> void:
	var k := "knownLoves_" + who
	var known: Array = G.vars.get(k, [])
	if not tag in known:
		known.append(tag)
	G.vars[k] = known
