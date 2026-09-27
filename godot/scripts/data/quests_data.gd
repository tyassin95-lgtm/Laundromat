class_name QuestsData
## Side missions ("errands") and romance.
##
## Errands:
##   offer   when the giver talks to you (neighbours: also when they come to the counter) and the
##           offer condition holds, script node q_<id>_offer plays. It runs <<quest start <id>>>,
##           or <<quest later <id>>> to be asked again in a couple of days.
##   steps   script expressions, checked all the time (Quests). A step's text is shown in the
##           journal's Errands page with a tick once it holds.
##   done    once every step holds, the giver's next conversation plays q_<id>_done, which runs
##           <<quest done <id>>> and pays the reward.
## Step expressions can use gained("<id>", "<counter>") (how much a counter in G.vars has grown
## since the quest started; the counters are listed in track) and gave("<who>", "<item>", "<id>"),
## true once that gift has been given since the quest started.
##
## Romance: opt-in, with four of the people on Linden Street. Every step is a choice in
## conversation, and saying "just friends" at the first one is always fine.
##   spark    a moment when they're close enough (rom_<who>_spark): <<romance <who> spark>>, or
##            <<romance <who> friend>> (that's that).
##   invite   they ask you somewhere (rom_<who>_invite): <<romance <who> invite>> books it,
##            <<romance <who> later>> asks again in a couple of days.
##   date     go to the place after 5 pm that day: rom_<who>_date plays there. Stand them up and
##            they'll say so (rom_<who>_missed).
##   confess  later, closer still (rom_<who>_confess): <<romance <who> partner>> or
##            <<romance <who> slow>>. One partner at a time; the others stay friends.

const QUESTS := {
	"walt_scarf": {
		"title": "A scarf for Walt",
		"giver": "walt",
		"icon": "item_scarf",
		"blurb": "Walt's scarf is more hole than scarf. Peg knit it in 1979. He would never ask for a new one.",
		"minDay": 4,
		"offer": "flag.learned_knit and hearts.walt >= 2",
		"steps": [
			{"text": "Knit a scarf (Rosa's yarn basket, at home)", "done": "item.scarf >= 1 or gave(\"walt\", \"scarf\", \"walt_scarf\")"},
			{"text": "Give Walt the scarf", "done": "gave(\"walt\", \"scarf\", \"walt_scarf\")"},
		],
		"reward": {"text": "Walt teaches you Peg's belt trick: +1 repair skill", "skill": "repair", "hearts": 50, "flag": "walt_new_scarf"},
	},
	"maya_cover": {
		"title": "Cover art",
		"giver": "maya",
		"icon": "item_camera",
		"blurb": "Maya's label wants cover art by Friday. Her folder of ideas is one picture of a toaster.",
		"offer": "flag.maya_recorded and flag.has_camera and hearts.maya >= 2",
		"steps": [
			{
				"text": "Photograph the city from the river, after 7 pm",
				"done": "item.photo_night >= 1 or gave(\"maya\", \"photo_night\", \"maya_cover\")",
			},
			{"text": "Give Maya the night photograph", "done": "gave(\"maya\", \"photo_night\", \"maya_cover\")"},
		],
		"reward": {"text": "A record for the collection, and your name in the credits (small)", "hearts": 40, "flag": "maya_cover_photo"},
	},
	"june_garden": {
		"title": "Green thumbs",
		"giver": "june",
		"icon": "item_pothos",
		"track": ["gardenDays"],
		"blurb": "June's knees have opinions about the watering can. The tomatoes have louder ones.",
		"offer": "flag.june_garden_1",
		"steps": [
			{
				"text": "Water the community garden on three different evenings",
				"done": "gained(\"june_garden\", \"gardenDays\") >= 3",
				"count": ["gardenDays", 3],
			},
		],
		"reward": {"text": "Flowers, a cutting and a very large tomato. +community", "items": {"flowers": 2, "cutting": 1}, "community": 4, "hearts": 40},
	},
	"remy_studies": {
		"title": "Mural studies",
		"giver": "remy",
		"icon": "item_sketchbook",
		"track": ["sketchesOut"],
		"blurb": "Remy wants the mural to be the whole neighbourhood, but only ever draws the café.",
		"minDay": 6,
		"offer": "hearts.remy >= 2",
		"steps": [
			{
				"text": "Sketch three places around the neighbourhood (look for the sketch spots)",
				"done": "gained(\"remy_studies\", \"sketchesOut\") >= 3",
				"count": ["sketchesOut", 3],
			},
		],
		"reward": {"text": "Artist rate: $30, mostly in coffee. +community", "money": 30, "community": 2, "hearts": 45},
	},
	"spotless": {
		"title": "Rosa's rule",
		"giver": "june",
		"icon": "icon_star",
		"track": ["cleanCloses"],
		"blurb": "Rosa had one rule besides Sundays: never lock up a dirty shop.",
		"minDay": 4,
		"offer": "hearts.june >= 1",
		"steps": [
			{
				"text": "Close the shop spotless (cleanliness 80+) three times",
				"done": "gained(\"spotless\", \"cleanCloses\") >= 3",
				"count": ["cleanCloses", 3],
			},
		],
		"reward": {"text": "The shop stays clean a little longer from now on. +reputation", "rep": 4, "hearts": 25, "flag": "spotless_habit"},
	},
	"kai_socks": {
		"title": "The sock conspiracy",
		"giver": "kai",
		"icon": "item_sock",
		"track": ["socksFound"],
		"blurb": "Kai's spreadsheet has a new tab called SUSPECTS. Kai needs field data.",
		"offer": "hearts.kai >= 1",
		"steps": [
			{
				"text": "Pick up five stray socks (in the shop, or out and about)",
				"done": "gained(\"kai_socks\", \"socksFound\") >= 5",
				"count": ["socksFound", 5],
			},
		],
		"reward": {"text": "A consultancy fee of $25 and Kai's undying respect", "money": 25, "hearts": 40},
	},
	"priya_care": {
		"title": "Care package",
		"giver": "priya",
		"icon": "item_coffee_mug",
		"blurb": "Priya's night crew at the bakery runs on day-old croissants and spite.",
		"minDay": 5,
		"offer": "hearts.priya >= 1",
		"steps": [
			{"text": "Give Priya a Corner Cup coffee", "done": "gave(\"priya\", \"coffee\", \"priya_care\")"},
			{"text": "Give Priya tea for the ones going home", "done": "gave(\"priya\", \"tea\", \"priya_care\")"},
		],
		"reward": {
			"text": "The bakery crew start bringing their aprons: an extra drop-off on Tuesdays and Thursdays. +reputation",
			"rep": 3,
			"hearts": 40,
			"flag": "er_scrubs",
		},
	},
	"haddad_lavender": {
		"title": "Lavender, always",
		"giver": "haddad",
		"icon": "item_softener",
		"blurb": "Forty-five years of lavender sheets. Sami's grandmother is not starting on \"fresh linen scent\" now.",
		"offer": "hearts.haddad >= 1",
		"steps": [{"text": "Stock ten loads of lavender softener (Supplies)", "done": "item.softener >= 10"}],
		"reward": {"text": "A tin of ma'amoul (two helpings). +reputation", "items": {"maamoul": 2}, "rep": 2, "hearts": 40},
	},
	"biscuit": {
		"title": "Biscuit's trust",
		"giver": "biscuit",
		"icon": "item_cat_bed",
		"track": ["catDays"],
		"blurb": "Biscuit regards you the way a landlord regards a new tenant.",
		"minDay": 2,
		"trigger": {"on": "act", "cond": "ev.act == \"pet_cat\""},
		"steps": [{"text": "Pet Biscuit on five different days", "done": "gained(\"biscuit\", \"catDays\") >= 5", "count": ["catDays", 5]}],
		"reward": {"text": "Biscuit sleeps on your feet now: +5 energy every morning", "flag": "biscuit_bond"},
	},
}

const ROMANCE := {
	"maya": {
		"place": "riverside",
		"placeName": "the riverside",
		"spark": "hearts.maya >= 5 and flag.maya_h2",
		"invite": "hearts.maya >= 5",
		"confess": "hearts.maya >= 8",
	},
	"remy": {
		"place": "street",
		"placeName": "the Corner Cup",
		"spark": "hearts.remy >= 5 and flag.remy_h2",
		"invite": "hearts.remy >= 5",
		"confess": "hearts.remy >= 8",
	},
	"kai": {
		"place": "park",
		"placeName": "the park fountain",
		"neighbour": true,
		"spark": "hearts.kai >= 3 and day >= 8",
		"invite": "hearts.kai >= 3",
		"confess": "hearts.kai >= 4",
	},
	"priya": {
		"place": "garden",
		"placeName": "the community garden",
		"neighbour": true,
		"spark": "hearts.priya >= 3 and flag.priya_rosa_night",
		"invite": "hearts.priya >= 3",
		"confess": "hearts.priya >= 4",
	},
}

const NEIGHBOURS := ["delgado", "priya", "haddad", "kai"]


## The story events that offer and finish each errand (they come after the story's own events,
## so the story always gets first say).
static func quest_events() -> Array:
	var out := []
	for id: String in QUESTS:
		var q: Dictionary = QUESTS[id]
		var triggers: Array = [q.trigger] if q.has("trigger") else ([{"on": "arrive"}, {"on": "talk"}] if q.giver in NEIGHBOURS else [{"on": "talk"}])
		for t: Dictionary in triggers:
			var who: String = "" if q.has("trigger") else q.giver
			var extra: String = " and (%s)" % t.cond if t.has("cond") else ""
			out.append({"id": "q_done_%s_%s" % [id, t.on], "on": t.on, "who": who, "once": false,
				"cond": "questReady(\"%s\")%s" % [id, extra], "node": "q_%s_done" % id})
			var offer: String = " and (%s)" % q.offer if q.has("offer") else ""
			var ev := {"id": "q_offer_%s_%s" % [id, t.on], "on": t.on, "who": who, "once": false,
				"cond": "questNew(\"%s\")%s%s" % [id, offer, extra], "node": "q_%s_offer" % id}
			if q.has("minDay"):
				ev.minDay = q.minDay
			out.append(ev)
	return out


## Friends: whenever you talk. Neighbours: the big moments happen when they come to the counter;
## invitations and apologies also when you meet them out and about.
static func romance_events() -> Array:
	var out := []
	for who: String in ROMANCE:
		var R: Dictionary = ROMANCE[who]
		var ons: Array = ["arrive", "talk"] if R.get("neighbour", false) else ["talk"]
		for on: String in ons:
			var counter: bool = not R.get("neighbour", false) or on == "arrive"
			var add := func(step: String, cond: String) -> void:
				out.append({"id": "rom_%s_%s_%s" % [who, step, on], "on": on, "who": who, "once": false, "cond": cond, "node": "rom_%s_%s" % [who, step]})
			add.call("missed", "var.date_{w} and var.date_{w} < day and not flag.dated_{w}".format({"w": who}))
			if counter:
				add.call("confess", "flag.dated_{w} and not flag.partner and (not var.rom_slow_{w} or day - var.rom_slow_{w} >= 4) and ({c})".format({"w": who, "c": R.confess}))
			add.call("invite", "flag.spark_{w} and not flag.dated_{w} and not var.date_{w} and not flag.partner and (not var.rom_later_{w} or day - var.rom_later_{w} >= 2) and ({c})".format({"w": who, "c": R.invite}))
			if counter:
				add.call("spark", "romanceOpen(\"{w}\") and ({c})".format({"w": who, "c": R.spark}))
		out.append({"id": "rom_%s_date" % who, "on": "location", "loc": R.place, "once": false,
			"cond": "var.date_%s == day and time >= 17*60 and phase != \"shift\"" % who, "node": "rom_%s_date" % who})
	return out
