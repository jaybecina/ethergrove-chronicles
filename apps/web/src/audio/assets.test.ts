// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilePiece } from '../studio/score';
import { TRACK_PIECES } from '../studio/pieces';
import { JINGLES, MUSIC, SFX_FILES, type AudioFile } from './manifest';

const WEB = join(__dirname, '../..');
const PUBLIC = join(WEB, 'public/assets');
const KB = 1024;
/** Audio budgets (orchestral spec §1.1, audio spec §6). */
const BUDGET = { total: 9 * KB * KB, track: KB * KB, jingle: 120 * KB, sfx: 40 * KB };

const entries = (table: Record<string, AudioFile>) => Object.entries(table);
const all = [...entries(MUSIC), ...entries(JINGLES), ...entries(SFX_FILES)];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
}

describe('shipped audio', () => {
  it('has a file for every manifest entry, with the bytes the manifest says', () => {
    for (const [id, f] of all) expect(statSync(join(PUBLIC, f.file)).size, id).toBe(f.bytes);
  });

  it('covers every track of the soundtrack', () => {
    expect(Object.keys(MUSIC).sort()).toEqual(Object.keys(TRACK_PIECES).sort());
  });

  it('stays within the size budgets', () => {
    for (const [id, f] of entries(MUSIC)) expect(f.bytes, id).toBeLessThanOrEqual(BUDGET.track);
    for (const [id, f] of entries(JINGLES)) expect(f.bytes, id).toBeLessThanOrEqual(BUDGET.jingle);
    for (const [id, f] of entries(SFX_FILES)) expect(f.bytes, id).toBeLessThanOrEqual(BUDGET.sfx);
    expect(all.reduce((s, [, f]) => s + f.bytes, 0)).toBeLessThanOrEqual(BUDGET.total);
  });

  it('loops each track over exactly its score length', () => {
    for (const [id, f] of Object.entries(MUSIC)) {
      const seconds = compilePiece(TRACK_PIECES[id as keyof typeof TRACK_PIECES]).seconds;
      expect(Math.abs(f.loopEnd - f.loopStart - seconds), id).toBeLessThanOrEqual(0.05);
    }
  });

  it('ships no audio file that the manifest does not list', () => {
    const listed = new Set(all.map(([, f]) => f.file));
    const shipped = files(PUBLIC)
      .filter((p) => p.endsWith('.m4a'))
      .map((p) => relative(PUBLIC, p));
    expect(shipped.filter((f) => !listed.has(f))).toEqual([]);
  });

  it('never imports the studio into the game', () => {
    const src = join(WEB, 'src');
    const offenders = files(src)
      .filter((p) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) && !p.includes('/studio/'))
      .filter((p) => /from\s+['"][./]*(?:\.\.\/)*studio\//.test(readFileSync(p, 'utf8')))
      .map((p) => relative(src, p));
    expect(offenders).toEqual([]);
  });
});
