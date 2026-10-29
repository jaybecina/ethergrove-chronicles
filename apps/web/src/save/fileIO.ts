import { migrate, type MigrateResult, type SaveFile } from '@ethergrove/core';

export function exportSave(file: SaveFile): Blob {
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export function exportFileName(file: SaveFile): string {
  const farm = file.summary.farmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const { year, season, day } = file.summary.calendar;
  return `ethergrove-${farm || 'farm'}-y${year}-${season}${day}.ethergrove.json`;
}

export function importSave(text: string): MigrateResult {
  try {
    return migrate(JSON.parse(text));
  } catch {
    return { ok: false, error: 'invalid' };
  }
}

/** Browser download of a save file. */
export function downloadSave(file: SaveFile): void {
  const url = URL.createObjectURL(exportSave(file));
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(file);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
