export default `
=== walt_c1
walt.neutral: Number two's making a noise.
me.worried: What kind of noise?
walt.neutral: The kind that costs money later. Listen to it before it screams.

=== walt_c2
walt.neutral: You eat breakfast?
me.tired: I had a coffee and some anxiety.
walt.angry: That's not breakfast. That's a cry for help.

=== walt_c3
walt.content: When the dryers all run at once, this place sounds like the plant used to. Like a heartbeat.
walt.neutral: Don't tell the pigeons I said anything poetic.

=== walt_c4
walt.neutral: Peg liked the chair by the window. Said the light was better for reading.
walt.sad: I don't sit there. Not yet.

=== walt_c5
walt.neutral: Rosa and I argued every Tuesday for forty years.
me.surprised: About what?
walt.laugh: Everything. Baseball. Bleach. Whether the '86 Mets were a real team. I was right about all of it.

=== walt_c6
walt.neutral: The trick with a belt is tension. Too loose, it slips. Too tight, it snaps.
walt.content: Same with people, probably. Don't quote me.

=== walt_c7
walt.angry: Saw one of those Crestline fellows measuring the sidewalk with a laser. A *laser*.
walt.neutral: In my day, if you wanted to measure something, you used a tape measure and a cigarette break.

=== walt_c8
walt.neutral: You're keeping the floor clean.
me.smug: I am.
walt.smile: Good. Rosa said a clean floor is a promise.

=== walt_c9
walt.content: My knees said it was going to rain today. My knees are never wrong.
walt.neutral: My knees would make a better weatherman than that guy on channel four.

=== walt_c10
walt.neutral: Kid. You're doing alright.
me.surprised: Walt. Was that a compliment?
walt.angry: Don't make it a thing.

=== walt_c11
walt.neutral: Park bench, pigeons, six o'clock. Same as always. You can come. If you don't talk too much.

=== walt_c12
walt.smile: You ever fix something and it just… hums again? Best feeling there is.
walt.content: Better than any painting. No offence to your art school.
me.laugh: Some offence taken.

=== walt_c13
walt.neutral: Peg used to say I had two settings: grumpy and asleep.
walt.laugh: She wasn't wrong.

=== walt_c14
walt.neutral: They want to tear down the whole block for condos. Where are the condo people going to do their laundry?
me.thinking: A "laundry concierge," apparently.
walt.angry: A what now.

=== walt_c15
walt.content: Petition's looking thick. I signed it twice. Once as me, once as Peg.
me.worried: Walt, that's —
walt.neutral: She'd have signed it. I'm just delivering.

=== walt_park
walt.neutral: Sit if you're sitting. Don't scare them.
: A pigeon lands on Walt's shoe. He doesn't move.
walt.content: That one's Gregory. He's got no manners. I respect him.

=== walt_h2
<<flag walt_h2>>
walt.neutral: Your front door squeaks.
me.thinking: It's always squeaked.
walt.neutral: It squeaked for Rosa because she liked hearing people come in. You're not Rosa.
: He takes a small oil can out of his coat pocket and fixes it in ten seconds flat.
walt.smile: Now you'll hear the bell instead. That's better. Bell's friendlier.
<<rel walt 30>>

=== walt_h8
<<flag walt_h8>>
walt.neutral: You know what Peg and I did on Saturday nights?
me.thinking: Bowling?
walt.laugh: Ha! We danced. Right here. After close. Rosa would put a record on and go upstairs and pretend she couldn't hear us.
walt.content: Peg led. I stepped on her feet for forty-six years. She never complained. Well. She complained constantly. But she never stopped.
walt.sad: Nobody's danced in here since.
* Maybe someone should.
  walt.smile: Maybe. Not me. My knees would file a complaint.
  <<rel walt 40>>
* I'm sure she loved every step.
  walt.content: Even the ones on her feet. Especially those, she said.
  <<rel walt 40>>

=== walt_h10
<<flag walt_h10>>
walt.neutral: Here.
: He hands you a heavy canvas roll. Inside: wrenches, a socket set, feeler gauges, a screwdriver with a handle worn smooth by fifty years of one grip.
walt.neutral: My tools. From the plant. I don't need all of them anymore.
me.surprised: Walt, I can't —
walt.angry: You can. You will. And you'll take care of number three.
walt.content: You're a good kid, {name}. Rosa'd be proud. I'm… I'm proud. There. I said it. Don't make it a thing.
<<upgrade tool_kit>>
<<toast "Walt's tool kit: repairs are much easier.">>
<<rel walt 60>>

=== gift_walt_love
walt.surprised: ...Well.
walt.content: That's — huh. That's just right. How'd you know?

=== gift_walt_like
walt.smile: Hm. Thanks, kid. That's nice.

=== gift_walt_neutral
walt.neutral: For me? Okay. I'll find a place for it.

=== gift_walt_dislike
walt.angry: ...What am I supposed to do with this?

=== gift_walt_scarf
walt.content: A scarf. Hand-knit. Lumpy in the middle.
walt.sad: Peg knit me one every winter. Lumpy in the middle, too.
walt.neutral: I'll wear it. Don't look at me like that. I said I'll wear it.

=== gift_walt_coffee
walt.laugh: Black? Two sugars? You remembered.
walt.content: You're alright, kid.
`;
