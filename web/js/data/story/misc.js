export default `
=== chat_generic
: They smile and wave. Busy day.

=== debt_help
<<flag debt_help>>
: There's an envelope under the door. No stamp. Inside: a stack of bills — fives, tens, a few very old twenties — and a note in three different handwritings.
: *"For the shop. Don't argue. — J.I., W.S., and the Corner Cup tip jar."*
me.sad: Oh, you guys.
<<if community >= 30>>
<<money 180 "Neighbours passed the hat">>
<<else>>
<<money 110 "Neighbours passed the hat">>
<<endif>>
<<community 4>>
<<diary "The neighbours passed a hat for the shop. I cried into the lint trap.">>

=== prices_reaction
<<flag prices_reacted>>
<<if var.none>>
<<endif>>
me.thinking: New prices on the board. People will notice.

=== first_sock
<<if socks == 1>>
: Into the lost-and-found basket it goes. Rosa kept one for fifty years. Somewhere out there, a thousand socks are waiting for their other halves.
: *Lost socks* turn up in the shop and around the neighbourhood. Collect all twelve.
<<endif>>

=== all_socks
: Twelve lost socks, washed, paired with nothing, hung on a string over the counter like prayer flags.
me.laugh: Abuela, I finished your collection.
<<decor string_lights "The Lost Sock Garland (string lights)">>
<<community 5>>

=== late_night_shop
: The shop at night: the fridge hum, the streetlight through the glass, Rosa's photo taped by the register.
me.neutral: It's different when it's empty. It feels like it's listening.

=== gift_generic_love
: They light up. That was exactly right.

=== gift_generic_like
: They smile. A good gift.

=== gift_generic_neutral
: They thank you politely.

=== gift_generic_dislike
: They hesitate. Not their thing.
`;
