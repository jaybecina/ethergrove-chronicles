# Character concept prompts (ChatGPT images → free image-to-3D)

The owner's direction (7 Nov 2026): every human in Ethergrove looks like the two hero concepts in
`~/Downloads/Meshy_AI_Young Male Base Reference.png` and `…Female Base Reference.png`. That means grounded, gritty
and weathered: distressed dark leather, crossed straps, rolled grubby linen, frayed cloth, wrapped boots. The earlier
board designs (moss cloak, colour plan v16) are retired. Each person keeps one accent colour and one thing that
makes them recognisable from the game camera, where a person is about 34 px tall.

## How to use this sheet

1. Open ChatGPT (free plan) and start a new chat.
2. **Attach the male hero reference image** and paste this first line before the prompt:
   `Use the attached image only as a reference for rendering style, realism and level of wear. Draw a different person.`
3. Paste the **style block**, then the character's lines, then the **avoid** line. Ask for a portrait image (3:4).
4. Save the image as `~/Downloads/ethergrove-<id>.png` (for example `ethergrove-hilda.png`). Pick the best of 2–3
   tries. The arms must hang away from the body and both boots must be in frame, or the 3D step fails.
5. Hand the image to the image-to-3D step (Hunyuan3D 2.1 on the Mac, or TRELLIS.2 when its free demo has quota).

Prompts never name a game, studio, film, artist or real person (spec REQ-12).

FLUX reads "young" as a child: every adult who is young starts with "An adult woman (or man) in her (his)
twenties". Lead each entry with what must show (age, build, bald head), because FLUX follows the start of the prompt most.

## Style block (paste in every prompt, unchanged)

> Full-body character concept for a grounded, gritty fantasy RPG. Realistic and weathered: hand-worn clothes of
> distressed dark leather with visible stitching and rivets, rolled and grubby linen, frayed and torn cloth edges,
> leather straps and iron buckles, layered materials, a muted earthy palette with one accent colour. One person only,
> standing straight in a relaxed A-pose with the arms held slightly away from the body and the feet shoulder-width
> apart, facing the camera, the whole body from head to boots in frame. Plain flat light-grey background, soft even
> studio light. Photorealistic 3D-render look with sharp material detail. Empty hands.

## Avoid (paste after the character lines)

> Avoid: weapons, swords, sheaths, shields, held tools or bags in the hands; text, logos, watermarks, frames;
> extra people; cropped feet or head; glowing magic effects; shiny plate armour; bright saturated colours.

## Characters

Heights are for the 3D build, not the prompt. Ids match the spec's catalog.

### Heroes (concepts already exist; use the reference images directly)

- **hero_a (male hero, C01), 1.72 m.** Use `Meshy_AI_Young Male Base Reference.png`.
- **hero_b (female hero, C01), 1.62 m.** Use `Meshy_AI_Young Female Base Reference.png`.

### Lowmere villagers (in the Godot build now: do these first)

- **hilda (C12), 1.78 m.** A broad-shouldered blacksmith woman in her late forties with copper-red hair in a thick
  braid pinned up. Heavy soot-blackened leather forge apron to the shins with burnt-orange edging, worn over a rolled
  linen shirt; thick leather gloves tucked in her belt; burn scars on her forearms; heavy scuffed work boots. Accent
  colour: burnt orange.
- **aldous (C13), 1.82 m.** A tall, thin village doctor in his sixties with neat grey hair and round wire spectacles.
  A long faded pale-blue linen coat to the calves, stained at the cuffs, over a dark waistcoat; leather straps holding
  small glass vials across his chest; dark trousers and laced boots. Accent colour: faded pale blue.
- **fern (C11), 1.48 m.** A small stooped old woman in her eighties with white hair in a low bun. A wide hand-knitted
  shawl in dull heather purple wrapped over her shoulders, a long dark wool skirt, a patched apron with herb pouches,
  worn soft boots. Accent colour: dull heather purple.
- **bram (C10), 1.70 m.** A stout, round-bellied, kindly village mayor in his fifties with a bald crown and grey
  side whiskers, no hair on top of his head. A worn dark oxblood wool waistcoat over a cream linen shirt with rolled
  sleeves, a heavy dull brass chain of office hanging across his chest, dark trousers and scuffed boots. Accent
  colour: dark oxblood.

### Romance candidates

- **theo (C05), 1.80 m.** A tall young blacksmith's son, short dark hair, soot on his forearms. A long charcoal
  leather forge apron with burnt-orange stitching over a grey linen shirt, a travel pack with a rolled blanket on his
  back. Accent colour: burnt orange.
- **mira (C04), 1.64 m.** An adult woman in her mid-twenties, a grown-up herbalist of average height, with a long brown braid with small dried flowers woven in. A pale sage
  linen apron with pockets over a rolled-sleeve shirt and leather bodice, a small herb satchel on her hip. Accent
  colour: pale sage green.
- **june (C06), 1.66 m.** An adult woman in her late twenties, a tall, weathered, freckled fisher with auburn hair under a knitted cap. A faded mustard
  oilskin jacket, a rope belt, rolled trousers and tall rubber-and-leather boots. Accent colour: faded mustard.
- **rowan (C07), 1.80 m.** A lean tracker with a hooded bark-brown cloak and a wolf-grey fur mantle over his
  shoulders, leather bracers, a bone charm on a cord, a quiver strap across his chest. Accent colour: wolf grey.
- **celeste (C08), 1.63 m.** An adult woman in her mid-twenties, a grown-up cartographer of average height, with curly dark hair and brass goggles pushed up on her head. A
  short dark-navy guild coat with brass buttons, ink-stained fingers, a leather map-tube strap across her back. Accent
  colour: dark navy.
- **sol (C09), 1.70 m.** A travelling merchant with a wide-brimmed leather hat, layered faded saffron and plum
  scarves, and many small satchels and pouches on crossed belts. Accent colour: faded saffron.

### Townsfolk and story characters

- **pip (C14), 1.30 m.** A cheerful village boy about ten years old with messy brown hair. Patched faded navy
  overalls over a grubby linen shirt, scuffed boots. Accent colour: faded navy.
- **wren (C15), 1.22 m.** A small village girl about eight years old in a hooded brick-red raincoat to her knees and
  muddy rain boots. Accent colour: brick red.
- **marlow (C16), 1.68 m.** An old retired fisherman with a thick white beard, a soft faded sea-blue cap and a
  cream cable-knit sweater with holes at the elbows, patched trousers and old boots. Accent colour: faded sea blue.
- **elias (C02), 1.85 m.** A tall, lean old man with a white beard, the last of an order of forest wardens. A long
  dark moss-green coat to the shins with a band of bronze root-like embroidery at the hem, leather straps and belts,
  tall worn boots. Accent colour: dark moss green.
- **victor (C03), 1.84 m.** A broad, hard-faced captain in his forties with close-cropped dark hair and a scar over
  one brow. A dark-navy guild coat with dented iron plates on both shoulders, a small brass lantern clipped to his
  left shoulder strap. Accent colour: dark navy.
- **isel (C17), 1.95 m.** A very tall, ageless woman with long pale silver-green hair. Long robes woven from pale
  root fibres, a thin circlet of pale teal crystal. Muted and earthy like everyone else, with no glow in the concept.
  Accent colour: pale teal.
