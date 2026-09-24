export default `
=== remy_c1
remy.neutral: Oat milk is a scam, and I will die on this hill. Also I drink it every day.

=== remy_c2
remy.skeptical: A guy asked for a "deconstructed latte" today. I gave him a cup of milk, a shot of espresso and a spoon.
remy.wink: He tipped five bucks.

=== remy_c3
remy.neutral: You know what's great about your shop? Nobody's on their phone. They're watching the dryers like it's TV.
remy.excited: Laundromat TV. Somebody should pitch that.

=== remy_c4
remy.worried: My mom worked double shifts at the hospital for twenty years and a surgery wiped her savings in a week.
remy.neutral: Anyway. How's your day?

=== remy_c5
remy.skeptical: The Linden's "artist programme" emailed me. They want "authentic street vibes." I want to throw my phone in the river.

=== remy_c6
remy.excited: I did a sketch of you at the shop yesterday. Through the window. Don't be creepy about it.
me.laugh: *You're* the one sketching through windows.
remy.wink: I'm an artist. It's different. It's research.

=== remy_c7
remy.neutral: Delgado's used to put out day-old bread for anybody who needed it. No questions. Just a basket.
remy.worried: Nobody does that anymore. Crestline doesn't do baskets.

=== remy_c8
remy.shy: Can I ask why you left art school?
* My mom got sick. Then money. Then I just… didn't go back.
  remy.worried: That's not quitting. That's life happening at you.
  <<rel remy 10>>
* I got scared I wasn't good enough.
  remy.neutral: Everybody who's any good is scared of that. The bad ones never worry.
  <<rel remy 10>>

=== remy_c9
remy.wink: Walt came in today and said my cappuccino was "adequate." I've never been so proud.

=== remy_c10
remy.neutral: Maya fell asleep at table four for two hours yesterday. I just let her. Kid works too hard.

=== remy_c11
remy.skeptical: If one more real estate guy says "vibrant," I'm tattooing "vibrant" on his forehead. Backwards. So he can read it in the mirror.

=== remy_c12
remy.excited: The Corner Cup's owner says if the street holds, he'll let me paint the whole back wall. The WHOLE wall.

=== remy_c13
remy.neutral: Hey. For real. Thanks for sticking around. People usually don't.
remy.shy: Don't make it weird.
me.smug: That's Walt's line.
remy.wink: Walt has good lines.

=== remy_street
remy.neutral: Stacking chairs. Riveting stuff. Want a coffee? Shop's closing but the machine's still warm.

=== remy_h2
<<flag remy_h2>>
: Remy flips open a battered sketchbook: the Corner Cup regulars, Luis in his bodega doorway, June squinting at her tomatoes, the laundromat's window glowing at night.
remy.shy: I don't show people this. Ever.
me.surprised: Remy, these are incredible.
remy.skeptical: They're sketches.
me.neutral: The line on June's hands. You can tell she's a teacher from her *hands*.
remy.shy: ...You actually looked. Most people just say "cool."
remy.excited: Show me yours sometime. Rosa said you drew all her machines when you were little. Named them and everything.
<<rel remy 30>>

=== remy_h4
<<flag remy_h4>>
remy.worried: Can I tell you something and you don't make the face?
me.neutral: What face?
remy.skeptical: The pity face. Everybody makes the pity face.
remy.worried: My mom's selling her apartment. To pay the hospital. She's moving in with my tía in Jersey. After twenty-six years on Linden Street.
remy.neutral: I'm the only Castillo left on this block. So I'm staying. Out of spite, mostly.
* Spite is a perfectly good reason to stay.
  remy.excited: RIGHT? Thank you. Spite and good coffee.
  <<rel remy 35>>
* Then this block is lucky to have you.
  remy.shy: ...Okay, that was almost the pity face. But it was a nice one. Allowed.
  <<rel remy 35>>

=== remy_h8
<<flag remy_h8>>
remy.excited: Walk with me. I want to show you something.
: She leads you down an alley behind the café. On the brick, faded almost to nothing: a small painted bird carrying a sock in its beak.
remy.neutral: My first ever. I was fourteen. Rosa caught me painting it at midnight.
remy.laugh: She didn't call the cops. She gave me a thermos of hot chocolate and said, "Make the sock teal. It's the shop colour."
me.laugh: It IS teal.
remy.shy: It's always been teal.
<<rel remy 45>>

=== remy_h10
<<flag remy_h10>>
remy.shy: Okay, don't freak out.
: She hands you a small canvas: you, in the laundromat window at night, folding a shirt, surrounded by dryer light. Biscuit on the machine behind you. It's warm and a little crooked and exactly right.
remy.neutral: I wanted to paint the day it stopped being Rosa's shop and started being yours.
remy.wink: Turns out it's both. That's the trick.
<<decor painting "Remy's portrait of you (Harbor painting slot)">>
<<rel remy 60>>

=== gift_remy_love
remy.excited: Shut UP. This is perfect.
remy.shy: ...Thank you. Seriously.

=== gift_remy_like
remy.wink: Ooh. Nice. You're alright, laundry girl.

=== gift_remy_neutral
remy.neutral: Huh. For me? Okay. Thanks.

=== gift_remy_dislike
remy.skeptical: Tea. You brought a barista… tea. Bold move.

=== gift_remy_sketch
remy.excited: Is this YOURS? You drew this?
remy.shy: The line work is — okay, it's really good. I'm pinning it above the espresso machine. Everybody's going to see it.
`;
