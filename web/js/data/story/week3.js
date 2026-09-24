export default `
=== d15_tax
<<letter tax>>
<<flag tax_reassessed>>
me.worried: Seventy-five dollars more. Every week. Because the neighbourhood got "more valuable."
me.thinking: They're not trying to buy the shop anymore. They're trying to make it too expensive to keep.
<<diary "Property tax went up $75 a week. Nice trick, Crestline.">>

=== remy_commission
<<flag commission_decided>>
remy.worried: Can I ask you something and you don't judge me?
me.neutral: I fold strangers' underwear for a living. I'm not in a judging position.
remy.skeptical: Crestline wants murals for the Linden lobby. "Authentic neighbourhood art." Twelve thousand dollars.
remy.worried: My mom's still paying off her surgery. Twelve thousand is… a lot of her life back.
remy.sad: And it's also them buying the thing they erased. Like hanging a photo of the tree you cut down.
* Take it, Remy. Your mom comes first.
  remy.worried: ...Yeah. Yeah. I know.
  remy.neutral: I'll paint something so good it haunts them.
  <<flag commission_taken>>
  <<rel remy 20>>
* Don't. They don't get to buy what they erased.
  remy.excited: ...Okay. OKAY. Yes. Thank you. I needed somebody to say it out loud.
  remy.worried: My mom's going to kill me. Then she's going to be proud of me. In that order.
  remy.wink: Also, if that Crestline ad on the corner gets a little… improved tonight, you didn't see anything.
  <<flag ad_tagged>>
  <<flag commission_refused>>
  <<rel remy 35>>
  <<community 5>>
* Paint your own thing instead. Somewhere they can't touch.
  remy.thinking: Somewhere they can't touch...
  remy.excited: The Cap & Seal fence is still public right-of-way until they break ground. It's *enormous*.
  remy.wink: You're dangerous, laundry girl.
  <<flag commission_refused>>
  <<flag mural_idea>>
  <<rel remy 40>>
  <<community 5>>

=== d16_radio
<<flag storm_warned>>
: The little radio behind the counter crackles: *…severe storm moving in tomorrow afternoon, high winds, possible outages across Harborview…*
me.worried: Great. Wonderful.

=== walt_storm_prep
walt.neutral: Radio says a big one tomorrow.
walt.neutral: Brought you a tarp and some sandbags for the front step. The drain on the corner backs up. Always has.
me.surprised: Walt, you carried sandbags here?
walt.angry: I'm seventy-four, not dead.
walt.content: Rosa and I did this every storm since '85. You check the breakers, I'll do the door.
<<rel walt 25>>
<<give parts 1>>

=== d17_storm_start
<<weather storm>>
<<sfx thunder>>
<<shake 5 0.6>>
: Rain hits the windows sideways. Customers come in dripping and stay longer than they need to.
me.thinking: Keep the floor mopped. Keep the machines running. Keep calm.

=== storm_night
<<sfx thunder>>
<<shake 8 0.8>>
<<power off>>
<<music none>>
: The lights die mid-flicker. The dryers wind down into silence. The whole street goes dark.
me.worried: Okay. Okay. Lanterns. Rosa had lanterns.
: A knock at the glass. Then another. Then voices.
<<call gather>>
june.worried: The whole Alder Arms is black, dear. The stairwell's pitch dark. We saw your light.
walt.neutral: Brought candles. And a thermos. It's coffee. Probably.
maya.content: Pharmacy closed early. I brought my guitar. It's the only thing I own that doesn't need electricity.
remy.excited: I brought pastries that would've gone stale. I'm a hero. Clap for me.
: The laundromat fills: neighbours on the benches, kids on the folding table, June's knitting circle in the lantern light. Somebody's baby falls asleep in a laundry cart.
<<music garden 2>>
: Maya plays something slow. Walt pretends not to hum. Remy draws faces in the fog on the windows.
june.gentle: Rosa did this in '03, too. The blackout. We sat right here until sunrise.
walt.content: She made everybody fold towels. Said idle hands were bad for morale.
<<if flag.maya_track>>
maya.content: This is the track. Right now. This is what I've been trying to record for a year.
<<endif>>
me.thinking: People keep coming in out of the storm. It's getting late.
* Keep the doors open all night. Nobody goes home to a dark apartment alone.
  june.happy: That's my girl.
  <<flag storm_open_all_night>>
  <<community 14>>
  <<energy -25>>
  <<rel june 20>>
  <<rel walt 20>>
  <<rel maya 20>>
  <<rel remy 20>>
* Stay till midnight, then send everyone home safe.
  walt.neutral: Sensible. Rosa would've argued, but sensible.
  <<community 7>>
  <<rel june 10>>
  <<rel walt 10>>
  <<rel maya 10>>
  <<rel remy 10>>
: Just before midnight, the power hums back on. Every machine in the shop beeps at once, and everybody cheers.
<<time 23:40>>
<<power on>>
<<sfx machine_done>>
<<call dismiss>>
<<resume_music>>
<<weather rain>>
<<diary "The storm took the power. The neighbourhood came to the laundromat anyway. Best night since I got here.">>
<<goal "It's late. Go up to bed (back door).">>

=== grant_visit
<<sfx shop_bell>>
: The bell rings. A man in a charcoal coat steps in, shakes the rain off a very good umbrella, and smiles like he's been expecting you his whole life.
grant: {name}! Grant Holloway, Crestline. We've corresponded.
grant: What a *space*. You can feel the history. That's the kind of authenticity we want to honour at the Linden.
me.thinking: You painted over a mural last week.
grant: We *refreshed* a surface ahead of construction. Remy's welcome to apply for our artist programme.
grant: Look — I'll be direct, because I respect you. Five hundred and fifty thousand. That's a hundred and fifty more than anyone else on this block has been offered.
grant: The building's old. The wiring's older. I'd hate for a city inspector to find something frightening. They've been very busy in this neighbourhood.
* That sounds a lot like a threat, Mr. Holloway.
  grant: A threat? No. A forecast.
  <<flag grant_confronted>>
  <<community 3>>
* I'll think about it.
  grant: That's all I ask. The offer's good through the twenty-eighth.
  <<flag grant_polite>>
* Get out of my grandmother's laundromat.
  grant: ...Of course. We'll talk soon, {name}.
  : The bell rings on his way out. It sounds, somehow, triumphant.
  <<flag grant_kicked>>
  <<community 5>>
<<diary "Grant Holloway came in person. $550,000. He said 'inspection' like a magic word.">>

=== inspection
<<sfx shop_bell>>
: A woman with a clipboard and a City of Harborview badge. She does not smile. She checks every machine, the floor, the fire extinguisher, the lint traps.
<<call inspection>>

=== inspection_pass
: She taps her clipboard. "Clean floor, working machines, extinguisher in date. Honestly? Better than most."
: "Somebody called in a complaint. I'm not supposed to say who." She looks meaningfully at the Crestline billboard across the street. "Have a nice day."
me.smug: Thank you, Walt. Thank you, mop.
<<rep 5>>
<<community 4>>
<<flag inspection_passed>>

=== inspection_fail
: She frowns at the {var.inspectBroken} broken machine(s) and the state of the floor.
: "Violation. Hundred-and-fifty-dollar fine, and I'll be back to check." She leaves a pink slip on the counter.
me.sad: Great. Perfect. Exactly what Grant wanted.
<<money -150 "City inspection fine">>
<<rep -4>>
<<flag inspection_failed>>

=== petition_launch
<<flag petition_started>>
<<visit june stay 90>>
<<visit remy stay 90>>
<<wait 1.5>>
june.neutral: Right. Clipboards. Pens. And a place where half the street walks through every week.
remy.excited: I made the posters. "SAVE LINDEN STREET." Hand-lettered. I'm very proud of the S.
<<call ensureBoard>>
june.gentle: Every customer who's happy with you is a signature, dear. Every one who isn't… isn't.
: *The petition is live.* Happy customers sign it. Events and friends add signatures too. Aim for 150 before the hearing.
<<petition 20>>
<<community 5>>
<<goal "Grow the petition: good service, community events, and friends all help.">>
<<diary "We started the petition. Remy's S really is very good.">>

=== maya_viral
<<flag maya_viral>>
maya.worried: {name}. Something happened.
maya.worried: I put "{var.trackName}" online. Like, just to see. And it has… two hundred thousand plays.
me.surprised: MAYA.
maya.laugh: I KNOW.
maya.worried: People are making videos to it. Doing laundry. Studying. Some guy proposed to his girlfriend to it in a laundromat in Ohio.
maya.content: A producer emailed. From LA. A real one. I'm scared to open it.
<<rel maya 30>>
<<diary "Maya's track went viral. The whole internet is listening to my laundromat.">>

=== maya_viral_text
<<flag maya_viral>>
<<sfx phone_buzz>>
: Your phone buzzes. It's Maya: *"did you see??? 200K PLAYS. the internet likes our washing machines. call me tomorrow i'm freaking out"*
me.laugh: Our washing machines.
<<rel maya 20>>
`;
