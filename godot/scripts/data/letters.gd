class_name Letters
## Letters and notices, shown with <<letter id>>. Each is a list of notice blocks (see Notice)
## and, optionally, buttons whose value goes to on_choose.

const CREST_SIGN := "Warm regards,\n\nGrant Holloway\nVP, Acquisitions & Community Partnerships"


static func has(id: String) -> bool:
	return id in ["rosa_will", "crestline_1", "crestline_poster", "crestline_offer", "tax", "hearing", "crestline_final"]


## {blocks: Array, buttons: Array}
static func letter(id: String) -> Dictionary:
	var n := G.player_name
	match id:
		"rosa_will":
			return {"blocks": [["h2", "A note, folded into the will"], ["letter", "Mija —\n\nThe shop is yours now, and the flat, and the cat (he will pretend he isn't).\n\nKeep the lights on if you can. If you can't, that's alright too — I mean it. But try the Tuesday crowd first. They grow on you.\n\nEverything important is written somewhere in my journal. Everything else is written on people.\n\nAll my love,\nAbuela Rosa\n\nP.S. Number three sticks. Kick it low, left side."]],
				"buttons": [{"label": "Fold it into your pocket", "value": true, "primary": true}]}
		"crestline_1":
			return {"blocks": [["corporate", "CRESTLINE PROPERTIES", "Dear %s,\n\nPlease accept our sincere condolences on the passing of Ms. Rosa Alcántara, a true fixture of the Linden Street community.\n\nAs you may know, Crestline is proud to be bringing [b]The Linden[/b] — 212 thoughtfully designed residences — to the former Cap & Seal site. We believe 118 Linden Street could play an exciting role in that future, and we would welcome the chance to discuss a partnership at your convenience.\n\nNo pressure, of course. Take all the time you need." % n, CREST_SIGN]]}
		"crestline_poster":
			return {"blocks": [["corporate", "CRESTLINE PROPERTIES", "Hi %s,\n\nQuick one! Our marketing team would love to place a tasteful \"Coming Soon: The Linden\" poster in your front window. In recognition of the visibility, Crestline would credit you [b]$120 per week[/b].\n\nIt's a small way to show the neighborhood that change is coming — together." % n, "Warm regards,\n\nMadison Park\nCommunity Engagement Coordinator"]],
				"buttons": [{"label": "Decline politely", "value": "no"}, {"label": "Accept the poster ($120/week)", "value": "yes", "primary": true}]}
		"crestline_offer":
			return {"blocks": [["corporate", "CRESTLINE PROPERTIES", "Dear %s,\n\nFollowing up on our earlier note, Crestline Properties is pleased to present a formal offer to purchase the property and business at 118 Linden Street:\n\n[center][font_size=24][b]$400,000[/b][/font_size][/center]\nThis offer reflects our deep respect for the Alcántara family legacy. It will remain open until [b]September 28[/b]. Should you accept, our team will handle everything, including the relocation of existing equipment and tenants.\n\nWe'd hate for you to carry the weight of an aging building alone." % n, CREST_SIGN]]}
		"tax":
			return {"blocks": [["corporate", "CITY OF HARBORVIEW · ASSESSOR'S OFFICE", "[b]NOTICE OF PROPERTY REASSESSMENT[/b]\n\nParcel: 118 LINDEN ST (ALCÁNTARA, R. — ESTATE)\n\nDue to significant new development in the surrounding area, the assessed value of the above parcel has been revised. Your property tax obligation will increase by [b]$75 per week[/b], effective immediately.\n\nThis notice is informational. No action is required.", ""]]}
		"hearing":
			return {"blocks": [["corporate", "HARBORVIEW CITY COUNCIL", "[b]PUBLIC HEARING — REZONING APPLICATION #2291 (\"THE LINDEN, PHASE II\")[/b]\n\nApplicant: Crestline Properties LLC. The application requests rezoning of parcels 110–124 Linden Street, including 118 Linden Street, for high-density residential use.\n\nHearing: [b]Friday, September 26, 7:00 PM[/b], Council Chambers. Members of the public may speak for up to three minutes. Written petitions will be entered into the record.", ""]]}
		"crestline_final":
			return {"blocks": [["corporate", "CRESTLINE PROPERTIES", "%s,\n\nOur final offer for 118 Linden Street is [b]$750,000[/b], valid through today. I'll stop by this morning in person.\n\nWhatever you decide — and I do mean this — the building won't get any younger." % n, CREST_SIGN]]}
	return {}


## What happens after a letter with choices.
static func on_choose(id: String, value: Variant) -> void:
	if id != "crestline_poster":
		return
	if value == "yes":
		G.flags.poster_deal = true
		G.add_stat("community", -8)
		UI.toast("A glossy poster goes up in the window. It looks very… clean.", "icon_coin")
	else:
		G.flags.poster_declined = true
		G.add_stat("community", 3)
		UI.toast("You drop the letter in the recycling. It feels good.", "icon_heart")
