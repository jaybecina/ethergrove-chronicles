# Character art: Meshy-made heroes and villagers in Godot — design

Date: 2026-11-07 · Tier: T3 (T2 if the owner declines Q2) · Status: draft, awaiting the owner's answers to Q1–Q5

## Purpose

Every person in the Godot game today is the same CC0 KayKit Rogue: the player as-is, and the four Lowmere
villagers as tinted copies (`VillagerVisuals.TINTS`). They read as one cartoon character in four colours, and the
game's direction is now a grounded, weathered adventure (a small person in a large, old valley). The owner has
made reference art with Meshy (three previews in `~/Downloads/Meshy_AI_*.png`: a young male and a young female
wanderer in linen, worn leather, cross straps, wrapped forearms, ragged sashes and laced boots). This spec turns
that direction into **original Ethergrove characters**: a pipeline that takes Meshy models into Godot within a
budget, one shared animation set for every humanoid, a distinct model per villager, dialogue portraits, and (Q2) a
choice of two hero bodies at New game. It copies nothing from any game: the references set a mood (grounded,
hand-worn, earth tones), and each design below adds Ethergrove's own motifs and people.

## Sources of truth

- [[decisions/0004-original-ip-cc0-only]]: third-party assets are CC0. Meshy output is **not** third-party CC0, so
  this spec needs decision **0026** (draft below, Q1), the 3D twin of [[decisions/0025-ai-generated-audio-may-ship]].
- Assets Documentation board, version 16 (cards F6, F7, C00–C19): the character designs, colours and heights.
- `2026-11-03-m1-vertical-slice-design.md` §6.2 (villagers, ids and lines), §8 (camera: orthographic, 50° pitch,
  23.0 m outdoors; tiers; "no VRoid content"; "heroes use the current CC0 placeholders"; 2,000 draw-call budget),
  §5 (saves are version 3).
- `2026-10-29-ethergrove-chronicles-design.md` §7.2 ("Always 3D: player, villagers…"; blob shadows) and the story
  bible ("The player (named by the player, any gender)").
- [[decisions/0021-godot-world-structure]]: views follow `GameSession.state_changed`, never cache state, take
  injected `session` / `settings`.
- Code today: `game/player/player_visual.gd`, `game/player/player_clips.gd`, `game/world/villager_visuals.gd`,
  `game/render/model_catalog.gd`, `game/ui/panels/dialogue_box.gd`, `core/player_combat.gd` (states `idle`,
  `attack_hold`, `light`, `heavy`, `dodge`, `block`, `staggered`, `down`).

## What the camera actually shows (measured from §8, not guessed)

At 1280 × 720 the outdoor view is 23.0 m tall, so 31.3 px per metre. A 1.7 m person seen from 50° above shrinks by
cos 50° = 0.64, to **about 34 px tall at 720p and 51 px at 1080p; the head is 5–7 px.** So:

- In play, a character is recognised by **silhouette, height, and one or two large colour areas**, not by its
  face, hair or belt buckles. Every villager below has a distinct outline and one accent colour that covers a
  large area (apron, coat, shawl, doublet).
- Faces, hair and fabric detail only show in **portraits** (REQ-08) and the New game look picker (REQ-10). That is
  where the Meshy detail pays off.
- The reference sheet's 6 faces × 6 hair styles × 6 skin tones × 6 outfits is **not** in scope: a Meshy model is
  one welded mesh with one baked texture (the reference sheet's own "Modular" box is unticked), so each combination would be
  a separate model, and in play the differences are 5 px wide.

## Requirements

### Pipeline

- **REQ-01** Raw Meshy exports live **outside the repo** in `../ai-art/meshy/<id>/<id>.glb` (like `../ai-audio/`),
  never committed. `pnpm game:characters` (new `scripts/prepare-godot-characters.mjs`) builds each into
  `apps/game/assets/characters/<id>.glb` with glTF Transform (already a dev dependency): `copy`, `dequantize`,
  `prune`, `weld`, `simplify` to the triangle budget, `resize` textures to the texture budget, then writes
  `apps/game/assets/characters/report.json` (per id: triangles, materials, largest texture, bone count, clip
  names). It **exits non-zero** if any output breaks its budget (NFR-01) or has no skin. It is idempotent.
- **REQ-02** Every humanoid uses **one shared animation set**, retargeted at import to Godot's
  `SkeletonProfileHumanoid` through one committed `apps/game/assets/characters/humanoid_bone_map.tres`. Logical
  clip names (exact): `idle`, `walk`, `run`, `run_tired`, `slash`, `chop`, `use_item`, `pick_up`, `interact`,
  `cheer`, `attack_light_1`, `attack_light_2`, `attack_light_3`, `attack_heavy`, `dodge_roll`, `block`, `hurt`,
  `knocked_down`, `talk`. Villagers need only `idle` and `talk`. The source clips come from Meshy's animation
  library (Q3); the mapping from source name to logical name lives in one table, `CharacterClips.SOURCE`.
- **REQ-03** `CharacterCatalog` (new, `game/characters/character_catalog.gd`) holds every character as data:
  `id`, `model` (res path, or `""` while it is still a placeholder), `height_m`, `accent` (Color), `portrait`
  (res path or `""`). A character whose model is `""` or fails to load falls back to today's KayKit `player` model
  tinted with its `accent`, so models can land one at a time and the game never breaks.

### Characters (designs are original; prompts in `docs/art/character-prompts.md`, REQ-12)

The designs are the Assets Documentation board's cards (version 16, https://claude.ai/artifact/7EXyyJfTAuXz8uCZ1ZvLQx,
private): C01 and C19 for the heroes, C10–C13 for the villagers, F7 for the readability rules. The board wins where
this table and it disagree; this table only names what each model must show from above.

| id | Board card | Height | Reads from above (the main colour block and outline mark) | Accent |
|---|---|---|---|---|
| `hero_a` | C01, male | 1.72 m | **Moss-green hooded short cloak**, root-knot toggle, linen and scuffed leather | `#4f6b3a` moss |
| `hero_b` | C01, female | 1.62 m | **Moss-green hooded short cloak**, root-knot toggle, linen and scuffed leather | `#4f6b3a` moss |
| `hilda` | C12 | 1.78 m | **Copper hair pinned up, long soot-dark apron** with ember edging; hammer and tongs as props | `#b5652e` ember |
| `aldous` | C13 | 1.82 m | **Long pale-blue clinic coat**, round spectacles (his alone), doctor's bag as a prop | `#a9c3cf` pale blue |
| `fern` | C11 | 1.48 m | **Wide heather-violet shawl** (stiff), cane topped with a root knot, herb basket | `#8d7aa0` heather |
| `bram` | C10 | 1.70 m | **Oxblood waistcoat, bald crown**, brass chain of office, ledger as a prop | `#7d2f2a` oxblood |

- **REQ-04** Ethergrove's own motif, the **root knot** (a carved wooden knot of three twisting roots), appears on
  both heroes (toggle) and on Fern's cane. No character carries a crest, emblem, lantern or symbol from any other
  work, and no Lantern Guild sign on anyone in Lowmere.
- **REQ-05** Models have **empty hands and no weapon, sheath, tool or backpack** fused to the mesh. Held items are
  separate props on a `BoneAttachment3D` named `HandR` (right hand bone): the practice sword
  (`apps/game/assets/characters/props/practice_sword.glb`, a Meshy prop, no rig) shows while
  `state.gear.weapon == "practiceSword"`, and the copper sword while it is `"copperSword"`. Farm tools stay
  unshown (as today).

### In the game

- **REQ-06** `PlayerVisual` draws the catalog model chosen by `state.player.look` (REQ-10; `hero_a` until Q2 is
  built), fitted to its `height_m`. Locomotion keeps today's rules (`PlayerClips.locomotion_clip`, `clip_rate`),
  and `run_tired` replaces `run` when energy is 0 (today it falls back to walking; the walk rule stays as it is,
  only the clip name changes when the model has `run_tired`).
- **REQ-07** In the Woods and Mossdeep, `PlayerVisual` also plays combat clips from the `CombatLayer`'s `pc`
  dictionary through a pure `PlayerClips.combat_clip(state: String, chain: int) -> String`: `light` →
  `attack_light_<chain>` (chain 1–3), `heavy` → `attack_heavy`, `dodge` → `dodge_roll`, `block` → `block`,
  `staggered` → `hurt`, `down` → `knocked_down`, anything else → `""` (locomotion). A combat clip wins over a
  tool one-shot. The combat swing's `toolUsed` event no longer plays `slash` / `chop` on top of it.
- **REQ-08** `VillagerVisuals.spawn` draws each villager's own catalog model (no tint unless it is a fallback),
  looping `idle`, and plays `talk` once when the dialogue box opens for that villager. The dialogue box shows the
  speaker's portrait, 128 × 128 at UI scale 1, left of the name and line; with no portrait it looks as today.
  Today all four villagers stand with `facing: "n"` (`core/data/villagers.gd`), so the camera, which looks north,
  sees only their backs (shot `lowmere`, medium, 2026-11-07). The view turns each villager's model to `"s"`
  (towards the camera) and, while its dialogue is open, towards the player. This is view only: the data's
  `facing` and the interaction rules stay as they are.
- **REQ-09** Portraits are pre-rendered by `pnpm game:portraits` (new `tools/portrait.gd`, like `tools/shot.gd`):
  per character a 512 × 512 PNG with a transparent background, the head and shoulders framed from a fixed 3/4
  front camera at eye height, one warm key light and one cool rim light, saved to
  `apps/game/assets/portraits/<id>.png`. Re-running it with unchanged models gives the same framing.

### Hero look choice (only if Q2 = yes; this is what makes the spec T3)

- **REQ-10** The New game screen gets an **Appearance** row under "Farm name": two portrait buttons, labelled
  "Look 1" (`hero_a`) and "Look 2" (`hero_b`), keyboard and gamepad reachable, "Look 1" selected by default.
  The choice is stored as `state.player.look` (`"hero_a"` | `"hero_b"`). It is cosmetic only: no stat, line or
  rule reads it.
- **REQ-11** Saves move from version 3 to **4**: `SaveMigrate.state_3_to_4` adds `player.look = "hero_a"`; the
  schema accepts only the two ids; a committed v3 fixture migrates to v4 with `hero_a`. The web game is untouched
  (it stays on v2), and `test_parity.gd` chains `state_2_to_3` then `state_3_to_4`.

### Prompts and originality

- **REQ-12** `docs/art/character-prompts.md` holds one paste-ready Meshy prompt per catalog id and per prop: a
  shared style block (verbatim in every prompt), the character's own lines from the table above, a negative
  prompt, and the settings: A-pose, symmetry on, PBR on, realistic style, quad topology, target triangles per
  NFR-01, texture 2048 (heroes) or 1024 (villagers). Prompts never name a game, studio, film, artist or real
  person; a script test enforces the banned list and that every catalog id has a prompt.

### Non-functional

- **NFR-01** Budgets per built model: heroes ≤ 15,000 triangles, villagers ≤ 10,000, props ≤ 1,500; one material
  each; base colour, normal and ORM textures ≤ 2048 px (heroes) or 1024 px (villagers, props); ≤ 70 bones. Lowmere
  with the hero and four villagers stays under the §8 budget (2,000 draw calls) and 60 fps at Low on the owner's
  laptop.
- **NFR-02** The look is the same on every tier (§8): no per-tier model or texture swap. Low keeps its blob shadow.
- **NFR-03** Views never cache state; `PlayerVisual` and `VillagerVisuals` keep taking injected `session` /
  `settings` so GUT tests use no autoloads and no `user://`.

## Non-goals

- Face, hair, skin-tone or outfit presets beyond the two hero bodies; colour-tinting regions of a texture.
- Enemies and the Bramble Matron (Meshy's auto-rig is humanoid only; the Gloamed need their own rigs and spec).
- Sol, Grandpa Elias, Maren Ashcombe and other story characters (M2), and cutscene faces or lip sync.
- The web game (React + three.js), which keeps the KayKit farmer until it retires.
- Changing the camera, the tiers, movement speeds or combat timings.

## Acceptance criteria

- **AC-01** (REQ-01) Given a fixture GLB over budget, the script's budget check fails with the id and the broken
  limit; given one within budget it passes and `report.json` lists triangles, materials, largest texture, bones and
  clips. A second run writes identical bytes. (`scripts/prepare-godot-characters.test.mjs`)
- **AC-02** (REQ-02) Every logical clip in REQ-02 maps through `CharacterClips.SOURCE` to a clip present on each
  hero model after import; `idle` and `talk` exist on each villager model; every bone that
  `SkeletonProfileHumanoid` requires is mapped in `humanoid_bone_map.tres`. (`test_character_rig.gd`)
- **AC-03** (REQ-03) A catalog entry with model `""`, and one whose file is missing, both build the tinted KayKit
  fallback with no script error; every entry with a model path points at an existing file. (`test_character_catalog.gd`)
- **AC-04** (REQ-04, REQ-12) The prompt sheet test fails on any banned name and on a catalog id without a
  prompt, and passes on the committed sheet. (`scripts/art/promptSheet.test.mjs`)
- **AC-05** (REQ-05) With `gear.weapon` null, `HandR` has no child; set to `practiceSword`, it holds the practice
  sword; set to `copperSword`, the copper sword; back to null, empty again. (`test_player_visual.gd`)
- **AC-06** (REQ-06, REQ-07) `PlayerClips.combat_clip` returns exactly the REQ-07 mapping for all eight states and
  chains 1–3; driving a fake `pc` through `light`, `dodge`, `staggered` makes `current_clip()` follow, and a
  `toolUsed` event during `light` does not replace it. (`test_player_clips.gd`, `test_player_visual.gd`)
- **AC-07** (REQ-08) Lowmere spawns four villagers, each with its own model and no tint override; opening Hilda's
  dialogue shows her portrait and plays `talk` once; each villager's model yaw is `FACING_YAW["s"]` at rest and
  points at the player while talking. (`test_villager_visuals.gd`, `test_dialogue_box.gd`)
- **AC-08** (REQ-09) `pnpm game:portraits` writes one 512 × 512 PNG with alpha per catalog id. (`scripts/game.test.mjs`
  for the command; by eye for the framing)
- **AC-09** (REQ-10, REQ-11) New game with "Look 2" gives `player.look == "hero_b"` and the world draws `hero_b`;
  the v3 fixture migrates to v4 with `hero_a`; a v4 save with `look: "hero_c"` is rejected by the schema.
  (`test_new_game_screen.gd`, `test_migrate.gd`, `test_schema.gd`)
- **AC-10** (NFR-01, NFR-02) `report.json` is within budget for every committed model; `pnpm game:smoke` passes;
  `pnpm game:shot` of Lowmere at Low, Medium and High, day and night, shows five people that the owner can tell
  apart at 1280 × 720 (owner's by-eye sign-off); the frame-rate check at Low in Lowmere holds 60 fps.

## Architecture

- **Rules vs view.** Nothing in `apps/game/core/` changes except saves (REQ-11: one key, one migration). Choosing
  clips, props and portraits is view code in `game/characters/` and `game/player/`, reading state, never writing it.
- **New files.** `game/characters/character_catalog.gd` (data, REQ-03), `game/characters/character_clips.gd`
  (`SOURCE` table and lookup, REQ-02), `game/characters/character_rig.gd` (instantiate, fit to height, find the
  `AnimationPlayer`, loop the looped clips, add `HandR`; replaces `PlayerClips.prepare`), `tools/portrait.gd`,
  `scripts/prepare-godot-characters.mjs`, `docs/art/character-prompts.md`, `scripts/art/promptSheet.test.mjs`.
- **Changed files.** `player_visual.gd` (catalog model, combat clips, props), `player_clips.gd` (logical names,
  `combat_clip`), `villager_visuals.gd` (own models, tint only as fallback), `dialogue_box.gd` (portrait),
  `new_game_screen.gd` (Appearance row, Q2), `core/save/migrate.gd` + `schema.gd` (Q2), `combat_layer.gd` (hands
  `pc` to `PlayerVisual` by reference; stops the duplicate `toolUsed` one-shot), `package.json` (two commands),
  `CREDITS.md` (Meshy line, Q1), `.gitignore` (none needed: raw files sit outside the repo).
- **Animation.** One `AnimationLibrary` (`apps/game/assets/characters/humanoid_anims.res`) built at import from the
  source clips, retargeted to `SkeletonProfileHumanoid`, shared by every humanoid. A model with its own baked clips
  still works: `CharacterClips` looks up the logical name in the model's player first, then the shared library.
- **Save impact (Q2 only).** Version 3 → 4, `state_3_to_4`, a real v3 fixture, schema enum.

## Risks and dependencies

- **Licence (Q1).** Meshy's help pages (read 2026-11-07): free-plan outputs are CC BY 4.0 and need a credit;
  paid-plan outputs are owned by the user with no attribution, and keep that status after a downgrade. Models made
  on the free plan would need a CC BY credit, which 0004 does not allow today. → Decision 0026 and a `CREDITS.md`
  line; re-read Meshy's Terms of Service before the first model ships. Steam's AI disclosure covers pre-generated
  3D art as well as music.
- **Originality.** The look of the references (rugged leather wanderers) is a broad genre, but a model that
  closely matched a specific game's hero would not be ours. → Our own motif (REQ-04), our own villagers, a banned
  name list in prompts (REQ-12), and the owner's by-eye check of each model before it is committed.
- **Meshy rigs.** The auto-rig is humanoid only and its bone names must map to `SkeletonProfileHumanoid`; skirts,
  shawls and long coats (Fern, Aldous, Hilda) may stretch with the legs. → Long garments are prompted as stiff or
  split; Fern's skirt clips are checked by eye; a model that deforms badly is re-generated, not hand-fixed.
- **Detail lost at play scale.** Realistic textures turn to mud at 34 px. → Silhouette and accent rules above;
  a by-eye line-up shot (AC-10); a material rim term (0–0.3, set by eye, the same on every tier) only if needed.
- **Simplify on skinned meshes** can tear seams at UV borders. → `weld` before `simplify`, a lock-border option,
  and Meshy's own target polycount set at generation so `simplify` has little to do.
- **Parity tests.** v4 touches `test_parity.gd` and `test_new_game.gd`. → Chain the migrations as REQ-11 says.
- **Dependencies.** No new npm or Godot package. Meshy is the owner's account (Q1).

## Owner questions (recommended answer first)

- **Q1 Licence.** (a) **Generate every shipping model on a paid Meshy plan** (owned, no attribution), record
  decision 0026 "AI-generated 3D characters may ship", add a `CREDITS.md` line and the Steam disclosure.
  (b) Free plan, ship with a CC BY 4.0 credit to Meshy (amends 0004 further). (c) Meshy for reference only; a
  human or CC0 models for the shipping art.
- **Q2 Hero bodies.** (a) **Two bodies chosen at New game** (REQ-10, REQ-11, saves v4). (b) One hero only for now
  (no save change; the spec drops to T2).
- **Q3 Animations.** (a) **Meshy's animation library**, retargeted to the shared humanoid profile, so a CC0 clip
  can fill any gap later. (b) A CC0 humanoid animation pack (licence checked before download, needs your OK as a
  new asset).
- **Q4 Model files.** (a) **You generate in Meshy from `docs/art/character-prompts.md`** and drop the exports in
  `../ai-art/meshy/<id>/`; I build everything else first against the fallback so each model lands with one command.
  (b) You already have exports and send them now.
- **Q5 Build order.** (a) **Hero A first**, then the four villagers, then portraits, then Hero B and the look
  choice. (b) Everything in one pass once all models exist.

## Tasks

- [ ] **T1** Decision 0026 and `CREDITS.md` per Q1 — files: `brain/decisions/0026-*.md`, `CREDITS.md`
- [ ] **T2** Prompt sheet + its test (AC-04) — files: `docs/art/character-prompts.md`, `scripts/art/promptSheet.test.mjs`
- [ ] **T3** Build script + test (AC-01) — files: `scripts/prepare-godot-characters.mjs`, `.test.mjs`, `package.json`
- [ ] **T4** `CharacterCatalog`, `CharacterRig`, `CharacterClips` with fallback (AC-02, AC-03) — files: `game/characters/*`, `test/game/test_character_*.gd`
- [ ] **T5** `PlayerVisual` on the catalog, combat clips, `HandR` props (AC-05, AC-06) — files: `player_visual.gd`, `player_clips.gd`, `combat_layer.gd`, tests
- [ ] **T6** Villagers on their own models, `talk`, portraits in the dialogue box (AC-07) — files: `villager_visuals.gd`, `dialogue_box.gd`, tests
- [ ] **T7** `pnpm game:portraits` (AC-08) — files: `tools/portrait.gd`, `scripts/game.mjs`, `scripts/game.test.mjs`
- [ ] **T8** (Q2) Appearance row, `player.look`, saves v4 with fixture (AC-09) — files: `new_game_screen.gd`, `core/save/*`, tests
- [ ] **T9** Import each model as it arrives: `pnpm game:characters`, bone map, `report.json` (AC-02, AC-10)
- [ ] **T10** Verify: `pnpm game:test`, `pnpm game:smoke`, `pnpm test:scripts`, line-up shots at three tiers day
      and night, frame rate at Low in Lowmere, owner's by-eye sign-off (AC-10); `spec-reviewer`, then `/code-review`

## Deviations

<Filled in during implementation.>
