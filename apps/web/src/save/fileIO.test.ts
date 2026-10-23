import { createNewGame, makeSaveFile } from '@hearthvale/core';
import { describe, expect, it } from 'vitest';
import { exportFileName, exportSave, importSave } from './fileIO';

const file = makeSaveFile(
  createNewGame({ seed: 3, farmName: 'Elm Hollow!', playerName: 'Ari' }),
  5,
  new Date(0),
);

describe('save file export/import', () => {
  it('round-trips through a Blob', async () => {
    const text = await exportSave(file).text();
    expect(importSave(text)).toEqual({ ok: true, file });
  });

  it('names the file after the farm and date', () => {
    expect(exportFileName(file)).toBe('hearthvale-elm-hollow-y1-spring1.hearthvale.json');
  });

  it('rejects bad files', () => {
    expect(importSave('{}')).toEqual({ ok: false, error: 'invalid' });
    expect(importSave('not json')).toEqual({ ok: false, error: 'invalid' });
  });
});
