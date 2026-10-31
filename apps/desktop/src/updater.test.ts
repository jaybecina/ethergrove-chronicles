import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { releasePageUrl, type UpdateMode } from './policy.js';
import { startUpdates, type AskOptions, type UpdateDeps } from './updater.js';

type Fn = (arg: never) => void;

function fakeUpdater(check: () => Promise<unknown> = () => Promise.resolve(null)) {
  const listeners = new Map<string, Fn[]>();
  return {
    autoDownload: undefined as boolean | undefined,
    autoInstallOnAppQuit: undefined as boolean | undefined,
    checks: 0,
    on(event: string, fn: Fn) {
      listeners.set(event, [...(listeners.get(event) ?? []), fn]);
      return this;
    },
    checkForUpdates() {
      this.checks += 1;
      return check();
    },
    emit(event: string, payload: unknown) {
      for (const fn of listeners.get(event) ?? []) (fn as (p: unknown) => void)(payload);
    },
    has: (event: string) => listeners.has(event),
  };
}

function setup(mode: UpdateMode, answer = 0, check?: () => Promise<unknown>) {
  const updater = fakeUpdater(check);
  const notify = vi.fn();
  const ask = vi.fn((_options: AskOptions) => Promise.resolve(answer));
  const openExternal = vi.fn((_url: string) => Promise.resolve());
  const log = vi.fn();
  const deps: UpdateDeps = {
    mode,
    currentVersion: '0.2.0',
    updater: updater as unknown as UpdateDeps['updater'],
    notify,
    ask,
    openExternal,
    log,
  };
  startUpdates(deps);
  return { updater, notify, ask, openExternal, log };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('startUpdates (auto-update spec §5.2)', () => {
  it('off never checks', () => {
    const { updater } = setup('off');
    expect(updater.checks).toBe(0);
    expect(updater.has('update-available')).toBe(false);
    expect(updater.has('error')).toBe(false);
  });

  it('install downloads quietly and says it installs on close, once', () => {
    const { updater, notify, ask, openExternal } = setup('install');
    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
    expect(updater.checks).toBe(1);
    updater.emit('update-downloaded', { version: '0.2.1' });
    updater.emit('update-downloaded', { version: '0.2.1' });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      'Update ready',
      'Ethergrove Chronicles 0.2.1 installs when you close the game.',
    );
    expect(ask).not.toHaveBeenCalled();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('notify asks once and opens the release page on Download', async () => {
    const { updater, ask, openExternal } = setup('notify', 0);
    expect(updater.autoDownload).toBe(false);
    expect(updater.autoInstallOnAppQuit).toBe(false);
    updater.emit('update-available', { version: '0.2.1' });
    updater.emit('update-available', { version: '0.2.1' });
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledWith({
      type: 'info',
      title: 'Update available',
      message: 'Ethergrove Chronicles 0.2.1 is available.',
      detail:
        'You have 0.2.0. Download the new version and drag it into Applications. Your saves and settings stay.',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    await flush();
    expect(openExternal).toHaveBeenCalledWith(releasePageUrl('0.2.1'));
  });

  it('Later opens nothing', async () => {
    const { updater, openExternal } = setup('notify', 1);
    updater.emit('update-available', { version: '0.2.1' });
    await flush();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('errors are logged, never shown', async () => {
    const { updater, notify, ask, log } = setup('install', 0, () =>
      Promise.reject(new Error('dns')),
    );
    updater.emit('error', new Error('offline'));
    await flush();
    expect(log).toHaveBeenCalledWith('Update check failed: offline');
    expect(log).toHaveBeenCalledWith('Update check failed: dns');
    expect(notify).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  });

  it('no desktop source restarts the game to install an update', () => {
    const dir = path.resolve(import.meta.dirname);
    const sources = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    expect(sources.length).toBeGreaterThan(0);
    for (const f of sources)
      expect(readFileSync(path.join(dir, f), 'utf8'), f).not.toContain('quitAndInstall');
  });
});
