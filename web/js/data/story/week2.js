export default `
=== d8_offer
: A thicker envelope this time. Gold-edged.
<<letter crestline_offer>>
<<flag crestline_offer>>
me.surprised: Four hundred thousand dollars.
me.thinking: That's Rosa's debts, gone. My loans, gone. Art school — I could finish.
me.worried: And Walt would go… where, exactly? And June? And Maya at midnight?
me.sad: Abuela. Why didn't you leave me something simple. Like a houseplant.
<<goal "The Crestline offer stands until Sept 28. For now: keep Rosa's running.">>
<<diary "Crestline offered $400,000. I read it four times. I didn't tell anyone.">>

=== june_offer_talk
june.thinking: You've got the look.
me.worried: What look?
june.neutral: The one people get when a man in a nice coat writes them a number. Rosa got it every spring.
june.gentle: Don't let anyone rush you, dear. Not them. Not us. Not even that stubborn old woman's ghost.
june.sly: Although the ghost would like you to stay. For the record.
<<rel june 15>>

=== walt_lesson
<<flag walt_lesson>>
walt.neutral: Show me how you fixed number three.
me.smug: Bolts. Belt. Prayer.
walt.laugh: Prayer's not a tool.
walt.neutral: Here. Listen before you touch anything. Machines tell you what's wrong if you shut up long enough.
: Walt puts your hand flat on the side of washer two. It hums. Then it *ticks*.
walt.neutral: Hear the tick? Bearing's going. Two weeks, it'll scream. Tighten it now, it'll run till Christmas.
me.surprised: How do you *know* that?
walt.content: Thirty-one years at the Cap & Seal plant. Right where they want to put their glass tower. I kept those bottling lines running with a wrench and a bad attitude.
walt.sad: Then they shut it down and sold the lot, and here we are.
<<skill repair>>
: Walt taught you his tricks. Repairs are easier now (wider green zone).
<<rel walt 30>>

=== maya_track
<<flag maya_track>>
maya.worried: Okay. So. Don't laugh.
: She hands you one side of her headphones. A soft, swinging beat: the chug of washer two, the tumble of the dryers, a coin clinking, rain.
: Then a piano melody drifts in over the top, slow and bright, like the lights coming on in here at night.
me.surprised: Maya. That's the *shop*.
maya.content: That's the shop. I've been recording it for a year. It's the only place I can think.
maya.neutral: It doesn't have a name yet.
* Call it "Spin Cycle."
  maya.laugh: So obvious it's perfect.
  <<set trackName "Spin Cycle">>
* Call it "Rosa's at Midnight."
  maya.content: ...Yeah. Yeah, that's the one.
  <<set trackName "Rosa's at Midnight">>
  <<rel maya 10>>
* Call it "Grumpy's Groove."
  maya.laugh: For washer three? He'd hate it. I love it.
  <<set trackName "Grumpy's Groove">>
maya.worried: Can I… keep recording here? After close? I'd be quiet. Mostly.
* Of course. The machines would miss you.
  <<flag maya_records_night>>
  <<rel maya 30>>
  <<community 3>>
* Once a week. I need some sleep, too.
  <<flag maya_records_night>>
  <<rel maya 15>>
<<rel maya 20>>
<<diary "Maya played me her music. It sounds like the shop at night. I didn't know a place could sound like that.">>

=== june_pwyc
<<flag pwyc_idea>>
june.thinking: Dear, can I be nosy?
me.laugh: You've never asked before.
june.sly: I'm practising manners. Mrs. Haddad on the third floor is doing her sheets in her bathtub. Lina with the baby is counting quarters.
june.gentle: Rosa used to open Sunday afternoons, pay-what-you-can. She lost money every time. She said it was the best money she ever lost.
: *Pay-what-you-can Sundays* are now available under Prices in the catalog. They cost money — and build community.
<<rel june 15>>

=== d11_june_rushes
<<visit june stay 90>>

=== june_sold
<<flag june_sold>>
<<flag alder_sold>>
june.worried: They sold it.
me.surprised: June? Sit down. What happened?
june.worried: The Alder Arms. Crestline bought it this morning. There's a letter on every door. "Renovations." Ninety days.
june.sad: Forty-four years. Hiro carried me over that threshold. I raised Emi in 4B. I know which floorboard squeaks and which pipe sings.
june.thinking: Mrs. Haddad is crying in the lobby. The Nguyens are already packing. I told them we're not packing. Not yet.
june.neutral: We need somewhere to meet. Somewhere that isn't theirs.
* Meet here. Thursday nights. I'll make the tea.
  june.gentle: ...Rosa would have said exactly that.
  <<flag tenants_meetings>>
  <<rel june 40>>
  <<community 10>>
* Here? I don't know, June — I'm barely keeping the place afloat.
  june.worried: No. No, of course. I'm sorry, dear.
  june.neutral: We'll use Mrs. Haddad's living room. It smells like mothballs but the chairs are good.
  <<rel june -10>>
<<diary "Crestline bought June's building. Ninety days. June didn't cry. I did, after.">>

=== walt_quilt
<<flag walt_quilt>>
walt.neutral: Something special today.
: He sets down a bundle wrapped in a clean pillowcase. Inside: a patchwork quilt, faded blues and rusts, one corner coming apart.
walt.neutral: Peg made it. Our first winter. Every square's a shirt one of us wore out.
<<if hearts.walt >= 3>>
walt.sad: She's been gone two years in February. I haven't washed it since. Couldn't.
walt.sad: It still smelled like her. Now it just smells like my apartment.
me.sad: Walt…
walt.neutral: Cool water. Gentle cycle. And kid — the blue washer, if you've got one. Rosa always used her best machine for it.
<<rel walt 35>>
<<else>>
walt.neutral: Cool water. Gentle cycle. Don't ask.
<<rel walt 15>>
<<endif>>
<<order walt delicate>>
<<diary "Walt brought Peg's quilt. I washed it like it was made of glass.">>

=== d13_bodega_morning
<<flag bodega_closed>>
: Down the street, a truck is loading crates out of Delgado's. A paper sign in the window: FOR LEASE.

=== bodega_closing
<<flag bodega_scene>>
: Luis Delgado sits on an upturned crate on the sidewalk, looking at his dark shop window.
remy.worried: They painted over my mural this afternoon. "Harbor Dreams." Six years on that wall. Three coats of grey primer.
remy.skeptical: And Luis is done. Thirty-one years, done, because a company with a logo like a toothpaste brand decided his rent should be five grand.
<<flag mural_gone>>
* It isn't fair, Remy.
  remy.worried: No. It isn't.
  remy.neutral: Thanks for not saying "that's just how cities work." Everybody keeps saying that.
  <<rel remy 25>>
* We could fight this. Somehow.
  remy.skeptical: With what? A laundromat and a very old cat?
  remy.neutral: ...Okay. Say more. Later. When I'm less mad.
  <<rel remy 20>>
  <<flag fight_seed>>
remy.neutral: Luis gave me this. Said you'd want it for the shop.
<<give record 1>>
<<diary "Delgado's closed. They painted over Remy's mural. Linden Street is losing its face one wall at a time.">>

=== garden_workday
june.happy: Grab a trowel! Sunday work day. Everyone who eats the tomatoes weeds the tomatoes.
: You spend the afternoon on your knees in the dirt with half the neighbourhood. Mrs. Haddad hums. Coach Dee's kids fling mulch at each other.
june.gentle: This is what they don't put in the brochure, dear. This.
<<community 6>>
<<rel june 20>>
<<give flowers 1>>
<<time +90>>

=== tenants_meeting_1
<<flag tenants_1>>
: After close, the Alder Arms tenants crowd into the laundromat: folding chairs, June's lemon bars, twenty worried faces in the dryer light.
june.neutral: Item one. Nobody signs anything Crestline sends. Item two. We need a lawyer, and we can't afford a lawyer.
june.thinking: Item three. We need the whole street to care, not just us.
me.thinking: A petition? Rosa's gets more foot traffic than anywhere on the block.
june.gentle: Now you're thinking like a teacher.
<<flag petition_plan>>
<<community 8>>
<<rel june 15>>
`;
