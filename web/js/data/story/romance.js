// Romance: see data/romance.js for when each of these plays. Every step is opt-in.
export default `
// ================================================================== Maya
=== rom_maya_spark
: Maya's been quiet for a while. She keeps taking her headphones off, then putting them back on.
maya.worried: Can I say something weird?
me.neutral: You only ever say weird things. It's why I like you.
maya.sly: Rude. But okay.
maya.worried: When I'm here, the songs come easy. I thought it was the machines — the rhythm. And it is. But it's also… you.
maya.content: That's the weird thing. That's the whole thing. You can laugh.
* (Take her hand.) I'm not laughing. I was hoping it was me.
  : Her hand is cold from the night air and very still in yours. Then it isn't still at all.
  maya.laugh: Oh no. Oh, I'm going to write *so* many embarrassing songs.
  <<romance maya spark>>
* (Keep it friendly.) You're my favourite person to be quiet with. Always.
  maya.content: …Yeah. Me too. Always.
  : She puts her headphones back on and bumps your shoulder with hers, and it's a good, uncomplicated thing.
  <<romance maya friend>>

=== rom_maya_invite
maya.content: So. The bridge lights up at eight.
<<if time < 19*60>>
maya.sly: Tonight. The riverside. I'll bring the good headphones — the ones with two sides.
<<else>>
maya.sly: Tomorrow night. The riverside. I'll bring the good headphones — the ones with two sides.
<<endif>>
* It's a date.
  maya.laugh: Don't call it that, I'll get nervous and throw up in a tuba.
  maya.content: …It's a date.
  <<romance maya invite>>
  <<if var.date_maya == day and loc == "riverside" and time >= 17*60>>
  maya.laugh: …Which is, um. Here. Now. Hi.
  -> rom_maya_date
  <<endif>>
* I can't this week. Ask me again?
  maya.neutral: I will. I'm persistent. Like tinnitus.
  <<romance maya later>>

=== rom_maya_date
<<music lounge_night>>
: Maya's sitting on the river wall with her legs dangling, two coffees beside her and a pair of old headphones around her neck.
maya.content: You came. I had a whole speech ready in case you didn't. It was very dignified.
: At eight exactly the bridge lights flicker on, one by one, orange and then blue, all the way across the water.
maya.laugh: Cheesy. I told you. I love it.
: She sets one side of the headphones over your ear. A song you've never heard: slow and warm, the hum of a dryer under a piano.
maya.worried: It's not finished. It's missing something, and I don't know what.
* Us. Record us talking.
  maya.content: …Oh. Oh, that's it. That's what it's missing.
  : She holds her phone up between you and records nothing important for twenty minutes: the river, the bridge, the two of you arguing about whether pigeons have feelings.
  <<rel maya 20>>
* The rain. It needs rain on the shop window.
  maya.laugh: You're right. You're annoyingly right. We'll catch the next storm together.
  <<rel maya 15>>
: When the bridge lights go out at ten, neither of you moves for a while.
maya.content: Thanks for tonight, {name}. For real.
<<time +120>>
<<romance maya dated>>
<<resume_music>>

=== rom_maya_missed
maya.neutral: The bridge lit up. It was pretty. I watched it by myself.
maya.worried: It's fine. It's — okay, it's a little bit not fine.
* I'm sorry. I got caught up. Let me make it up to you.
  maya.content: …You'd better. I'm counting.
  <<rel maya -10>>
* I should have told you I couldn't make it.
  maya.neutral: Yeah. You should've. Next time just text me. I'm always awake.
  <<rel maya -15>>
<<romance maya missed>>

=== rom_maya_confess
maya.worried: Can I tell you something? I keep writing songs that are secretly about the same person.
maya.content: It's you. Obviously. Every chorus. It's getting embarrassing. My sister noticed.
maya.worried: So I'm asking. Before I write a whole album about it.
* Be with me. Wherever the music takes you, come home here.
  maya.laugh: That's the corniest thing anyone has ever said to me.
  maya.content: Say it again. I want to record it.
  <<romance maya partner>>
  <<diary "Maya and me. It's official. She recorded me saying it. Twice.">>
* I feel it too. Can we take it slowly?
  maya.content: Slow is good. Slow is a tempo. I know a lot about tempo.
  <<romance maya slow>>

// ================================================================== Remy
=== rom_remy_spark
: Remy has paint on her jaw and doesn't know it. You decide not to tell her. Then you tell her.
remy.shy: Where? — No. Don't. I'll get it.
: She doesn't get it. You reach over and wipe it off with your thumb before you've thought about it.
: Everything goes very quiet. Or maybe it's just the two of you that do.
remy.shy: …Okay. So that happened.
* (Don't take it back.) I'd do it again.
  remy.wink: Bold. I respect bold. I've been trying to work up to bold for about two weeks.
  remy.shy: Don't laugh. I made a mood board.
  <<romance remy spark>>
* (Laugh it off.) Sorry. Occupational hazard. I fix things.
  remy.neutral: Ha. Yeah. You do.
  : She grins, and it's easy again, and it stays easy.
  <<romance remy friend>>

=== rom_remy_invite
remy.neutral: The Corner Cup closes at eight. After that it's just me, the chairs, and a very good espresso machine.
<<if time < 19*60>>
remy.wink: Come by tonight? I'll make you something that isn't on the menu.
<<else>>
remy.wink: Come by tomorrow night? I'll make you something that isn't on the menu.
<<endif>>
* I'll be there.
  remy.excited: Okay! Cool. Cool cool cool. That was very cool of me.
  <<romance remy invite>>
  <<if var.date_remy == day and loc == "street" and time >= 17*60>>
  remy.wink: Which is… basically now. Stay right there.
  -> rom_remy_date
  <<endif>>
* Not this week. Ask me again?
  remy.skeptical: Rain check. I'm writing it on a napkin. The napkin is legally binding.
  <<romance remy later>>

=== rom_remy_date
<<music cafe>>
: The Corner Cup's chairs are up on the tables, all except two. Remy has put a candle in a milk jug.
remy.excited: Welcome to Remy's. It's like the Corner Cup, but the owner's not here, so it's good.
: She makes you something with cardamom and orange peel and a lot of foam, and watches you drink it like it's an exam.
remy.shy: Well?
* It tastes like autumn.
  remy.excited: YES. That's exactly what I was going for. You get it.
  <<rel remy 20>>
* It's perfect. Like it was made just for me.
  remy.wink: It was. That's the whole trick.
  <<rel remy 20>>
: Afterwards she drags you outside to see the wall. In chalk, very lightly, she has sketched the whole street — the shop, Delgado's, the Alder Arms — and two small figures on the corner.
remy.neutral: For the mural. If we win. When.
remy.shy: The one on the left is you. The one on the right is me, being nervous.
<<time +120>>
<<romance remy dated>>
<<resume_music>>

=== rom_remy_missed
remy.skeptical: So I made two drinks last night and drank them both. I'm vibrating. It's fine.
remy.worried: Just — tell me next time? I'm new at being brave.
<<rel remy -12>>
<<romance remy missed>>

=== rom_remy_confess
remy.neutral: I have a question. I rehearsed it. Now I've forgotten the rehearsal.
remy.shy: Do you want to be a thing? Us. Officially. With a name and everything.
* Yes. A thing. Our thing.
  remy.excited: Okay! Okay. I'm going to paint this. I'm going to paint this so big.
  <<romance remy partner>>
  <<diary "Remy asked if we could be a thing. We're a thing.">>
* I want to. Can we take it slowly?
  remy.neutral: Slow's good. Slow means it's worth doing properly.
  <<romance remy slow>>

// ================================================================== Kai
=== rom_kai_spark
<<if flag.kai_lucky>>
: Kai lingers at the counter, turning the lucky sock over and over.
<<else>>
: Kai lingers at the counter after dropping off the laundry, fiddling with a soggy bike glove.
<<endif>>
kai.worried: Can I tell you a theory? It's not about socks. It's a different kind of theory.
kai.neutral: My theory is I ride past twelve laundromats on my route, and I only ever come to this one.
kai.worried: And it's not for the machines. The machines are, respectfully, a little haunted.
* My theory is I've been hoping you'd come in.
  kai.excited: Wait. Really? Hypothesis supported?!
  kai.grin: I need to sit down. I'm on a bike all day, I never sit down. I'm sitting down.
  <<romance kai spark>>
* I'm glad you come here. You make the place more fun.
  kai.grin: More fun. I'll take more fun. More fun is statistically significant.
  <<romance kai friend>>

=== rom_kai_invite
kai.excited: Question. Have you been to the park after dark? The fountain lights up and there's nobody there but the ducks.
<<if time < 19*60>>
kai.grin: Tonight? I'll bring snacks. Good snacks. Not courier snacks.
<<else>>
kai.grin: Tomorrow night? I'll bring snacks. Good snacks. Not courier snacks.
<<endif>>
* I'm in. The park, after dark.
  kai.excited: YES. I'm going to plan this like a delivery. Fastest route to a great time.
  <<romance kai invite>>
  <<if var.date_kai == day and loc == "park" and time >= 17*60>>
  kai.grin: Oh wait. We're already in the park. Speed-run!
  -> rom_kai_date
  <<endif>>
* Maybe another night?
  kai.neutral: Another night. Noted. It's going in the spreadsheet under "pending."
  <<romance kai later>>

=== rom_kai_date
<<music park>>
: Kai is sitting on the edge of the fountain with a paper bag of clementines and a flask of hot chocolate, a helmet hanging off one wrist.
kai.grin: You came! Plan B was eating all the clementines myself and pretending that was fine.
: The fountain is lit from underneath, gold and wobbly. Two ducks patrol it like security.
kai.neutral: I ride forty miles a day and never stop anywhere. This is the first place I've stopped in, like, a year.
* Then let's stay stopped for a while.
  kai.excited: Staying stopped. Yeah. That's a good plan.
  <<rel kai 20>>
* Show me your route sometime. I want to see the city the way you do.
  kai.grin: I'll get you a helmet. A cool one. With stickers.
  <<rel kai 20>>
: You peel clementines and toss the peel to the ducks, who are unimpressed, and Kai explains the whole sock theory from the beginning, with diagrams, on a napkin.
: It's the best night you've had in months.
<<time +120>>
<<romance kai dated>>
<<resume_music>>

=== rom_kai_missed
kai.worried: So the ducks and I had a nice time. Just the three of us. The clementines were great.
kai.neutral: It's okay! Things happen. Just… a text would've been nice. Couriers worry. It's in the job description.
<<rel kai -10>>
<<romance kai missed>>

=== rom_kai_confess
: Kai comes in soaked, as always. Instead of a laundry bag, there's a single clementine on the counter.
kai.neutral: I updated the spreadsheet. There's a new tab. It's just called "{name}."
kai.worried: It has one row. The row says "I really, really like you." It's not very scientific.
* Add another row: "Me too."
  kai.excited: Two rows! That's a trend! That's basically a relationship!
  kai.grin: …Is it? A relationship?
  me.laugh: It is.
  <<romance kai partner>>
  <<diary "Kai made a spreadsheet tab about me. We're together now. The spreadsheet says so.">>
* It's a good start. Let's keep collecting data.
  kai.grin: A long-term study. I love a long-term study.
  <<romance kai slow>>

// ================================================================== Priya
=== rom_priya_spark
: Priya's aprons come back folded like a present, with a mint on top. She stands at the counter longer than usual, just looking at them.
priya.thinking: Do you know nobody's taken care of me in about six years?
priya.tired: I feed people for a living. Nine hours a night, eight hundred rolls. And then I come here, and somebody puts a mint on my aprons.
priya.smile: It's ridiculous. It's the best part of my week.
* Then let me be the best part of your week on purpose.
  priya.laugh: Oh, that's a line. That's a real line. Did you practise that?
  priya.smile: …It worked, for the record.
  <<romance priya spark>>
* Anytime. That's what the mints are for.
  priya.smile: Good. Don't you ever stop with the mints.
  <<romance priya friend>>

=== rom_priya_invite
priya.tired: I have a night off. An actual night. I was going to sleep through it.
<<if time < 19*60>>
priya.smile: Or — the community garden, this evening, before it gets dark. It's the only quiet place in this neighbourhood that doesn't beep.
<<else>>
priya.smile: Or — the community garden, tomorrow evening. It's the only quiet place in this neighbourhood that doesn't beep.
<<endif>>
* I'll bring tea. The good kind.
  priya.laugh: A date with tea. Look at us. Terribly responsible.
  <<romance priya invite>>
  <<if var.date_priya == day and loc == "garden" and time >= 17*60>>
  priya.laugh: Which is here. We're standing in it. I'm very tired.
  -> rom_priya_date
  <<endif>>
* Sleep. You need it more than a date.
  priya.sly: Correct, technically. Rude, romantically. Ask me again when I'm human.
  <<romance priya later>>

=== rom_priya_date
<<music garden>>
: Priya is sitting on an upturned crate between the tomato beds, still in her yellow cardigan, eyes closed, face tilted up to the last of the light.
priya.smile: You found me. Sit. There's a second crate. It's a very exclusive venue.
<<pose me tea 3>>
: You pour tea from Rosa's old thermos. The garden smells of wet earth and marigolds. Somewhere, a radio is playing the ball game.
priya.content: At work everything's a timer. Every beep, every oven. Here nothing is. The tomatoes don't care if I'm late.
* Then stay late. As late as you want.
  priya.sly: Careful. I'm a night baker. "Late" means sunrise.
  <<rel priya 20>>
* What made you want to be a baker?
  priya.content: My grandmother. She made jalebi every Diwali and let me do the swirls. I decided I wanted to smell like that forever.
  priya.laugh: Mine never come out as round as hers. But I make a very good cardamom bun.
  <<rel priya 20>>
: The streetlights come on one by one beyond the fence. Priya falls asleep on your shoulder at 8:47, and you let her.
<<time +120>>
<<romance priya dated>>
<<resume_music>>

=== rom_priya_missed
priya.tired: I sat in the garden for an hour. A squirrel judged me.
priya.thinking: I'm not angry. Things come up. Just tell me. People not picking up their bread orders is my whole job. I don't want it to be my evenings too.
<<rel priya -12>>
<<romance priya missed>>

=== rom_priya_confess
: Priya stops by straight off a night shift. Instead of dropping her bag and running, she sits down and pats the space next to her.
priya.tired: I've decided something. At four in the morning, which is when I decide all my important things.
priya.smile: I'd like to come home to someone. And I'd like the someone to be you.
* Come home to me, then. I'll leave the lights on.
  priya.laugh: Don't say that, I'll cry. In public. On a bench.
  priya.smile: …Okay. Yes. You and me.
  <<romance priya partner>>
  <<diary "Priya said she wants to come home to someone. She meant me. I'm leaving the lights on.">>
* I care about you. Can we keep going slowly?
  priya.smile: Slowly is fine. I'm too tired for fast anyway.
  <<romance priya slow>>
`;
