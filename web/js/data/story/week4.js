export default `
=== d22_hearing
<<letter hearing>>
<<flag hearing_announced>>
me.thinking: Friday. Three minutes each. The whole street, in one room, against a company with a toothpaste logo.
me.neutral: If June and Walt and Remy and Maya stood up… if the petition was thick enough…
<<goal "Before Friday's hearing: grow the petition and ask friends (5♥+) to speak.">>
<<diary "The council hearing is Friday. We have one week to make them care.">>

=== june_testify
<<flag june_asked>>
<<if hearts.june >= 5>>
june.neutral: I've already written my three minutes. I timed them with an egg timer.
june.sly: Two minutes fifty. I left ten seconds for a dramatic pause.
<<flag june_testifies>>
<<rel june 20>>
<<else>>
june.worried: Speak? In front of the council? Oh, dear. I taught eight-year-olds. Eight-year-olds don't vote on rezoning.
june.thinking: Ask me again when I've slept. Or bring me more lemon bars. I'm not above bribery.
<<endif>>

=== walt_1974
<<flag walt_1974>>
walt.neutral: Kid. Sit down a minute.
: He takes a creased photo out of his wallet: three young people in front of the shop's freshly painted window. A laughing woman with a sock held up like a trophy. A skinny young man rubbing his head. And Rosa, arms folded, grinning.
walt.content: September 1974. Peg lost a sock in dryer two. I crawled in after it. Hit my head so hard I saw stars.
walt.laugh: Came out with the sock and a date. Your grandmother charged me for the dryer anyway.
me.laugh: She wrote about it in her journal!
walt.sad: Fifty years, I've been walking into this shop. Married in '76. Buried Peg in '22. This place is the only thing that's still where I left it.
<<if hearts.walt >= 5>>
walt.neutral: So I'll talk. At the hearing. I haven't talked in front of people since the union days.
walt.angry: Somebody's got to tell them what that lot was before it was a "development opportunity."
<<flag walt_testifies>>
<<endif>>
walt.neutral: Keep the photo. It belongs in the shop.
<<give photo_rosa 1>>
<<rel walt 35>>
<<diary "Walt gave me a photo: Rosa, Peg and young Walt, 1974. He met his wife here.">>

=== maya_offer
<<flag maya_offer>>
: Maya's sitting on top of washer two in the dark, headphones on, not listening to anything.
maya.worried: The producer wants me in LA. A real studio. A real record. They want me there October first.
maya.worried: My parents cried. Happy crying. I think. Nigerian parents cry the same either way.
maya.sad: But the Night Wash is next Saturday. And the shop. And… this. I don't know if I can make music anywhere else.
* Go, Maya. The machines will be here when you come back.
  maya.content: ...You really think so?
  me.neutral: I'll make sure of it. That's kind of my whole thing now.
  maya.laugh: Okay. Okay! I'm going. After the Night Wash. I'm playing that first.
  <<flag maya_goes>>
  <<rel maya 40>>
* Stay. We need you here — the shop, the Night Wash, all of it.
  maya.worried: ...
  maya.neutral: Yeah. Maybe. I could do it from here. People record anywhere now.
  maya.content: I'll tell them I need a year. If they want me, they'll wait.
  <<flag maya_stays>>
  <<rel maya 25>>
* Only you know what's right, Maya.
  maya.thinking: That's the most annoying answer. And the right one.
  maya.content: I'm going. But I'm taking the shop with me. In here.
  : She taps her recorder.
  <<flag maya_goes>>
  <<rel maya 35>>
<<flag night_wash_planned>>
maya.excited: Oh — and the Night Wash is happening. Saturday. Here. Remy made a poster. It's very pink.

=== maya_offer_text
<<flag maya_offer>>
<<flag maya_goes>>
<<flag night_wash_planned>>
<<sfx phone_buzz>>
: A text from Maya: *"LA wants me. october 1st. i said yes?? i think?? playing the NIGHT WASH on saturday first. remy made a poster. it's very pink"*
me.content: Go get 'em, Maya.

=== remy_mural_ask
<<flag mural_asked>>
<<if flag.commission_taken>>
remy.worried: I painted the lobby murals. They're good. They're really good. I hate them.
remy.neutral: My mom's debt is gone, though. She hugged me for, like, ten minutes.
remy.thinking: I want to paint one more. For free. For the street. The Cap & Seal fence, before they tear it down.
<<else>>
remy.excited: Okay, I have a plan and you're going to say yes.
remy.neutral: The Cap & Seal fence. The whole length. A new mural, bigger than Harbor Dreams. Linden Street at sunrise. Everybody in it.
<<endif>>
remy.worried: Paint's expensive, though. Like, eighty bucks of expensive.
* I'll cover the paint. ($80)
  <<money -80 "Paint for Remy's mural">>
  remy.excited: YES. You're in it, by the way. Folding a shirt. Badly.
  <<flag new_mural>>
  <<community 8>>
  <<rel remy 40>>
* I'm broke, Remy — but I'll hold the ladder all night.
  remy.laugh: Deal. I'll get the paint from the Haddads' garage. Don't ask.
  <<flag new_mural>>
  <<community 5>>
  <<rel remy 30>>
  <<energy -15>>
<<diary "Remy's painting a new mural on the old factory fence. I'm apparently in it. Folding. Badly.">>

=== tenants_meeting_2
: The Thursday meeting overflows onto the sidewalk. The Nguyens came back. Priya brought nurses from the hospital. Coach Dee brought the whole team.
june.happy: Sixty-two people, dear. Sixty-two.
<<petition 25>>
<<community 6>>
<<time +90>>

=== hearing
<<music tension>>
<<hud off>>
<<fade out 0.8>>
: Council Chambers, 7 p.m. Fluorescent lights. Folding chairs. It smells like carpet and coffee.
: The Linden Street side of the room is packed. Crestline has three people in matching navy suits and a very large easel.
<<fade in 0.8>>
<<call hearing>>
grant: …a vibrant, walkable, mixed-use community. Two hundred and twelve new homes. Jobs. A revitalised Linden Street.
: Then the public comment begins.
<<if flag.speaks_june>>
june.neutral: My name is June Ito. I taught third grade at Linden Elementary for thirty-eight years. Half this room learned long division from me.
june.gentle: Crestline says they're "revitalising" Linden Street. Linden Street is alive. You can't revitalise a thing that's alive. You can only replace it.
<<endif>>
<<if flag.speaks_walt>>
walt.neutral: Walt Szymanski. I worked thirty-one years at the Cap & Seal plant, on the lot they want.
walt.angry: They closed it and sold us out once. Now they want to sell us the view.
walt.content: I met my wife in the laundromat at 118 Linden. You want to put a lobby on top of that. Go ahead. But put a plaque up. So people know what it cost.
<<endif>>
<<if flag.speaks_remy>>
remy.neutral: Remy Castillo. I painted the mural Crestline painted over. They offered me twelve grand to paint a fake one in their lobby.
remy.excited: I said no. You can too.
<<endif>>
<<if flag.speaks_maya>>
maya.worried: Maya Okafor. Um. Two hundred thousand people have listened to a song I recorded in a laundromat on Linden Street.
maya.content: They didn't listen because it was new. They listened because it was *real*.
<<endif>>
<<if var.speakers == 0>>
: None of your friends came up to the microphone. The Linden Street side of the room is very quiet.
<<endif>>
<<if petition >= 5>>
: The petition goes into the record: {petition} signatures, some in crayon.
<<else>>
: There's no petition to read into the record. You wish, suddenly, that there were.
<<endif>>
: Then it's your turn.
* Talk about Rosa.
  me.sad: My grandmother kept those lights on for fifty-three years. Through blackouts, recessions, a pandemic. Nurses came in at three a.m. and cried in the chair by the window.
  me.neutral: A laundromat isn't a building. It's a place people aren't alone. You can't rezone that.
* Talk about the neighbours.
  me.thinking: This month I met a machinist, a teacher, a painter and a musician who all hold this street together with their bare hands.
  me.neutral: Crestline has a nice easel. We have each other. Please don't make us trade.
* Talk about the numbers.
  me.thinking: Crestline's tower has 212 units. Eleven are "affordable." The Alder Arms has sixty families paying what they can.
  me.neutral: The math isn't complicated. It's just not in their favour.
<<if flag.hearing_won>>
<<music community>>
: The council murmurs. A long pause. Then: *"The motion to rezone parcels 110 through 124 is… denied. The applicant may resubmit a revised plan."*
: The Linden Street side of the room erupts. June is crying. Walt is pretending not to cry. Remy is standing on a chair.
<<community 12>>
<<diary "WE WON. The council denied the rezoning. June cried. Walt definitely cried.">>
<<else>>
<<music bittersweet>>
: The council murmurs. *"The motion to rezone… passes, four to three, with conditions."*
: The Linden Street side of the room goes quiet. Somebody's baby starts crying, which feels right.
june.worried: Four to three. We were close, dear. We were so close.
<<diary "We lost the vote, 4-3. But the whole street showed up. That has to count for something.">>
<<endif>>
<<time 21:30>>
<<hud on>>
<<resume_music>>

=== night_wash
<<if not var.trackName>>
<<set trackName "Linden Street">>
<<endif>>
<<music community>>
<<call gather>>
: The NIGHT WASH. Remy's very pink posters did their job: the shop is packed wall to wall, the dryers spinning with nobody's laundry just for the sound.
<<if flag.new_mural>>
: Across the street, Remy's new mural glows under clip-on lamps — Linden Street at sunrise, and a tiny figure folding a shirt. Badly.
<<endif>>
june.happy: Lemon bars! Get them before Walt does.
walt.laugh: Too late.
maya.worried: Okay. Okay okay okay. I'm on.
: Maya sits on top of washer two with her guitar and a little speaker. She presses play: the chug of the machines, the tumble of the dryers. Then she starts to sing.
maya.content: This one's called "{var.trackName}." It's for Rosa. And for this place. And for {name}, who kept the lights on.
<<sfx applause_big>>
: The whole shop sings the last chorus. Even Walt. Especially Walt.
remy.wink: Not bad for a laundromat and a very old cat.
<<community 12>>
<<petition 30>>
<<rel maya 30>>
<<rel remy 20>>
<<rel june 20>>
<<rel walt 20>>
<<call dismiss>>
<<resume_music>>
<<diary "The Night Wash. Maya sang. The whole shop sang back. I will remember this when I'm ninety.">>
<<time 23:30>>
<<goal "Crestline wants an answer in the morning. Go up to bed (back door).">>

=== final_morning
<<letter crestline_final>>
me.thinking: Seven hundred and fifty thousand dollars.
me.neutral: Okay, Abuela. Let's go see what this place is.
<<call checkpoint>>
<<scene laundromat backdoor>>
<<sfx shop_bell>>
: Grant Holloway is waiting inside, dry as a bone, holding a folder. Biscuit is sitting on it.
grant: {name}. Good morning. I'll keep this short. You know the number.
<<if flag.hearing_won>>
grant: The council was… unhelpful. We'll build smaller on the lot. But we'd still very much like this corner.
<<else>>
grant: The rezoning passed. The block is changing, with or without this building. I'd rather it be with you comfortable than without you broke.
<<endif>>
grant: Seven-fifty. Sign today, and you never think about a broken dryer again.
: You look around. Washer three, Grumpy, humming. The folding table. The chair by the window. The photo of Rosa and Peg and Walt, taped by the register.
* Sell. Take the money. Let Rosa's go.
  -> final_sell
* Keep it. Rosa's stays.
  -> final_keep

=== final_sell
me.sad: ...Okay. I'll sign.
grant: You're making a very smart decision.
me.sad: I know. That's the worst part.
: You sign. Your pen barely makes a sound.
<<ending sold>>

=== final_keep
me.neutral: No, thank you.
grant: I'm sorry?
me.smug: The machines don't care what the number is, Mr. Holloway. Neither do I.
grant: ...You'll regret this.
me.laugh: Probably! Every Tuesday. Around nine.
: The bell rings on his way out. This time it just sounds like a bell.
<<call keepEnding>>

=== ending_commons
<<ending commons>>

=== ending_holdout
<<ending holdout>>
`;
