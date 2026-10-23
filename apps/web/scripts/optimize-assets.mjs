#!/usr/bin/env node
// Converts the CC0 source packs in assets-src/ into small, game-ready files in public/assets/.
// Models: dedup, prune, weld, textures resized to ≤512 px WebP, Meshopt geometry. Audio: .ogg + .m4a.
// Usage: node apps/web/scripts/optimize-assets.mjs <assets-src dir> <apps/web/public/assets dir>
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import {
  dedup,
  meshopt,
  prune,
  resample,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [src = 'assets-src', out = 'apps/web/public/assets'] = process.argv.slice(2);
const KN = 'kenney-nature/x/Models/GLTF format';
const KF = 'kenney-furniture/x/Models/GLTF format';
const Q = 'quaternius/x/glTF';

/** Published key → source file (relative to assets-src). Keep in sync with src/scene/assets.ts. */
export const MODELS = {
  player: 'kaykit/Rogue.glb',
  'tree-round-1': `${Q}/CommonTree_1.gltf`,
  'tree-round-2': `${Q}/CommonTree_2.gltf`,
  'tree-round-3': `${Q}/CommonTree_3.gltf`,
  'tree-dead-1': `${Q}/DeadTree_1.gltf`,
  'tree-dead-2': `${Q}/DeadTree_2.gltf`,
  'tree-pine-1': `${Q}/Pine_1.gltf`,
  'tree-pine-2': `${Q}/Pine_2.gltf`,
  bush: `${Q}/Bush_Common.gltf`,
  'bush-flowers': `${Q}/Bush_Common_Flowers.gltf`,
  'flowers-1': `${Q}/Flower_3_Group.gltf`,
  'flowers-2': `${Q}/Flower_4_Group.gltf`,
  'rock-1': `${KN}/rock_smallA.glb`,
  'rock-2': `${KN}/rock_smallC.glb`,
  'rock-3': `${KN}/rock_smallE.glb`,
  'weed-1': `${Q}/Fern_1.gltf`,
  'weed-2': `${Q}/Grass_Common_Tall.gltf`,
  stump: `${KN}/stump_roundDetailed.glb`,
  fence: `${KN}/fence_simple.glb`,
  'crop-sprout': `${KN}/crops_leafsStageA.glb`,
  'crop-young': `${KN}/crops_leafsStageB.glb`,
  'crop-turnip': `${KN}/crop_turnip.glb`,
  'crop-melon': `${KN}/crop_melon.glb`,
  'crop-pumpkin': `${KN}/crop_pumpkin.glb`,
  'corn-a': `${KN}/crops_cornStageA.glb`,
  'corn-b': `${KN}/crops_cornStageB.glb`,
  'corn-c': `${KN}/crops_cornStageC.glb`,
  'corn-d': `${KN}/crops_cornStageD.glb`,
  bed: `${KF}/bedSingle.glb`,
  rug: `${KF}/rugRounded.glb`,
  'potted-plant': `${KF}/pottedPlant.glb`,
  table: `${KF}/tableRound.glb`,
  chair: `${KF}/chair.glb`,
  lamp: `${KF}/lampRoundFloor.glb`,
};

/** Sound id → source .ogg (relative to assets-src). Missing ids fall back to the synth in-game. */
export const SOUNDS = {
  hoe: 'kenney-impact/x/Audio/impactSoft_medium_001.ogg',
  sickle: 'kenney-rpg/x/Audio/knifeSlice.ogg',
  chop: 'kenney-rpg/x/Audio/chop.ogg',
  break: 'kenney-impact/x/Audio/impactMining_002.ogg',
  swing: 'kenney-rpg/x/Audio/drawKnife2.ogg',
  harvest: 'kenney-interface/x/Audio/pluck_001.ogg',
  plant: 'kenney-interface/x/Audio/drop_002.ogg',
  coin: 'kenney-rpg/x/Audio/handleCoins.ogg',
  door: 'kenney-rpg/x/Audio/doorOpen_1.ogg',
  chime: 'kenney-jingles/x/Audio/Pizzicato jingles/jingles_PIZZI03.ogg',
  deny: 'kenney-interface/x/Audio/error_004.ogg',
  'step-grass': 'kenney-impact/x/Audio/footstep_grass_000.ogg',
  'step-dirt': 'kenney-rpg/x/Audio/footstep01.ogg',
  'step-wood': 'kenney-impact/x/Audio/footstep_wood_000.ogg',
  'step-snow': 'kenney-impact/x/Audio/footstep_snow_000.ogg',
};

/** Animation clips the farmer actually uses; the other ~65 are dropped to save bandwidth. */
const PLAYER_CLIPS = new Set([
  'Idle',
  'Walking_A',
  'Running_A',
  '2H_Melee_Attack_Chop',
  '1H_Melee_Attack_Slice_Horizontal',
  'Use_Item',
  'Interact',
  'PickUp',
  'Cheer',
  'Lie_Idle',
]);

/** Dense scenery is drawn dozens of times (plus a shadow pass); thin it for phones. */
const SIMPLIFY = /^(tree-|bush|flowers)/;

async function models() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  mkdirSync(join(out, 'models'), { recursive: true });
  for (const [key, file] of Object.entries(MODELS)) {
    const doc = await io.read(join(src, file));
    if (key === 'player')
      for (const a of doc.getRoot().listAnimations())
        if (!PLAYER_CLIPS.has(a.getName())) a.dispose();
    await doc.transform(
      dedup(),
      prune(),
      resample(),
      weld(),
      ...(SIMPLIFY.test(key)
        ? [simplify({ simplifier: MeshoptSimplifier, ratio: 0.4, error: 0.02 })]
        : []),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512] }),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    );
    doc.createExtension(EXTMeshoptCompression).setRequired(true);
    await io.write(join(out, 'models', `${key}.glb`), doc);
    console.log('model', key);
  }
}

function sounds() {
  mkdirSync(join(out, 'audio'), { recursive: true });
  for (const [id, file] of Object.entries(SOUNDS)) {
    const ogg = join(out, 'audio', `${id}.ogg`);
    copyFileSync(join(src, file), ogg);
    // Safari without Ogg support gets AAC (macOS afconvert).
    try {
      execFileSync('afconvert', [
        '-f',
        'm4af',
        '-d',
        'aac',
        '-b',
        '96000',
        ogg,
        join(out, 'audio', `${id}.m4a`),
      ]);
    } catch {
      console.warn('afconvert unavailable: skipped', `${id}.m4a`);
    }
    console.log('sound', id);
  }
}

await models();
sounds();
