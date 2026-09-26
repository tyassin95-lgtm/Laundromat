// Errands (side missions): each has an offer and a thank-you. See data/quests.js.
export default `
=== q_walt_scarf_offer
: Walt tugs at the grey thing around his neck. It is less a scarf than a rumour of one.
walt.neutral: Peg knit this in 1979. It's been through two recessions and a beagle.
me.thinking: Walt, it's mostly holes.
walt.content: Holes are part of it. Keeps the air moving.
: He says it lightly. He also rewraps it very, very carefully.
* I've been learning to knit. Let me make you a new one.
  walt.neutral: Don't make it a thing.
  walt.content: ...Grey. If you're going to. Nothing with pompoms.
  <<quest start walt_scarf>>
* It suits you, holes and all.
  walt.content: Hm. Peg would've said the same.
  <<quest later walt_scarf>>

=== q_walt_scarf_done
: Walt is wearing the new scarf. He is pretending he isn't.
walt.neutral: It's lumpy.
me.smug: It's hand-made.
walt.content: I know. That's what I said.
: He waves you over to dryer two and shows you a half-twist on the drum belt — Peg's trick, he says, so it doesn't slip in the cold.
walt.smile: Rosa never learned that one. Stubborn. Now somebody knows it.
<<quest done walt_scarf>>
<<diary "Walt wore the scarf. He said it was lumpy. He didn't take it off.">>

=== q_maya_cover_offer
maya.worried: The label wants cover art. By Friday. I have a folder called "cover ideas" and it's one picture of a toaster.
me.laugh: Bold choice.
maya.sly: You've got Rosa's camera. Could you take something? The river at night, the bridge lights. Something that sounds like my songs look.
* I'll get you the river at night.
  maya.content: After seven, when it goes all orange and blue. You're the best. Genuinely. Don't let it go to your head.
  <<quest start maya_cover>>
* I'm not really a photographer.
  maya.neutral: You're better than a toaster. Think about it.
  <<quest later maya_cover>>

=== q_maya_cover_done
: Maya has your photograph on her phone, zoomed all the way in on one orange light on the water.
maya.content: This one. It's this one. It looks like the last note of a song.
maya.sly: I'm putting your name in the credits. Small. Very small. Tiny, honestly. But it's there.
: She presses a record into your hands, still in its sleeve.
maya.neutral: Backbay Lounge. I played it on repeat while I picked the photo. Now it's yours.
<<quest done maya_cover>>
<<record lounge_night>>

=== q_june_garden_offer
june.thinking: The tomatoes have opinions this year. Loud ones. And my knees have opinions about the watering can.
june.gentle: If you pass the garden in the evenings, would you give the beds a drink? Three evenings would see them through.
* Of course. Three evenings.
  june.happy: Rosa used to say the garden was the only place she didn't have to fix anything. You just water it and wait.
  <<quest start june_garden>>
* My evenings are full right now.
  june.gentle: Then another time. The tomatoes will complain, but they'll live.
  <<quest later june_garden>>

=== q_june_garden_done
june.happy: My tomatoes have forgiven the whole world, and it's entirely your fault.
: June hands you a paper bag of marigolds, a jam jar with a rooted cutting, and a tomato the size of a fist.
june.sly: The tomato is for eating. Don't sketch it. Well — sketch it, then eat it.
<<quest done june_garden>>

=== q_remy_studies_offer
remy.excited: Okay. I have a proposition. Business. Art business.
remy.neutral: When the street wins — *when* — I want the mural to be the whole neighbourhood. But I only ever draw the café, because I never leave the café.
remy.shy: You sketch, and you get out. Could you do me some studies? Anywhere but here. Three places.
* Three sketches, coming up.
  remy.wink: I'll pay you in coffee. And money. Mostly coffee.
  <<quest start remy_studies>>
* I'm not good enough for a mural.
  remy.skeptical: You say that like I asked for good. I asked for *yours*.
  <<quest later remy_studies>>

=== q_remy_studies_done
: Remy spreads your sketches across a café table and weighs the corners down with sugar packets.
remy.excited: Look at the *light* in this one. You drew the light. People forget to draw the light.
remy.neutral: This is going in the mural. The corner, maybe. Or the middle. I'll fight myself about it.
remy.wink: Artist rate. Don't argue — it's already in your apron pocket.
<<quest done remy_studies>>

=== q_spotless_offer
june.gentle: Rosa had one rule besides Sundays, you know. Never lock up a dirty shop.
june.thinking: She said a clean floor at closing is a promise to the morning. I thought that was nonsense. Then I saw her mopping at midnight, humming.
* I'll keep her rule. Clean floors at closing.
  june.happy: Three spotless nights, and I'll tell you the rest of the saying.
  <<quest start spotless>>
* I'm barely keeping up as it is.
  june.gentle: Then keep up first. The floor will wait. Floors are patient.
  <<quest later spotless>>

=== q_spotless_done
june.happy: Three nights! The floor practically squeaks when I come in.
june.gentle: The rest of the saying: "A clean floor at closing is a promise to the morning — and the morning always keeps it."
june.sly: She got it off a tea towel. Don't tell anyone.
: The regulars have noticed too. The shop feels different when you walk in. Kept. (It gets dirty a little slower from now on.)
<<quest done spotless>>

=== q_kai_socks_offer
kai.excited: Update on the investigation. The spreadsheet has a new tab. It's called SUSPECTS.
kai.neutral: I need field data. Stray socks — under machines, behind dryers, out on the street. Five would be statistically significant.
kai.grin: Five would also be a lot of socks. Are you in?
* I'm in. Five socks.
  kai.excited: YES. Keep them in a bag. Note where you found each one. Don't wash them. Evidence.
  <<quest start kai_socks>>
* I think the socks deserve their privacy.
  kai.worried: That's exactly what the dryers want you to think.
  <<quest later kai_socks>>

=== q_kai_socks_done
: You tip the evidence onto the counter. Kai goes very still, like a scientist in a film about scientists.
kai.excited: Behind the dryers. Under number four. By the door. The PARK?! Socks are travelling. Socks have a *commute*.
kai.grin: This changes everything. Here — consultancy fee. Twenty-five dollars and my undying respect.
<<quest done kai_socks>>

=== q_priya_care_offer
priya.tired: Nine patients, one working blood-pressure cuff, and a man who swallowed a key. His own key. To his own apartment.
priya.neutral: The whole night crew is running on vending-machine crackers and spite.
* What if I sent over a care package? Coffee, and tea for the end of the shift.
  priya.smile: For the ER? You'd be a legend. We'd name a bed after you. Bed four. It's the good one.
  <<quest start priya_care>>
* That sounds brutal. Go and sleep.
  priya.laugh: Sleep. You keep saying that word like it's a real thing.
  <<quest later priya_care>>

=== q_priya_care_done
priya.smile: So. Funny story. The night crew has a shrine now.
priya.laugh: Your coffee cup, on the break-room shelf, with a battery candle. Dr. Okonkwo bows to it on the way in.
priya.neutral: And they all want to know where the laundromat with the care packages is. Expect scrubs. So many scrubs.
<<quest done priya_care>>
<<diary "The St. Anne's night crew has a shrine to my coffee cup. I've never been prouder of anything.">>

=== q_haddad_lavender_offer
haddad.worried: Habibti, a question. The lavender softener. Last week you were out.
haddad.neutral: Forty-five years I use lavender. My husband said our sheets smelled like a garden in Zahle. I am not starting to smell like "fresh linen scent" at my age.
* I'll keep the shelf stocked. Ten loads, always.
  haddad.smile: Ten! A woman with a plan. Rosa never had more than two.
  <<quest start haddad_lavender>>
* I'll try, but money's tight.
  haddad.neutral: Everything is tight. Tight is how you know it's holding.
  <<quest later haddad_lavender>>

=== q_haddad_lavender_done
: Mrs. Haddad inspects the supply shelf, counts the lavender twice, and nods like a general reviewing troops.
haddad.smile: Good. Very good. Now I can die happy. Not soon. But happy.
: She presses a tin into your hands. The lid says CHRISTMAS 1998.
haddad.laugh: The tin lies. The ma'amoul is from this morning.
<<quest done haddad_lavender>>

=== q_biscuit_offer
: Biscuit endures the petting. Then he looks at you — a long, assessing, orange look — like a landlord reviewing a tenant.
: You get the distinct feeling you're on probation.
* (Win him over. Pet him every day.)
  : You resolve to earn Biscuit's trust. It may take a while. He is a cat of standards.
  <<quest start biscuit>>
* (He's a cat. Cats don't do trust.)
  : Biscuit yawns, which manages to be agreement and an insult at the same time.
  <<quest later biscuit>>

=== q_biscuit_done
: Tonight Biscuit doesn't wait to be petted. He climbs into your lap, turns around three times, and falls asleep like he's always done it.
: Later there's something on your pillow: one very chewed sock. A gift. The highest honour a cat can give.
: From now on Biscuit sleeps on your feet, and you wake up warmer. (+5 energy every morning)
<<quest done biscuit>>
<<diary "Biscuit brought me a sock. I think this means we're family now.">>
`;
