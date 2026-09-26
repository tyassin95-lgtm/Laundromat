// The neighbours: regulars who come in with their laundry and stay to talk.
// Luis Delgado (the market across the street), Priya Raman (ER nurse, nights),
// Mrs. Fatima Haddad (Alder Arms, 3C) and Kai (bike courier, sock investigator).
// Story moments play when they come in (events.js, on: 'arrive'); otherwise a chat from their
// pool in chatter.js. Gift reactions are used once they have in-world art.
export default `
// ------------------------------------------------------------------ Luis Delgado
=== delgado_intro
<<flag met_delgado>>
: The bell. A broad man in a green shop apron backs through the door, a hamper of folded tablecloths on his hip.
delgado.smile: So it's true. Rosa's granddaughter. Mija, you have her chin. The stubborn part.
me.laugh: I'll take that as a compliment.
delgado.laugh: It is one! Luis Delgado. Delgado's Market, right across the street. Thirty-one years.
delgado.neutral: Store aprons and the good tablecloths. Rosa did them every week. She paid me in gossip and I paid her in limes.
* I'll keep the gossip coming.
  delgado.laugh: Good! Mrs. Haddad knows everything on this street, but she doesn't share.
  <<rel delgado 25>>
* Limes sound like a fair currency.
  delgado.smile: The fairest. Come by the store. The first bag is on me.
  <<rel delgado 20>>
<<diary "Met Luis Delgado from the market across the street. He says I have Rosa's chin. The stubborn part.">>

=== delgado_rent
<<flag delgado_rent>>
: Luis sets his hamper on the counter and doesn't let go of it right away.
delgado.sad: New landlord, new lease. Five thousand a month, mija. For a corner store. For limes.
delgado.neutral: My father opened that store with one fridge and a radio. I always said, Luis, you close when you're ready. Turns out a company decides when you're ready.
* That's robbery. Can anyone do anything?
  delgado.sad: June says fight. My wife says rest. My knees say rest, louder.
  <<rel delgado 25>>
* I'm scared the same thing is coming for Rosa's.
  delgado.neutral: It is. Don't let them tell you it isn't. They smile while they measure.
  delgado.smile: But you have something I didn't. People who come in every week and sit down. Nobody sits down in a bodega.
  <<rel delgado 30>>
<<diary "Luis's rent is going to five thousand a month. “A company decides when you're ready.”">>

=== delgado_last_load
<<flag delgado_last_load>>
: Luis comes in slowly today. The hamper holds every apron the store ever owned, folded smaller than they need to be.
delgado.sad: Last load, mija. Thirty-one years of aprons. After Saturday there's nobody left to wear them.
delgado.neutral: I wanted Rosa's to be the one to wash them. She'd have made a speech. I'll spare you.
* Make a speech anyway.
  me.sad: To Delgado's. For the free limes, and the bread basket, and thirty-one years of being open when people needed you.
  delgado.sad: ...Ay. You sound just like her. That's not fair.
  <<rel delgado 40>>
  <<community 3>>
* This load is on the house.
  delgado.smile: No, no, I can't — ...fine. Fine. Rosa did the same when my father died. You people are impossible.
  <<money -16 "Luis's last load, on the house">>
  <<rel delgado 35>>
  <<community 4>>
delgado.neutral: When the store is empty, I'm keeping one thing back for you. For the shop.
<<diary "Luis brought the last of Delgado's aprons. I think he just wanted somebody to watch them come out clean.">>

=== delgado_after
<<flag delgado_after>>
delgado.neutral: Just my own shirts today. Five shirts. Strange, washing for one man.
delgado.smile: My wife says I'm underfoot, so I walk. To the river, to the park. There's a market in the park on Sundays. Everybody sells something.
* You should sell something. Limes, maybe.
  delgado.laugh: You and June both! She already painted me a sign. "Delgado's — Now Outdoors."
  <<flag delgado_stall>>
  <<rel delgado 30>>
* How are you, really?
  delgado.sad: Some mornings I still wake at five to open up. Then I remember.
  delgado.smile: So I drink my coffee on the stoop and say good morning to everybody anyway. The store is gone. The corner isn't.
  <<rel delgado 30>>

=== delgado_c1
delgado.laugh: The avocados came in hard as rocks today. I told them, you have until Friday. Then I get serious.

=== delgado_c2
delgado.neutral: Rosa and I had a deal. Anybody who couldn't pay for a wash, she sent across the street with a note, and I gave them a sandwich.
delgado.smile: Thirty years, never once did either of us say it out loud.

=== delgado_c3
delgado.neutral: Advice from an old grocer, mija. Never trust a man who irons his jeans. Or a tomato in January.

=== delgado_c4
delgado.laugh: I sold the old cash register to a man from a movie studio. It's going to be in a film about the eighties. So am I, apparently. "Background grocer."

=== delgado_c5
delgado.sad: Remy painted the wall beside my store, you know. "Harbor Dreams." Six years of people taking photographs in front of it.
delgado.neutral: One afternoon, three coats of grey. Like it was never there. But I remember every boat.

=== delgado_c6
delgado.smile: Marisol, my wife, says hello. She also says I talk too much at the laundromat. I told her, where else am I supposed to talk?

=== gift_delgado_love
delgado.laugh: For me? Ay, mija. Now I owe you limes for a year.
delgado.smile: Rosa taught you this. Giving people exactly the right thing. Thank you.

=== gift_delgado_like
delgado.smile: That's kind. Thank you, mija.

=== gift_delgado_neutral
delgado.neutral: Oh! Thank you. I'll find a good place for it.

=== gift_delgado_dislike
delgado.neutral: Ah. Well. Marisol will know what to do with it. She always does.

// ------------------------------------------------------------------ Priya Raman
=== priya_intro
<<flag met_priya>>
: The door bangs open. A woman in teal scrubs and an enormous yellow cardigan drops a tote bag on the counter like it owes her money.
priya.tired: Scrubs. Rush, if the universe allows. I've been awake since yesterday.
me.surprised: ...Good morning?
priya.neutral: Is it? I'll take your word for it. Priya. ER, nights, St. Anne's. You're Rosa's granddaughter.
priya.smile: She used to fold my scrubs like little presents. Put a mint on top. I'd find it at four in the morning and nearly cry into the vending machine.
* I'll find you a mint.
  priya.smile: Careful. Don't make promises to a nurse. We remember everything.
  <<rel priya 25>>
* Rush it is. Go get some sleep.
  priya.laugh: Sleep. Ha. Cute.
  <<rel priya 20>>
<<diary "Priya, ER nurse on nights, wants her scrubs folded like presents. With a mint on top. Rosa did it for years.">>

=== priya_bench
<<flag priya_bench>>
: Priya drops off her bag, sits on the bench "for one second," and is asleep before the second is over.
: A walk-in eyes the bench. Two kids with soccer bags peer at her like she's a museum exhibit.
* Let her sleep. Hang a sign: QUIET PLEASE, HERO AT REST.
  : The kids tiptoe. The walk-in folds in total silence. For forty minutes, Rosa's is the quietest room on Linden Street.
  priya.tired: ...Did you put a sign on me? You put a sign on me.
  priya.laugh: Nobody's done anything that nice for me since my grandmother. Don't tell anyone.
  <<rel priya 35>>
  <<community 2>>
* [if item.tea > 0] Wake her gently with a cup of tea.
  <<take tea 1>>
  priya.tired: Mm. Tea. You're a saint. A low-ranking saint, but a saint.
  <<rel priya 30>>
* Leave her be and get back to work.
  : She wakes with a jolt twenty minutes later, checks her watch, swears at it, and runs.
  <<rel priya 10>>

=== priya_rosa_night
<<flag priya_rosa_night>>
priya.neutral: Can I tell you something weird? Rosa's is the only place I've ever cried in public.
priya.tired: Three in the morning. I lost a kid on my shift. Seven years old. I couldn't go home, so I came here. Rosa was still open.
priya.neutral: She didn't ask anything. Put the kettle on, folded my scrubs, and let me sit in the chair by the window until the sun came up.
* That's what she kept the lights on for.
  priya.smile: Yeah. I know. That's why I'm going to be a massive pain in Crestline's neck.
  <<rel priya 40>>
* I'm so sorry, Priya.
  priya.neutral: Don't be sorry. Just be open at three in the morning sometimes. That's all anybody needs.
  <<rel priya 35>>
<<diary "Priya told me about the night she lost a patient and came here, and Rosa let her sit by the window until sunrise.">>

=== priya_petition
<<flag priya_petition>>
priya.neutral: I hear there's a petition. Give me a clipboard.
: She takes three. Then a fourth, "for the pediatric floor. They're competitive."
priya.smile: Nurses sign things. We also bring snacks, and we've seen far worse than a city council.
<<petition 30>>
<<rel priya 30>>
<<flag nurses_signed>>

=== priya_c1
priya.tired: Full moon tonight, and a Friday. Pray for me.

=== priya_c2
priya.neutral: I drink coffee to stay awake so I can finish my shift so I can go home and not sleep. The system works.

=== priya_c3
priya.smile: You know what's wild? You're the only person I talk to all week who isn't bleeding.

=== priya_c4
priya.laugh: Someone came in last night with a sock stuck on their — no. Patient confidentiality. Also, you're about to eat lunch.

=== priya_c5
priya.neutral: My mother calls every Sunday to ask when I'm going to get a day job. I tell her I have a day job. It's just at night.

=== priya_c6
priya.tired: After the storm the ER was all people who fell off ladders clearing gutters. Stay off ladders. That's the whole lecture.

=== gift_priya_love
priya.laugh: Are you serious? Okay, you're officially my favourite person on Linden Street. Don't tell the other nurses.

=== gift_priya_like
priya.smile: For me? That's really sweet. Thank you.

=== gift_priya_neutral
priya.neutral: Oh — thanks! I'll put it in my locker. It'll be the nicest thing in there.

=== gift_priya_dislike
priya.tired: Ah. I'm... allergic to that. Most of it. It's the thought that counts. Mostly.

// ------------------------------------------------------------------ Mrs. Fatima Haddad
=== haddad_intro
<<flag met_haddad>>
: A small woman in a plum headscarf sets down a hamper of flowered sheets and inspects you over her reading glasses.
haddad.neutral: So. You are the one. Rosa's granddaughter. Turn around.
me.surprised: Sorry?
haddad.smile: Too thin. Rosa was also too thin. I fed her for forty years and it did nothing. Fatima Haddad. Alder Arms, 3C.
haddad.neutral: Sheets for my grandchildren. Lavender softener. Rosa kept a bottle just for me, on the top shelf, behind the bleach.
* I'll find the lavender.
  haddad.smile: Good. You have her hands. Now eat something.
  <<rel haddad 25>>
* How many grandchildren?
  haddad.laugh: Seven. In one bed, when there's thunder. One day I'll bring them, and you'll be sorry.
  <<rel haddad 20>>
<<diary "Met Mrs. Haddad from the Alder Arms. She says I'm too thin, and that Rosa hid lavender softener behind the bleach for her.">>

=== haddad_grandkids
<<flag haddad_grandkids>>
: The door opens and seven children pour through it like a burst pipe. Mrs. Haddad follows, serene, carrying sheets.
haddad.laugh: I warned you. All seven. Say hello to Rosa's granddaughter.
: Seven hellos, not one of them together. The smallest girl presses her face to a washer and watches it spin.
haddad.smile: This one says the machines are little oceans. Rosa used to let her press the start button.
* Let her press the start button.
  : She presses it with enormous ceremony. The washer rumbles. She gasps like she's launched a rocket.
  haddad.smile: Now you have a friend for life. Also, a responsibility.
  <<rel haddad 35>>
* Put the older ones on lint-trap duty.
  : Three children fight over the lint brush. The dryers have never been so clean.
  haddad.laugh: Rosa's trick exactly. She got a free afternoon of cleaning out of me once, and I was fifty.
  <<rel haddad 30>>
  <<community 2>>
<<diary "Mrs. Haddad brought all seven grandchildren. The littlest one calls the washers little oceans.">>

=== haddad_letter
<<flag haddad_letter>>
haddad.worried: You heard. Everybody heard. Ninety days, the letter says. Like milk.
haddad.neutral: My husband carried our refrigerator up three flights of stairs in 1979. Karim was a stubborn man. I am more stubborn.
<<if flag.tenants_meetings>>
haddad.smile: And you gave us your shop on Thursday nights. June told me. I'm bringing ma'amoul. Don't argue. You'll lose.
<<rel haddad 35>>
<<else>>
haddad.neutral: June holds the meetings in my living room. The chairs are good. Come, if you want to watch old people plan a revolution.
<<rel haddad 25>>
<<endif>>
<<diary "Mrs. Haddad got the Crestline letter too. “Ninety days. Like milk.”">>

=== haddad_maamoul
<<flag haddad_maamoul>>
: Mrs. Haddad puts a tin on the counter before her laundry, which tells you which one matters more.
haddad.smile: Ma'amoul. Dates and walnuts. My mother's recipe, and her mother's. Share them with the people who sit on your bench.
haddad.neutral: In Beirut, when things were bad, we fed each other. That's all politics is, habibti. Who feeds who.
<<give maamoul 3>>
<<rel haddad 30>>

=== haddad_c1
haddad.neutral: Eat something. You look like a question mark.

=== haddad_c2
haddad.laugh: My granddaughter wants to be a laundromat when she grows up. Not to work in one. To be one.

=== haddad_c3
haddad.neutral: June and I agree about nothing. Except Crestline. And the correct way to fold a fitted sheet, which is mine.

=== haddad_c4
haddad.smile: My mother dried everything on the roof in the sun. Sheets so stiff you could stand them in a corner. That was a clean I've never found since. Until here, almost.

=== haddad_c5
haddad.worried: I've started packing. Only the winter things. Only to be ready. Don't tell June.

=== gift_haddad_love
haddad.smile: Oh, habibti. Look at this. You didn't have to.
haddad.laugh: Now I have to feed you twice as much. Those are the rules.

=== gift_haddad_like
haddad.smile: How thoughtful. Rosa raised you well, even from far away.

=== gift_haddad_neutral
haddad.neutral: For me? Thank you, dear. I'll put it with my good things.

=== gift_haddad_dislike
haddad.worried: Hm. I'll give it to my son-in-law. He likes strange things.

// ------------------------------------------------------------------ Kai
=== kai_intro
<<flag met_kai>>
: A bike courier in a dripping orange rain jacket squelches up to the counter and slaps down a drawstring bag.
kai.excited: Hi! Hello. Question. Where do the socks go?
me.thinking: ...Into the washer?
kai.neutral: In, yes. Out, no. I put in eight socks, I get back seven. Every time. Three laundromats, two years. I have a spreadsheet.
kai.grin: I'm Kai. I deliver things. And I'm going to find out where the socks go.
* It's the dryers. They eat them.
  kai.excited: THAT'S WHAT I SAID. Nobody believes me!
  <<rel kai 25>>
* I'll keep an eye out. Anything in particular?
  kai.neutral: Green, with yellow lightning bolts. My lucky sock. I've had it since eighth grade. It went missing in April, and so did my luck.
  <<flag kai_lucky_asked>>
  <<rel kai 25>>
<<diary "Kai, a bike courier, believes in a sock conspiracy. Kai has a spreadsheet.">>

=== lucky_sock_found
: A green sock with little yellow lightning bolts. Kai's lucky sock! Better keep it safe until Kai comes in.

=== kai_lucky
<<flag kai_lucky>>
me.laugh: Kai. Close your eyes and hold out your hand.
kai.worried: Is it a spider? It's a spider, isn't it.
: You place one green sock with yellow lightning bolts in Kai's palm.
kai.excited: No. NO. Where — how — it's been FIVE MONTHS.
me.smug: Behind dryer two. It had a lot of friends back there.
kai.excited: I KNEW IT. The dryers! I'm updating the spreadsheet. You're in the acknowledgements.
<<rel kai 45>>
<<diary "Gave Kai back their lucky sock. I've never seen a person so happy about a sock.">>

=== kai_sales_office
<<flag kai_sales_office>>
kai.neutral: So. Weird week. I got a regular delivery gig. Guess where.
me.thinking: Somewhere with a lot of socks?
kai.worried: The Linden sales office. Crestline's. They have a model of the whole block under glass. Tiny trees. Tiny people holding tiny lattes.
kai.neutral: Rosa's is in it, except it isn't Rosa's. The label says LAUNDRY LOUNGE, PREMIUM AMENITY. There's a tiny espresso bar where your folding table is.
* They've moved in already. In miniature.
  kai.worried: Right? It gave me the creeps. Someone asked me what I thought of "the old laundromat." Like it was already old.
  <<rel kai 25>>
* Could you get a photo of that model?
  kai.grin: I'm a courier. Nobody looks at couriers. I'm basically invisible.
  kai.excited: Give me two days.
  <<flag kai_photo_asked>>
  <<rel kai 30>>

=== kai_photo
<<flag kai_intel>>
kai.excited: Okay. Don't freak out. Okay, freak out a little.
: Kai slides their phone across the counter: the model of Linden Street under glass, and a printed sheet taped beside it. PHASE II.
kai.worried: Look at Phase Two. The Alder Arms isn't getting renovated. It's gone. They told everyone ninety days of renovations, and the plan says demolition.
me.surprised: They lied to June. To all of them.
kai.neutral: So, um. Is that the kind of thing a city council would want to see?
<<community 5>>
<<rel kai 35>>
<<diary "Kai photographed Crestline's sales model. The Alder Arms isn't being renovated. Phase Two says demolition.">>

=== kai_c1
kai.grin: River to Fifth Avenue in eleven minutes. In the rain. On a bike with one working brake. Personal record.

=== kai_c2
kai.neutral: Sock count today: eight in, eight out. Suspicious. They know I'm onto them.

=== kai_c3
kai.neutral: Every building on this street has a smell. The Corner Cup smells like burnt sugar. Rosa's smells like warm towels.
kai.worried: The Crestline office smells like nothing. Nothing is the worst smell.

=== kai_c4
kai.grin: People tip better when it rains. So statistically I love rain. Emotionally, I'm a wet cat.

=== kai_c5
kai.excited: The sales office gives me free sparkling water every delivery. I've taken forty. Small acts of resistance.

=== gift_kai_love
kai.excited: For ME? Oh, this is going straight on my handlebars. Or my wall. Or both!

=== gift_kai_like
kai.grin: Nice! Thanks. You're good people.

=== gift_kai_neutral
kai.neutral: Oh, cool. Thanks! It'll fit in the bag. Everything fits in the bag.

=== gift_kai_dislike
kai.worried: Oh. Huh. I'll... find someone who needs this. Probably.
`;
