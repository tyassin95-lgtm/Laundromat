# Credits

## Art

- **Characters, portraits and UI**: the player, her portraits, the UI frames and most item icons come from the sprite sheets supplied by the game's creator (`art/source/`), cut into sprites by `tools/slice_sheets.py`; `tools/derived_sprites.py` composited some of the player's poses. The eight neighbours' and friends' full-body sprites and nine-expression portrait sheets were supplied as images too (`art/source/characters/`, imported with `tools/import_character.py`).
- **Scenes, machines and props (v1.4)** were generated with **Higgsfield** (GPT Image 2.5) as flat 2D art, from flat colour blockings of each scene and with the game's own art as style references: every background (the laundromat, the flat, Linden Street and its closed-shop and night versions, the park, the garden and its night version, the riverside, the far skyline and its night lights, and the two views out of the windows, day and night); the six washers and five dryer towers, closed and with their doors open; the furniture, decor, street furniture, signs and billboards, laundry, puddles, lint bunny, pigeons, clouds and leaves; the clock parts, door signs and moon; the traffic and passers-by seen through the shop window; and the player's sitting, knitting and folding poses. The originals are in `art/source/generated/` and the prompts and import commands in `tools/art_requests.json`.
- **Earlier generated art** (Higgsfield): the neighbourhood map, the bed, the player's hobby poses (tea, reading, sketching, watering, photography, petting Biscuit, feeding pigeons), the upgrade icons, and the lemon bars, scarf, spray paint, ma'amoul and old photo icons.
- **Launcher icon** was composed from the classic washer sprite by `tools/make_icons.py`.

## Music

All music is by **Kevin MacLeod** ([incompetech.com](https://incompetech.com)), licensed under
[Creative Commons: By Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

| Used for | Track |
| --- | --- |
| `title` | "Gymnopedie No 1" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `laundromat_day` | "Local Forecast - Elevator" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `laundromat_day2` | "Lobby Time" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `laundromat_night` | "Wallpaper" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `lounge_night` | "Backbay Lounge" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `home` | "Dreamer" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `home_night` | "Fireflies and Stardust" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `morning` | "Easy Lemon" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `cafe` | "Bossa Antigua" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `street` | "Sidewalk Shade" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `park` | "Laid Back Guitars" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `garden` | "Porch Swing Days - slower" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `tension` | "Deliberate Thought" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `community` | "Carefree" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `bittersweet` | "Frost Waltz" — Kevin MacLeod (incompetech.com), CC BY 4.0 |
| `ending` | "Somewhere Sunny" — Kevin MacLeod (incompetech.com), CC BY 4.0 |

## Sound effects and ambience

**Kenney** ([kenney.nl](https://kenney.nl)), CC0 1.0: *Interface Sounds*, *RPG Audio*, *Impact Sounds* and *Music Jingles*.

**Freesound.org** contributors, all [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):

- "Small applause" by Breviceps: https://freesound.org/people/Breviceps/sounds/462362/
- "Small Crowd Applause" by miuziqa: https://freesound.org/people/miuziqa/sounds/858309/
- "Morning Birds with Crows.wav" by WanderingLeprechaun: https://freesound.org/people/WanderingLeprechaun/sounds/678073/
- "a bus stop in Almaty city - bus arrive & depart - creaky brakes.WAV" by gladkiy: https://freesound.org/people/gladkiy/sounds/331520/
- "Miss Michelle's cafe in Discovery Mountain -- small cafe ambience - room tone - small crowd" by douglasbruce@look.ca: https://freesound.org/people/douglasbruce@look.ca/sounds/746428/
- "Contarex camera shutter.wav" by Tonik1105: https://freesound.org/people/Tonik1105/sounds/520684/
- "cat meow short" by skymary: https://freesound.org/people/skymary/sounds/412017/
- "New Cat Meow 1" by steffcaffrey: https://freesound.org/people/steffcaffrey/sounds/479272/
- "Cat Purr" by RazzleDizzle: https://freesound.org/people/RazzleDizzle/sounds/575933/
- "Small Crowd Chatter" by snakebarney: https://freesound.org/people/snakebarney/sounds/138118/
- "wind chimes - single 04.wav" by Anthousai: https://freesound.org/people/Anthousai/sounds/398496/
- "City at Night_Ambience.wav" by YellowJacketStudios: https://freesound.org/people/YellowJacketStudios/sounds/423644/
- "Natural Metal Coin Sound 1.wav" by The-Sacha-Rush: https://freesound.org/people/The-Sacha-Rush/sounds/400115/
- "Coins Dropping in Glass Jar.wav" by sweet_niche: https://freesound.org/people/sweet_niche/sounds/481805/
- "shop_door_bell.wav" by 3bagbrew: https://freesound.org/people/3bagbrew/sounds/57743/
- "Ryuuzan_shop_door_bell00.wav" by ryuuzan: https://freesound.org/people/ryuuzan/sounds/192761/
- "Tumble dryer door open close.wav" by greatsoundstube: https://freesound.org/people/greatsoundstube/sounds/631886/
- "Kettle Whistle 01" by aglinder: https://freesound.org/people/aglinder/sounds/264475/
- "knitting and dropping metal knitting needle" by HanulSkyGirl: https://freesound.org/people/HanulSkyGirl/sounds/505486/
- "Room Tone - Laundromat at Night" by Sounds_by_Cois: https://freesound.org/people/Sounds_by_Cois/sounds/553804/
- "laundromat washers washing machines rattle vibrate4.flac" by kyles: https://freesound.org/people/kyles/sounds/454465/
- "Swiffer Mopping Tile Floor.wav" by blwuens: https://freesound.org/people/blwuens/sounds/515158/
- "Record Player Needle is dropped & Vinyl crackling" by Breviceps: https://freesound.org/people/Breviceps/sounds/556722/
- "Pencil - drawing lines" by GeorgeHopkins: https://freesound.org/people/GeorgeHopkins/sounds/650994/
- "cell phone vibrate glass_loopable.wav" by mobaudio: https://freesound.org/people/mobaudio/sounds/384487/
- "pigeon walking and cooing.wav" by 5ro4: https://freesound.org/people/5ro4/sounds/701282/
- "Rain from Indoors - Perfect loop" by samesamesame: https://freesound.org/people/samesamesame/sounds/242889/
- "Slowly Raining Loop" by unfa: https://freesound.org/people/unfa/sounds/177479/
- "Ratchet Wrench Fast Multiple" by Rudmer_Rotteveel: https://freesound.org/people/Rudmer_Rotteveel/sounds/591529/
- "Socket wrench.wav" by Loinnats: https://freesound.org/people/Loinnats/sounds/616628/
- "paint_shake_and_spray.wav" by Mohagged: https://freesound.org/people/Mohagged/sounds/707374/
- "street corner side street quiet night distant traffic and people and barking dog echo Cusco, Peru, South America.wav" by kyles: https://freesound.org/people/kyles/sounds/413949/
- "thunder 5 dry.wav" by elmoustachio: https://freesound.org/people/elmoustachio/sounds/476739/
- "Short_Thunder_Deep.wav" by SholeColtis: https://freesound.org/people/SholeColtis/sounds/683420/
- "Tumble dryer recorded very close with a microphone and a contact-microphone (mixed)" by felix.blume: https://freesound.org/people/felix.blume/sounds/188454/
- "Typewriter Bell.wav" by ramsamba: https://freesound.org/people/ramsamba/sounds/318687/
- "Typewriter - single key - type 1.wav" by yottasounds: https://freesound.org/people/yottasounds/sounds/380138/
- "CRACKLE (6).wav" by DefySolipsis: https://freesound.org/people/DefySolipsis/sounds/531438/
- "washing machine rinse .wav" by afnan808: https://freesound.org/people/afnan808/sounds/384121/
- "washing machine, centrifugue" by ohrpilot: https://freesound.org/people/ohrpilot/sounds/182011/

A few short UI and machine beeps (the machine-done chime, the heart and sparkle chimes, the till bell, whooshes and the dialogue voice blip) were synthesised by `tools/build_audio.py`.

## Fonts

All under the [SIL Open Font License 1.1](web/assets/fonts/OFL.txt):

- **Patrick Hand** by Patrick Wagesreiter
- **Fraunces** by Undercase Type (Phaedra Charles, Flavia Zimbardi)
- **Pacifico** by Vernon Adams, Jacques Le Bailly, Botjo Nikoltchev, Ani Petrova
- **Caveat** by Impallari Type

## Code

The game engine, systems, story and Android host were written for this project. They have no third-party runtime dependencies.
