// Tests for docs/audio/soundtrack-prompts.md against the cinematic orchestral spec (AC-01, AC-02): `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const SHEET = read('../../docs/audio/soundtrack-prompts.md');
const SPEC = read(
  '../../docs/superpowers/specs/2026-11-06-soundtrack-cinematic-orchestral-design.md',
);
const MANIFEST = read('../../apps/game/game/audio/audio_manifest.gd');

/** Collapses whitespace and drops Markdown blockquote markers, so wrapping never matters. */
const squash = (text) =>
  text
    .replace(/^\s*>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

/** REQ-02, word for word. */
const SHARED_STYLE =
  squash(`Original instrumental cinematic fantasy RPG soundtrack, emotionally expressive orchestral
composition enriched by authentic medieval and European folk instruments. Memorable lyrical melodies, sophisticated
modal harmonies, warm legato strings, expressive woodwind soloists, deep resonant cellos and double basses,
occasional noble French horns, delicate harp and lute textures, organic acoustic percussion, natural human phrasing,
dynamic orchestral swells, spacious atmospheric passages, and a strong sense of exploration, wonder, nostalgia,
mystery, and adventure. Rich cinematic orchestration with realistic acoustic instrument performances. Develop
musical themes gradually through contrasting sections rather than repeating short rhythmic patterns. The music
should feel like a living fantasy world, not a tavern band or cheerful folk dance.`);
const SHARED_NEGATIVES =
  squash(`No vocals, no choir, no synthesizers, no electronic beats, no modern drum kit, no
cartoonish melodies, no repetitive boom-chuck rhythm, no excessive percussion, no generic trailer music.`);

/** REQ-04 and REQ-05: the loop length range (s) and tempo of every Godot music cue. */
const CUES = {
  title: { length: [120, 180], bpm: 70 },
  spring: { length: [120, 180], bpm: 90 },
  summer: { length: [120, 180], bpm: 96 },
  fall: { length: [120, 180], bpm: 80 },
  winter: { length: [120, 180], bpm: 72 },
  night: { length: [90, 150], bpm: 60 },
  home: { length: [90, 150], bpm: 70 },
  rain: { length: [90, 150], bpm: 64 },
  lowmere: { length: [120, 180], bpm: 90 },
  lowmereNight: { length: [90, 150], bpm: 66 },
  woods: { length: [120, 180], bpm: 72 },
  woodsNight: { length: [90, 150], bpm: 60 },
  woodsFight: { length: [60, 90], bpm: 128 },
  mossdeep: { length: [90, 150], bpm: 60 },
  mossdeepFight: { length: [60, 90], bpm: 122 },
  matron: { length: [60, 90], bpm: 132 },
};

/** REQ-10: the section tags of the three pilot cues. */
const PILOT_TAGS = {
  lowmere: [
    'Intro - solo wooden flute and lute',
    'Main Theme - flute over violas',
    'Development - violins and cellos join',
    'Climax - restrained orchestral swell with horns',
    'Return - flute and lute',
  ],
  woods: [
    'Intro - low cello drone and tremolo violas',
    'Main Theme - distant wooden flute',
    'Development - harp and solo violin',
    'Climax - string ensemble with horn',
    'Return - drone and flute',
  ],
  woodsFight: [
    'Intro - low cello ostinato and frame drums',
    'Main Theme - fierce solo violin',
    'Break - low strings alone',
    'Climax - full orchestra with horn accents',
    'Main Theme - violin and drums',
  ],
};

/** Names a prompt must never contain (originality: describe the sound only). */
const BANNED = [
  'outward',
  'tavern band',
  'zelda',
  'skyrim',
  'witcher',
  'stardew',
  'harvest moon',
  'elder scrolls',
  'final fantasy',
  'lord of the rings',
  'game of thrones',
  'hans zimmer',
  'howard shore',
  'racine',
];

const manifestIds = (kind) => {
  const block = MANIFEST.match(new RegExp(`const ${kind} := \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(block, `${kind} block in audio_manifest.gd`);
  return [...block[1].matchAll(/^\t"([A-Za-z0-9-]+)":/gm)].map((m) => m[1]).sort();
};

/** id → text of each numbered music section of the sheet. */
const sections = () => {
  const out = {};
  for (const part of SHEET.split(/^### /m).slice(1)) {
    const head = part.match(/^\d+\. `(\w+)`/);
    if (head) out[head[1]] = part;
  }
  return out;
};

/** id → prompt text of each music section (its fenced `text` block). */
const prompts = () =>
  Object.fromEntries(
    Object.entries(sections()).map(([id, text]) => {
      const block = text.match(/```text\n([\s\S]*?)```/);
      assert.ok(block, `${id} has a fenced text block for its prompt`);
      return [id, block[1]];
    }),
  );

/** id → prompt text of each jingle row of the sheet's table. */
const jinglePrompts = () => {
  const out = {};
  for (const line of SHEET.split('\n')) {
    const row = line.match(/^\| `([A-Za-z0-9-]+)`\s*\|(.*)\|\s*$/);
    if (!row) continue;
    const cells = line.split('|').map((c) => c.trim());
    out[row[1]] = cells[cells.length - 2];
  }
  return out;
};

/** A comma, period or line separated clause that starts with "no" is a negative. */
const outsideNegatives = (prompt, pattern) =>
  prompt
    .split(/[.,;\n]/)
    .map((clause) => clause.trim())
    .filter((clause) => pattern.test(clause) && !/^no\b/i.test(clause));

test('the spec and the sheet share the REQ-02 style and negatives word for word', () => {
  for (const [name, text] of [
    ['spec', SPEC],
    ['sheet', SHEET],
  ]) {
    assert.ok(squash(text).includes(SHARED_STYLE), `${name} has the shared style`);
    assert.ok(squash(text).includes(SHARED_NEGATIVES), `${name} has the shared negatives`);
  }
  assert.ok(
    !/cinematic medieval folk played by a small live acoustic ensemble/i.test(SHEET),
    'the old bard foundation is gone',
  );
});

test('there is one music section per Godot cue and one jingle row per jingle', () => {
  assert.deepEqual(Object.keys(sections()).sort(), manifestIds('MUSIC'));
  assert.deepEqual(Object.keys(CUES).sort(), manifestIds('MUSIC'));
  assert.deepEqual(Object.keys(jinglePrompts()).sort(), manifestIds('JINGLES'));
});

test('every music cue lists its length, tempo, structure and motif per the spec', () => {
  for (const [id, text] of Object.entries(sections())) {
    const line = text.match(/- \*\*Length \/ tempo \/ key:\*\* (.+)/);
    assert.ok(line, `${id} has a Length / tempo / key line`);
    const range = line[1].match(/(\d+)–(\d+) s/);
    assert.ok(range, `${id} states its length as "N–M s"`);
    assert.deepEqual([Number(range[1]), Number(range[2])], CUES[id].length, `${id} length`);
    assert.equal(Number(line[1].match(/(\d+) BPM/)?.[1]), CUES[id].bpm, `${id} BPM`);

    const structure = text.match(/- \*\*Structure:\*\* (.+)/);
    assert.ok(structure, `${id} has a Structure line`);
    const tags = structure[1].match(/\[[^\]]+\]/g) ?? [];
    assert.ok(tags.length >= 4, `${id} has at least 4 section tags`);
    assert.ok(tags[0].startsWith('[Intro'), `${id} starts with an intro`);
    assert.ok(!/fade/i.test(structure[1]), `${id} never ends in a fade-out`);
    assert.ok(/- \*\*Motif:\*\* \S/.test(text), `${id} has a Motif line`);
  }
});

test('every music prompt follows the five-part shape and the originality rules', () => {
  for (const [id, prompt] of Object.entries(prompts())) {
    assert.match(
      prompt,
      /^Original instrumental cinematic (dark )?fantasy/,
      `${id} opens with its identity`,
    );
    assert.match(prompt, /seamless loop/i, `${id} asks for a seamless loop`);
    assert.match(prompt, /\nNo [a-z]/, `${id} ends with its own "No …" list`);
    for (const fade of prompt.matchAll(/fade[ -]?out/gi)) {
      const before = prompt.slice(Math.max(0, fade.index - 3), fade.index);
      assert.match(before, /no /i, `${id} mentions a fade-out only as "no fade-out"`);
    }
    for (const word of BANNED) {
      assert.ok(!prompt.toLowerCase().includes(word), `${id} must not contain "${word}"`);
    }
    for (const pattern of [/boom-chuck/i, /\bjig\b/i]) {
      assert.deepEqual(
        outsideNegatives(prompt, pattern),
        [],
        `${id}: ${pattern} only in a "no …" clause`,
      );
    }
  }
});

test('the three pilot prompts equal the spec appendix and use the REQ-10 tags', () => {
  const from = SPEC.indexOf('## Appendix: pilot prompts');
  assert.ok(from > 0, 'the spec has the pilot prompts appendix');
  const next = SPEC.indexOf('\n## ', from + 1);
  const appendix = SPEC.slice(from, next === -1 ? undefined : next);
  const fromSpec = {};
  for (const part of appendix.split(/^### /m).slice(1)) {
    const id = part.match(/^`(\w+)`/)?.[1];
    if (id) fromSpec[id] = squash(part.slice(part.indexOf('\n')));
  }
  assert.deepEqual(Object.keys(fromSpec).sort(), Object.keys(PILOT_TAGS).sort());

  const all = prompts();
  const secs = sections();
  for (const id of Object.keys(PILOT_TAGS)) {
    assert.equal(squash(all[id]), fromSpec[id], `${id} prompt matches the appendix word for word`);
    const tags = (secs[id].match(/- \*\*Structure:\*\* (.+)/)[1].match(/\[([^\]]+)\]/g) ?? []).map(
      (t) => t.slice(1, -1),
    );
    assert.deepEqual(tags, PILOT_TAGS[id], `${id} structure tags`);
  }
});

test('every jingle prompt is a short orchestral phrase with a folk soloist and no banned name', () => {
  for (const [id, prompt] of Object.entries(jinglePrompts())) {
    assert.ok(prompt.length > 20, `${id} has a prompt`);
    assert.match(prompt, /string|cello|orchestr/i, `${id} names a string or orchestral part`);
    assert.match(prompt, /resolved|tonic|quiet|ends/i, `${id} says how it ends`);
    for (const word of BANNED) {
      assert.ok(!prompt.toLowerCase().includes(word), `${id} must not contain "${word}"`);
    }
  }
});
