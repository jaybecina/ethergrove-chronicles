// Update flow (auto-update spec §5.2). The updater, dialogs and shell are injected, so Vitest covers every mode
// and main.ts only wires them to electron-updater and Electron. Nothing here ever restarts the game to install:
// an update installs when the player quits, so no save is lost mid-play.
import { releasePageUrl, type UpdateMode } from './policy.js';

export interface AskOptions {
  type: 'info';
  title: string;
  message: string;
  detail: string;
  buttons: string[];
  defaultId: number;
  cancelId: number;
}

export interface UpdateDeps {
  mode: UpdateMode;
  currentVersion: string;
  updater: {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    on(
      event: 'update-available' | 'update-downloaded',
      fn: (info: { version: string }) => void,
    ): unknown;
    on(event: 'error', fn: (err: Error) => void): unknown;
    checkForUpdates(): Promise<unknown>;
  };
  notify(title: string, body: string): void;
  /** Resolves with the index of the clicked button. */
  ask(options: AskOptions): Promise<number>;
  openExternal(url: string): Promise<void>;
  log(message: string): void;
}

export function startUpdates(deps: UpdateDeps): void {
  const { mode, updater } = deps;
  if (mode === 'off') return;
  const failed = (err: unknown) => {
    deps.log(`Update check failed: ${err instanceof Error ? err.message : String(err)}`);
  };
  const install = mode === 'install';
  updater.autoDownload = install;
  updater.autoInstallOnAppQuit = install;
  updater.on('error', failed);

  let told = false;
  if (install) {
    updater.on('update-downloaded', ({ version }) => {
      if (told) return;
      told = true;
      deps.notify(
        'Update ready',
        `Ethergrove Chronicles ${version} installs when you close the game.`,
      );
    });
  } else {
    updater.on('update-available', ({ version }) => {
      if (told) return;
      told = true;
      deps
        .ask({
          type: 'info',
          title: 'Update available',
          message: `Ethergrove Chronicles ${version} is available.`,
          detail: `You have ${deps.currentVersion}. Download the new version and drag it into Applications. Your saves and settings stay.`,
          buttons: ['Download', 'Later'],
          defaultId: 0,
          cancelId: 1,
        })
        .then((button) => (button === 0 ? deps.openExternal(releasePageUrl(version)) : undefined))
        .catch(failed);
    });
  }
  updater.checkForUpdates().catch(failed);
}
