// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JINGLES, MUSIC, SFX_FILES } from './manifest';

const REPO = join(__dirname, '../../../..');
const DOC = readFileSync(join(REPO, 'docs/audio/SOUNDTRACK.md'), 'utf8');
const ASSETS = '../../apps/web/public/assets/';

/** Every audio file the guide links to, relative to public/assets. */
const linked = [...DOC.matchAll(/\]\(\.\.\/\.\.\/apps\/web\/public\/assets\/([^)]+\.m4a)\)/g)].map(
  (m) => m[1],
);

describe('docs/audio/SOUNDTRACK.md', () => {
  it('links every shipped track, jingle and sound effect exactly once', () => {
    const shipped = [
      ...Object.values(MUSIC),
      ...Object.values(JINGLES),
      ...Object.values(SFX_FILES),
    ].map((f) => f.file);
    for (const file of shipped)
      expect(
        linked.filter((l) => l === file),
        file,
      ).toHaveLength(1);
  });

  it('links no file that is not shipped', () => {
    const shipped = new Set(
      [...Object.values(MUSIC), ...Object.values(JINGLES), ...Object.values(SFX_FILES)].map(
        (f) => f.file,
      ),
    );
    expect(linked.filter((l) => l !== undefined && !shipped.has(l))).toEqual([]);
  });

  it('links files by their path from the guide', () => {
    expect(DOC).toContain(`](${ASSETS}music/title.m4a)`);
  });
});
