import { createNewGame, makeSaveFile } from '@ethergrove/core';
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
    expect(exportFileName(file)).toBe('ethergrove-elm-hollow-y1-spring1.ethergrove.json');
  });

  it('imports a file exported by Hearthvale', async () => {
    // Import reads the contents only, so old .hearthvale.json files still load.
    const oldFile = new File(
      [exportSave(file)],
      'hearthvale-elm-hollow-y1-spring1.hearthvale.json',
    );
    expect(importSave(await oldFile.text())).toEqual({ ok: true, file });
  });

  it('rejects bad files', () => {
    expect(importSave('{}')).toEqual({ ok: false, error: 'invalid' });
    expect(importSave('not json')).toEqual({ ok: false, error: 'invalid' });
  });
});
