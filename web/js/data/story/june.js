export default `
=== june_c1
june.gentle: You're standing up straighter than last week, dear.
me.surprised: Am I?
june.sly: Thirty-eight years of third graders. I notice posture.

=== june_c2
june.thinking: Mrs. Haddad on the third floor has started speaking to the Nguyens again. It only took a real estate crisis.
june.sly: Tragedy is wonderful for community relations.

=== june_c3
june.happy: The zucchini are out of control. If you see a zucchini on your doorstep, do not ask questions. Just accept it.

=== june_c4
june.neutral: Your grandmother and I used to walk to the river every Sunday. Four miles. She complained the entire way.
june.gentle: Best walks of my life.

=== june_c5
june.thinking: Do you still draw, dear?
* Every day, lately.
  june.happy: Good. The world has enough people who used to draw.
* Not as much as I should.
  june.gentle: "Should" is a terrible word. Draw because you like it, or don't. Both are fine.
<<rel june 5>>

=== june_c6
june.neutral: My daughter Emi calls every Sunday to ask when I'm moving to Portland.
june.sly: I tell her when Portland learns to make a decent bagel.

=== june_c7
june.gentle: Hiro used to say the laundromat was the only honest place on the street. Nobody can pretend when they're holding their own underwear.
me.laugh: That's… actually profound.
june.happy: He had his moments.

=== june_c8
june.thinking: A knitting tip: count your stitches out loud. The neighbours will think you're casting a spell. It keeps them respectful.

=== june_c9
june.worried: The Nguyens are thinking of leaving before the ninety days are up. Their boy starts a new school in Queens.
june.neutral: I can't blame them. I can only make lemon bars and hope.

=== june_c10
june.gentle: You're doing a good job, you know. With the shop. With the people.
june.sly: I'd give you an A-minus. The minus is for your handwriting on the tickets.

=== june_c11
june.happy: I had a student once who ate a crayon every day for a year. Every day. Always blue.
june.thinking: He's a dentist now. Make of that what you will.

=== june_c12
june.neutral: Come to the garden on Sunday. We weed, we complain, we eat tomatoes off the vine. It's very therapeutic.

=== june_c13
june.worried: I found Hiro's old handkerchiefs while packing. Just in case. Not that I'm packing.
june.gentle: I'm not packing, dear.

=== june_garden
june.happy: There's my garden assistant. Grab the watering can — the beans are sulking.
june.gentle: Everything grows if someone shows up every day. Plants. People. Laundromats.

=== june_h4
<<flag june_h4>>
june.thinking: You see that little tree? The persimmon?
me.neutral: The one that's never fruited.
june.gentle: Hiro planted it the spring before he got sick. He said, "June, I'll be around to eat the first one." He wasn't.
june.happy: So I talk to it. Every evening. I tell it about my day and I tell it to hurry up. It never listens. Just like him.
* Maybe this year.
  june.gentle: Maybe this year. Hope is very good fertiliser.
* Can I talk to it too?
  june.happy: Oh, it would love that. Tell it about the shop. It's nosy.
<<rel june 40>>

=== june_h8
<<flag june_h8>>
june.worried: Emi bought me a plane ticket. To Portland. One way.
june.worried: She says, "Mom, you'll be near the grandkids. No stairs. No landlords. No Crestline."
june.sad: She's right about everything. She always was. She got that from Hiro.
* Then maybe go, June. You deserve easy.
  june.thinking: Easy. What a strange word for the end of a life.
  <<rel june 25>>
* Stay and fight. We need you here.
  june.gentle: ...You sound like Rosa. That's not fair, dear. That's cheating.
  june.happy: I'll think about it. I'll think about it very hard.
  <<rel june 45>>
  <<flag june_fights>>

=== june_h10
<<flag june_h10>>
june.happy: I tore up the plane ticket. Emi's furious. She'll get over it — she has my temper and Hiro's patience.
june.gentle: Here. Rosa's lemon bar recipe. The real one. She always told people it was mine. It was hers. Every bar.
: The card says, in Rosa's handwriting: *"More butter than you think. More lemon than you think. More love than you think."*
june.sly: Don't tell anyone. My reputation depends on it.
<<give lemon_bars 2>>
<<rel june 60>>

=== gift_june_love
june.happy: Oh! Oh, you dear thing. This is lovely.
june.gentle: You pay attention. That's rarer than you think.

=== gift_june_like
june.gentle: How thoughtful. Thank you, dear.

=== gift_june_neutral
june.neutral: For me? Well, isn't that nice.

=== gift_june_dislike
june.worried: Coffee? Oh, dear. My heart does a little tap dance. But it's the thought.

=== gift_june_flowers
june.happy: Marigolds! Rosa always had a jar of these on the counter.
june.gentle: I'll put them by Hiro's picture. He'd like that.
`;
