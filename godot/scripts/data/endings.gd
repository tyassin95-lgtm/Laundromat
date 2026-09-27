class_name Endings
## The three endings: a title, a tagline and epilogue cards that depend on your friendships and
## choices. (The credits roll is its own scene: scenes/ui/credits.tscn.)

const ENDINGS := {
	"sold": {"title": "The Last Load", "tagline": "Rosa's Laundromat closed on October 1st.", "music": "bittersweet"},
	"holdout": {"title": "Keep the Lights On", "tagline": "Rosa's stayed open. Just barely. Just enough.", "music": "home_night"},
	"commons": {"title": "Rosa's Commons", "tagline": "The last laundromat on Linden Street became the first of something new.", "music": "ending"},
}


static func _h(w: String) -> int:
	return G.hearts_of(w)


## The epilogue cards: [{img, title, text}].
static func cards(id: String) -> Array:
	var sold := id == "sold"
	var out := []
	match id:
		"sold":
			out.append({"img": "washer_classic", "title": "Rosa's", "text": "The machines went to a scrapyard in Jersey. The sign went into your closet. The Linden opened eighteen months later: 212 residences, a gym, a \"laundry concierge.\" The lobby smells like expensive candles."})
			out.append({"img": "face_player_sad", "title": G.player_name, "text": "The money paid Rosa's debts, and yours, and then some. You went back to school. Some nights you still dream about the rhythm of number two."})
		"holdout":
			out.append({"img": "dryer_stack", "title": "Rosa's", "text": "The Linden went up next door, glass and steel and a \"laundry concierge.\" %s stayed exactly where it was, squat and stubborn and warm, the last laundromat on Linden Street. The new tenants started coming in by November. Their machines broke. Ours didn't." % G.shop})
			out.append({"img": "face_player_smug", "title": G.player_name, "text": "Money is still tight. The roof still leaks over dryer two. You still sketch the machines on slow afternoons. You've never been so tired, or so sure."})
		"commons":
			var speakers := int(G.vars.get("speakers", 0))
			out.append({"img": "furn_bulletin_board", "title": "The Council", "text": "Rezoning application #2291 was denied, %s having spoken and %s having signed. Crestline built on the old lot anyway — smaller, with a line of affordable units the city insisted on. Linden Street kept its face." % [("%d neighbours" % speakers) if speakers > 1 else "the neighbours", ("%d people" % G.petition) if G.petition >= 20 else "half the street"]})
			out.append({"img": "washer_eco", "title": G.shop, "text": "Rosa's became a co-op in the spring: the regulars own a share, the Night Wash happens on the last Saturday of every month, and there's a pay-what-you-can shelf of detergent by the door. The lights stay on until midnight."})
			out.append({"img": "face_player_laugh", "title": G.player_name, "text": "You run the place, sort of. Mostly you fold, and fix, and listen, and draw the regulars on the backs of tickets. Your sketches cover a whole wall now. Abuela would say you finally found the right crayon."})
	out.append_array(_partner_card(sold))
	out.append(_walt_card(sold))
	out.append(_june_card(sold))
	out.append(_maya_card(sold))
	out.append(_remy_card(sold))
	out.append_array(_neighbours_card(sold))
	var biscuit := {"sold": "Biscuit moved with you. He sleeps on the warm spot on top of your fridge and has forgiven no one.",
		"holdout": "Biscuit sleeps on the warm dryer every afternoon at three. Customers schedule around him.",
		"commons": "Biscuit is the co-op's official mascot. He attends every meeting. He votes no on everything."}
	out.append({"img": "item_cat_bed", "title": "Biscuit", "text": biscuit[id]})
	return out


static func _walt_card(sold: bool) -> Dictionary:
	if sold:
		return {"img": "face_walt_sad", "title": "Walt", "text": "Walt drove out to the new laundromat by the highway exactly once. Too bright, he said. He calls you on Tuesdays and Fridays now, at nine, to ask how you are. He never says why those days." if _h("walt") >= 6 else "Walt stopped coming to Linden Street after the fences went up. Priya says she saw him feeding pigeons two neighbourhoods over, alone."}
	if _h("walt") >= 8:
		return {"img": "face_walt_laugh", "title": "Walt", "text": "Walt fixes the machines on Tuesdays and Fridays, 9 a.m. sharp, and refuses payment in anything but coffee. There's a brass plaque on dryer two now: \"Peg & Walter, 1974.\""}
	if _h("walt") >= 4:
		return {"img": "face_walt_smile", "title": "Walt", "text": "Walt still brings his laundry every Tuesday and Friday. He still says Rosa folded tighter. He still stays an hour longer than he needs to."}
	return {"img": "face_walt_content", "title": "Walt", "text": "Walt still comes twice a week. He doesn't talk much. But he comes."}


static func _maya_card(sold: bool) -> Dictionary:
	if G.flag("maya_goes"):
		return {"img": "face_maya_laugh", "title": "Maya", "text": "Maya's first record came out in the spring. The opening track is called \"%s,\" and it starts with the sound of a washing machine on Linden Street. She sends you a postcard from every city she plays." % G.vars.get("trackName", "Spin Cycle")}
	if _h("maya") >= 6:
		return {"img": "face_maya_content", "title": "Maya", "text": "Maya stayed. She teaches beat-making to kids in the back of the shop on Thursday nights, and her album — recorded between midnight and 3 a.m. — is almost done."}
	return {"img": "face_maya_smile", "title": "Maya", "text": "Maya does her laundry in the big new place by the highway now. She says the machines there have no groove." if sold else "Maya still comes in late, headphones on, nodding along to the dryers."}


static func _june_card(sold: bool) -> Dictionary:
	if sold or (G.flag("hearing_lost") and _h("june") < 6):
		return {"img": "face_june_worried", "title": "June", "text": "June moved to Portland to live with her daughter. She writes long letters in perfect cursive and asks, every time, whether the persimmon tree in the garden made it through the winter."}
	if G.flag("hearing_won"):
		return {"img": "face_june_laugh", "title": "June", "text": "The Alder Arms tenants won rent protection in the spring. June still lives in 4B, still runs the garden, and still grades everyone's handwriting, including yours. You get a B+."}
	return {"img": "face_june_content", "title": "June", "text": "June is fighting her eviction in court. She knits in the laundromat window while she waits, and every week there are a few more signatures on her petition."}


static func _remy_card(sold: bool) -> Dictionary:
	if G.flag("commission_taken") and not G.flag("commission_refused"):
		return {"img": "face_remy_worried", "title": "Remy", "text": "Remy's murals hang in the lobby of the Linden. They're beautiful. She paid off her mother's hospital bills. She doesn't walk past the building if she can help it."}
	if G.flag("new_mural") and not sold:
		return {"img": "face_remy_sly", "title": "Remy", "text": "Remy's new mural covers the whole Cap & Seal fence now — Linden Street at sunrise, and in the corner, painted small, an old woman folding a shirt. People take wedding photos in front of it."}
	return {"img": "face_remy_smile", "title": "Remy", "text": "Remy left the Corner Cup when the rent tripled. She paints somewhere else now. You haven't seen the new walls yet." if sold else "Remy still pulls espresso at the Corner Cup and still tags the Crestline hoardings when she thinks no one is looking. Everyone is looking. Everyone cheers."}


## One card for the neighbours you got to know (the three you're closest to).
static func _neighbours_card(sold: bool) -> Array:
	var lost := sold or G.flag("hearing_lost")
	var delgado := "Luis still drinks his morning coffee on the stoop of his old store and says good morning to everybody who passes."
	if sold:
		delgado = "Luis moved his family to Queens and drives a produce truck now. He mails you limes. They arrive bruised and perfect."
	elif G.flag("delgado_stall"):
		delgado = "Luis has a fruit stall at the Sunday market, under a sign June painted. He saves the ugliest limes for you, out of love."
	var lines := {
		"delgado": delgado,
		"priya": "Priya found another laundromat. She says it's fine, the way bakers say fine: covered in flour." if sold else "Priya still drops her aprons off at eleven, straight from the ovens. There is always a mint on top.",
		"haddad": "Mrs. Haddad moved in with her son in Dearborn, and Sami went too, to finish his thesis there. She calls on Sundays to ask if you're eating." if lost else "Mrs. Haddad hosts Thursday dinners at the shop now, and Sami carries the pots down three flights. Attendance is mandatory. So is the ma'amoul.",
		"kai": "Kai still rides past the old corner every day. The sock spreadsheet has a memorial row for Rosa's." if sold else "Kai's sock spreadsheet went viral in a very small corner of the internet. Rosa's is listed as \"the only honest laundromat in the city.\"",
	}
	var known := G.NEIGHBOURS.filter(func(w: String) -> bool: return G.flag("met_" + w) and _h(w) >= 2)
	known.sort_custom(func(a: String, b: String) -> bool: return int(G.hearts.get(a, 0)) > int(G.hearts.get(b, 0)))
	known = known.slice(0, 3)
	if known.is_empty():
		return []
	var text := " ".join(known.map(func(w: String) -> String: return lines[w]))
	return [{"img": CharactersData.face_or_icon(known[0], "smile"), "title": "The neighbours", "text": text}]


## If you're with someone at the end, they get a card of their own.
static func _partner_card(sold: bool) -> Array:
	var p: Variant = G.flags.get("partner")
	if not (p is String) or not CharactersData.CHARACTERS.has(p):
		return []
	var t := ""
	match p:
		"maya":
			if sold:
				t = "Maya followed you across the river and turned the new bathroom into a recording booth. The acoustics, she says, are \"honest.\" Some nights she plays you the washing-machine song and you both pretend not to cry."
			elif G.flag("maya_goes"):
				t = "Maya tours in the spring and comes home in the summer, to the flat above the shop, with a suitcase full of field recordings. The last track on every album is the dryers on Linden Street. The liner notes thank you by name. Small. Very small. But it's there."
			else:
				t = "Maya moved her keyboard into the flat above the shop. She records at three in the morning with the window open, and the neighbours have stopped complaining, because the songs are about them."
		"remy":
			t = "Remy painted your new kitchen wall with Linden Street at sunrise, exactly as it was. You eat breakfast in front of it every morning. Most days that helps." if sold else "Remy paints in the back of the shop on Mondays, when it's quiet. There's a portrait of you on the wall by the dryers, folding a shirt, frowning in concentration. You hate it. Everyone else loves it."
		"kai":
			t = "Kai still rides past the old corner every day, then rides on to your new place with two coffees and a new theory. The sock spreadsheet has a tab with your name on it. It is forty rows long now." if sold else "Kai runs the shop's pickups and deliveries now, and stops by every evening with clementines and a new theory. The sock spreadsheet has a tab with your name on it. It is forty rows long now."
		"priya":
			t = "Priya bakes days now. She says she wanted to see you in daylight at least once. She still folds her aprons like presents — for you — and leaves a mint on top." if sold else "Priya switched to days in the spring. On her nights off you lock up together and sit on the bench in the dark with a pot of tea until one of you falls asleep. It's usually her. There's always a mint on her pillow."
		_:
			t = "%s is still here. So are you." % CharactersData.display_name(p)
	return [{"img": CharactersData.face_or_icon(p, "smile"), "title": "%s & %s" % [CharactersData.display_name(p), G.player_name], "text": t}]
