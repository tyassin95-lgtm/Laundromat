export default `
=== prologue
<<hud off>>
: Linden Street. A Sunday night at the end of August.
: For fifty-three years, the lights of Rosa's Laundromat stayed on until midnight.
: Three weeks ago, Rosa Alcántara turned them off for the last time.
: Her will was one page long. The shop. The flat upstairs. The cat.
: And a note, folded small.
<<letter rosa_will>>
me.sad: Oh, Abuela.
me.thinking: One month. I'll give it one month and see what this place is.
me.neutral: Number three sticks. Kick it low, left side. Got it.
<<flag prologue_done>>

=== d1_wake
<<hud on>>
<<sfx meow>>
: Rain ticks against the big window. The flat still smells like Rosa's cinnamon tea.
me.tired: Morning, Biscuit.
biscuit: ...
me.smug: Great talk.
: *Tap* the floor to hop there. *Tap* things to use them — {name} pops over and does the rest.
me.thinking: The shop opens at eight. Rosa never opened late in fifty-three years. No pressure.
<<goal "Pet Biscuit if you like, then head downstairs (the door on the left).">>

=== d1_open
: The laundromat is dim and dusty and exactly the same as when you were eight.
me.surprised: The machines are all still here. Even Grumpy.
me.worried: ...And Grumpy has an OUT OF ORDER sign on him. Of course he does.
: Customers leave bags on the *counter* by the pickup shelf. Wash them, dry them, fold them, and shelve them before their pickup time.
: Walk-ins use the free washers on their own and pay in coins. Everyone likes a clean floor and a working machine.
me.thinking: Okay. Flip the sign. Be a laundromat person.
<<sfx toggle>>
<<goal "Wait for your first customer.">>

=== d1_walt_visit
<<visit walt order stay 300>>

=== walt_intro
<<flag met_walt>>
walt.neutral: So. You're the granddaughter.
me.surprised: I — yes. Hi. {name}. You knew my grandmother?
walt.neutral: Forty-four years of Tuesdays and Fridays.
me.thinking: It's Monday, though.
walt.angry: I know what day it is.
walt.neutral: Wanted to see if anybody was going to open. Rosa never missed a morning.
* She told me a lot about you.
  walt.content: Did she, now.
  walt.neutral: Lies, probably. Most of them flattering.
  <<rel walt 20>>
* Sorry — we're still getting set up.
  walt.angry: Place has been set up since 1972, kid. Machines don't care what you feel like.
  <<rel walt -5>>
* Do you want a coffee? I think there's a kettle somewhere.
  walt.neutral: I want my laundry done. Coffee's a bonus.
  walt.smile: ...Black. Two sugars. If there's a kettle.
  <<rel walt 10>>
walt.neutral: Warm water. No bleach. Fold it like she did.
me.worried: Like she — right. Sure. Absolutely.
walt.neutral: I'll wait. Got nowhere to be.
<<goal "Tap the bag on the counter to pick up Walt's laundry.">>

=== tut_carry
<<flag tut_carry_done>>
: You're holding the bag. *Gold arrows* show where it can go next.
: Tap a free *washer*. {name} pops over and loads it.
<<goal "Put the laundry in a free washer.">>

=== tut_loaded
: The drum starts turning. A washer takes about half an hour of shop time.
: While it runs, keep an eye on the counter — more bags will show up.
<<goal "When the washer beeps, unload it and move the laundry to a dryer.">>

=== tut_unloaded
: Damp and heavy. Now a *dryer* — the tall stacked tower has two drums.
<<goal "Load the laundry into a dryer.">>

=== tut_ready
: Folded, bagged, tagged, and on the *pickup shelf*. Customers collect at their pickup time and pay — tips are better when it's on time and folded well.
<<if ev.o and ev.o.who == "walt">>
: Walt's waiting in person, though. Tap *Walt* to hand it over.
<<goal "Hand Walt his laundry (tap him).">>
<<else>>
: Friends who wait in the shop collect in person — tap them to hand it over.
<<endif>>

=== walt_d1_handover
walt.neutral: Hm.
: He shakes out a shirt. Refolds it. Looks at it for a long time.
walt.neutral: Rosa folded tighter.
me.worried: I'm a little out of practice.
walt.smile: You were eight. You folded everything into triangles.
me.surprised: You remember that?
walt.content: I remember everything. That's the problem with getting old.
walt.neutral: Number three sticks, by the way. Kick it low, left side.
me.laugh: That's what her note said!
walt.neutral: Who do you think told her?
<<rel walt 15>>
<<if flag.w3_fixed>>
<<goal "Keep the orders moving until closing time (6 PM).">>
<<else>>
walt.neutral: You've got a spare parts kit on the supply shelf. Fix it before the lunch rush.
<<goal "Repair washer #3 — tap it. (Stop the needle in the green zone.)">>
<<endif>>
<<leave walt>>

=== tut_repaired
<<flag w3_fixed>>
me.smug: Low, left side. And three bolts, and a new belt, and a little prayer.
: Machines wear down with every cycle. Tune them up before they break — and keep spare parts on the shelf.
<<goal "Keep the orders moving until closing time (6 PM).">>

=== d1_june_visit
<<visit june stay 70>>

=== june_intro
<<flag met_june>>
june.gentle: There she is. There's that face.
me.surprised: ...Mrs. Ito?
june.happy: You remember! Third grade, room 12. You drew a horse on your spelling test and got every word right.
me.laugh: You gave me a B for "presentation."
june.sly: Standards, dear. Standards.
june.neutral: I brought a casserole. Nobody on Linden Street has ever grieved on an empty stomach, and we won't start with you.
<<give lemon_bars 1>>
june.neutral: ...And lemon bars. The casserole's upstairs on your stove. I still have a key. Rosa and I swapped keys in 1987.
* Thank you, Mrs. Ito. Really.
  june.gentle: June. You're a grown woman with a business now. June.
  <<rel june 20>>
* You have a key to my apartment?
  june.sly: I have a key to half the apartments on this street, dear. Nobody's ever complained.
  <<rel june 10>>
june.thinking: I live next door, in the Alder Arms. And I keep the community garden out back. Come by in the evening sometime — the tomatoes are embarrassing this year.
<<leave june>>

=== d1_close
<<sfx toggle>>
: CLOSED. The sign swings on its chain.
me.tired: I have folded more shirts today than in my whole life.
me.thinking: But the till isn't empty. And nothing caught fire.
: The evenings are yours. Head out the *front door* to see the neighbourhood, or go *upstairs* to rest.
<<unlock map>>
<<diary "First day. Walt says Rosa folded tighter. June brought lemon bars.">>
<<goal "Evening: explore Linden Street (front door) or rest upstairs.">>

=== remy_intro
<<flag met_remy>>
: A woman with pink hair is stacking café chairs outside the Corner Cup. She clocks you instantly.
remy.skeptical: You're the heiress.
me.surprised: The — I'm sorry?
remy.neutral: Rosa's granddaughter. Everybody's talking about you. There's a pool on how long before you sell.
me.worried: There's a *pool*?
remy.wink: I've got the eighteenth. Don't let me down.
* I'm not selling.
  remy.skeptical: Everybody says that. Then a guy in a nice coat shows up with a big number.
  me.thinking: Well — I'm not everybody.
  remy.neutral: ...We'll see. I'm Remy.
  <<rel remy 15>>
* Honestly? I don't know yet.
  remy.neutral: Huh. At least you're honest.
  remy.neutral: Remy. I make the coffee here. And the art. And the trouble, mostly.
  <<rel remy 20>>
* Who has the thirtieth?
  remy.excited: Ha! Luis at the bodega. He's an optimist.
  remy.neutral: Remy. Come get a coffee sometime. On the house — Rosa never let me pay for a wash.
  <<rel remy 18>>
<<give coffee 1>>

=== d1_maya_knock
<<if time < 21 * 60 + 30>>
: You spend the evening unpacking Rosa's things. Recipe cards. A shoebox of photos. An astonishing number of single socks.
<<time 22:00>>
<<endif>>
<<sfx phone_buzz>>
: *Tap. Tap-tap.* Someone is knocking on the shop's front glass, downstairs.
me.surprised: At ten at night?
* Go down and see who it is.
  <<scene laundromat front>>
  <<visit maya stay 90>>
* Pretend you're asleep.
  me.tired: Whoever you are, I love you, and also go away.
  : The knocking stops. Footsteps fade down Linden Street.

=== maya_intro
<<flag met_maya>>
<<if phase == "shift">>
-> maya_intro_day
<<endif>>
maya.worried: Oh — sorry. Sorry. I saw a light. I didn't know if…
me.neutral: If anyone was here?
maya.neutral: Rosa used to let me do my laundry after close. I work nights at the pharmacy on Mill Road. I'm Maya.
me.thinking: {name}. I'm her granddaughter.
maya.content: Yeah. You have her eyebrows.
: She's wearing big headphones around her neck. You can hear something faint and rhythmic leaking out.
* Come on in. The machines don't sleep.
  maya.laugh: That's exactly what she used to say.
  <<rel maya 25>>
  <<flag maya_night_ok>>
* We're closed, but — just this once.
  maya.content: I'll be quick. Thank you. Really.
  <<rel maya 15>>
maya.sly: Machine two, if it's still alive. It has the best rhythm.
me.surprised: The *best rhythm*?
maya.neutral: You'll hear it. Once you hear it you can't un-hear it.
<<goal "Go up to bed when you're ready (back door).">>
<<diary "A girl named Maya came in at 10pm to listen to machine two. I think I like her.">>

=== maya_intro_day
: A girl in a green jacket stops in the doorway, big headphones around her neck, a laundry bag over one shoulder.
maya.worried: Oh — you're open. Sorry. I wasn't sure anyone would be.
me.neutral: Just about. I'm {name}. Rosa's granddaughter.
maya.content: Yeah. You have her eyebrows.
maya.neutral: I'm Maya. I work nights at the pharmacy on Mill Road. Rosa used to let me do my laundry after close, when it's quiet.
: You can hear something faint and rhythmic leaking out of her headphones.
* Come by after close, then. The machines don't sleep.
  maya.laugh: That's exactly what she used to say.
  <<rel maya 25>>
  <<flag maya_night_ok>>
* Days are fine too, you know.
  maya.content: Days are loud. But — thanks. Really.
  <<rel maya 15>>
maya.sly: Machine two, if it's still alive. It has the best rhythm.
me.surprised: The *best rhythm*?
maya.neutral: You'll hear it. Once you hear it you can't un-hear it.
<<diary "A girl named Maya came in with headphones on and listened to machine two. I think I like her.">>

=== remy_intro_shop
<<flag met_remy>>
: A woman with pink hair and paint on her sleeves leans on the counter like she owns it.
remy.skeptical: You're the heiress.
me.surprised: The — I'm sorry?
remy.neutral: Rosa's granddaughter. You never come by the café, so I came to you. There's a pool on how long before you sell.
me.worried: There's a *pool*?
remy.wink: I've got the eighteenth. Don't let me down.
* I'm not selling.
  remy.skeptical: Everybody says that. Then a guy in a nice coat shows up with a big number.
  remy.neutral: ...We'll see. I'm Remy. Corner Cup, next door but one.
  <<rel remy 15>>
* Honestly? I don't know yet.
  remy.neutral: Huh. At least you're honest. I'm Remy. I make the coffee at the Corner Cup. And the art. And the trouble, mostly.
  <<rel remy 20>>
<<give coffee 1>>
<<flag remy_shop_1>>

=== d2_camera
: Tucked into the window seat cushions: Rosa's old film camera, a strap worn soft as cloth.
me.surprised: Abuela's camera. She took a picture of every customer's first load for years.
me.thinking: There's film in it. Maybe I'll take it with me in the evenings.
<<flag has_camera>>
<<toast "Rosa's camera: take photos at spots marked with a dot around the neighbourhood.">>

=== d2_letter
: There's an envelope under the door. Heavy paper. Embossed.
<<letter crestline_1>>
me.worried: "No pressure, of course." That's what people write when there's pressure.
<<flag crestline_letter_1>>

=== walt_d2
walt.neutral: Tuesday.
me.smug: Tuesday. Nine o'clock. I've been warned.
walt.content: Good. You're learning.
<<if flag.crestline_letter_1>>
walt.neutral: You got the letter.
me.surprised: How did —
walt.angry: Everybody on this block got the letter. Rosa got one a month. She kept them with the lint.
<<endif>>
walt.neutral: Warm water. No bleach.
<<rel walt 10>>

=== remy_shop_1
<<flag remy_shop_1>>
remy.neutral: So this is the empire.
me.laugh: This is the empire.
remy.skeptical: Café aprons. There's espresso in places you wouldn't believe. Also paint. Don't ask about the paint.
remy.neutral: ...You kept everything the same.
me.thinking: I haven't had time to change anything.
remy.content: Don't. Or — change the right things. Rosa used to say people can smell when a place stops being loved.
<<rel remy 15>>

=== june_knit
<<flag learned_knit>>
june.thinking: Rosa's yarn basket is still upstairs, isn't it? Teal wool, a half-finished sock?
me.surprised: How do you know that?
june.sly: She's been half-finishing that sock since 2011.
june.gentle: Come here. Hold your hands like this. Knit one... and around... and pull through. There.
me.worried: It looks like a pretzel.
june.happy: Everything looks like a pretzel at first. You held your pencil like a claw in third grade and look at you now.
: You learned to knit! Try the yarn basket upstairs in the mornings or evenings.
<<rel june 25>>

=== maya_record
<<flag maya_recorded>>
: Maya sets a little recorder on top of washer two and closes her eyes.
maya.content: Listen. Hear that? *Chug*-a-chug, chug-*chug* — the drum's a little off-balance. It swings.
me.thinking: I… do hear it. Oh no. I can't un-hear it.
maya.laugh: Told you!
maya.neutral: I make beats. Music. Sort of. For me, mostly. Nobody hears them.
* I'd like to hear them sometime.
  maya.worried: Maybe. When one's… done.
  <<rel maya 20>>
* Record whatever you want in here. Any time.
  maya.content: Seriously? The dryers alone are a whole string section.
  <<rel maya 25>>
  <<flag maya_studio>>

=== walt_park_1
<<flag walt_park_1>>
: Walt is on the bench by the fountain, a paper bag of crumbs on his knee and eleven pigeons at his feet.
walt.neutral: Don't tell anyone.
me.smug: That you have friends?
walt.laugh: Ha! They're not friends. They're associates.
walt.content: Peg used to feed them. Every evening. I figure somebody's got to keep up her end.
<<rel walt 15>>

=== june_garden_1
<<flag june_garden_1>>
june.happy: You came! Look at these tomatoes. Absolutely shameless.
june.gentle: Take some flowers whenever you like, dear. Rosa always kept a jar of them on the counter.
june.thinking: That little tree in the corner is a persimmon. My Hiro planted it the year before he passed. It's never fruited. I keep telling it to hurry up.
<<rel june 15>>

=== d4_poster
: Another envelope. This one smells like printer toner and optimism.
<<letter crestline_poster>>

=== walt_tab
<<flag tab_asked>>
walt.neutral: Kid. I'll be straight with you.
walt.sad: Pension's late this month. Something with the bank. I can't pay for today.
walt.neutral: Rosa used to keep a tab. I always paid it off. Always.
* Of course. Put it on the tab.
  walt.content: ...Thank you.
  walt.neutral: I'll fix that door hinge that's been squeaking. Call it interest.
  <<flag walt_tab>>
  <<money -16 "Walt's tab (covered for now)">>
  <<rel walt 45>>
  <<community 3>>
* It's on the house, Walt.
  walt.angry: I'm not a charity case.
  walt.neutral: ...But thank you. I'll owe you.
  <<flag walt_tab>>
  <<money -16 "Walt's laundry (on the house)">>
  <<rel walt 30>>
* I'm sorry, Walt. I can't afford to run tabs right now.
  walt.sad: No. No, I get it. Different times.
  walt.neutral: ...I'll scrape it together. Don't worry about it.
  <<rel walt -15>>

=== remy_bodega_rumor
<<flag bodega_rumor>>
remy.worried: Luis's landlord sold the building. To guess who.
me.worried: Crestline?
remy.skeptical: Crestline. The new rent is basically a ransom note. Luis says he's fine. Luis is not fine.
remy.neutral: That bodega's been there since I was a baby. He used to give me free limes for "being brave at the dentist."
<<rel remy 15>>
<<diary "Remy says Delgado's might close. Crestline bought the building.">>

=== d6_cat
<<cat on>>
<<sfx meow>>
: A soft thump. Biscuit has come downstairs, climbed onto the warm dryer, and is now asleep in a way that suggests he owns the business.
me.laugh: Biscuit! You can't just —
me.smug: ...Okay, you can.
<<community 2>>

=== d7_sunday
: Sunday. The shop stays closed — Rosa's one rule.
me.thinking: The bills come due tonight. I should check the ledger in my journal.
me.neutral: But first: the neighbourhood. People. Maybe a flea market.
<<goal "Sunday: explore, see friends, maybe visit the flea market in the park. Bills due tonight.">>

=== market_intro
<<flag market_seen>>
: A dozen folding tables under the park trees: records, teacups, lamps, a man selling exclusively left shoes.
me.laugh: This is my favourite place now.
: The *flea market* runs on weekends. Tap the market table to browse records and decor.
`;
