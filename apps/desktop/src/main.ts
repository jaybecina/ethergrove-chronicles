// Electron main process (desktop spec §3.3). The rules live in policy.ts; this file only wires them up.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BrowserWindow, Menu, Notification, app, dialog, protocol, session, shell } from 'electron';
import electronUpdater from 'electron-updater';
import {
  APP_SCHEME,
  START_URL,
  allowPermission,
  isAppUrl,
  menuTemplate,
  readMacSigned,
  resolveAppPath,
  responseHeaders,
  updateMode,
} from './policy.js';
import { startUpdates } from './updater.js';

// A standard, secure scheme gives the game a stable origin, so IndexedDB saves and settings persist.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      codeCache: true,
    },
  },
]);

// Test seam: the smoke test points unpackaged runs at a throwaway profile, never at real saves.
const testUserData = process.env.ETHERGROVE_USER_DATA;
if (!app.isPackaged && testUserData) app.setPath('userData', testUserData);

// Windows needs the app's id to show the "Update ready" notification under the right name.
if (process.platform === 'win32') app.setAppUserModelId('io.github.jaybecina.ethergrove');

let mainWindow: BrowserWindow | null = null;
let updatesStarted = false;

/** The packaged package.json, where electron-builder records whether this Mac build is Developer ID signed. */
async function macSigned(): Promise<boolean> {
  try {
    const raw = await readFile(path.join(app.getAppPath(), 'package.json'), 'utf8');
    return readMacSigned(JSON.parse(raw));
  } catch {
    return false;
  }
}

/** Checks GitHub Releases once per launch (auto-update spec §5.3). Never restarts the game to install. */
async function beginUpdates(): Promise<void> {
  if (updatesStarted) return;
  updatesStarted = true;
  const { autoUpdater } = electronUpdater;
  autoUpdater.logger = null;
  startUpdates({
    mode: updateMode({
      platform: process.platform,
      packaged: app.isPackaged,
      macSigned: await macSigned(),
      disabled: process.env.ETHERGROVE_NO_UPDATE === '1',
    }),
    currentVersion: app.getVersion(),
    updater: autoUpdater,
    notify: (title, body) => {
      if (Notification.isSupported()) new Notification({ title, body }).show();
    },
    ask: async (options) => {
      const box = mainWindow
        ? await dialog.showMessageBox(mainWindow, options)
        : await dialog.showMessageBox(options);
      return box.response;
    },
    openExternal: (url) => shell.openExternal(url),
    log: (message) => {
      console.warn(message);
    },
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Ethergrove Chronicles',
    backgroundColor: '#1d2a1f',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });
  win.once('ready-to-show', () => {
    win.show();
    // Let the game's first load finish before the network request.
    setTimeout(() => {
      void beginUpdates();
    }, 10_000);
  });
  win.on('closed', () => {
    mainWindow = null;
  });
  void win.loadURL(START_URL);
  mainWindow = win;
}

function harden(): void {
  const webRoot = path.join(app.getAppPath(), 'web');
  protocol.handle(APP_SCHEME, async (request) => {
    const file = resolveAppPath(request.url, webRoot);
    if (file === null) return new Response('Not found', { status: 404 });
    try {
      return new Response(await readFile(file), { headers: responseHeaders(file) });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(allowPermission(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_contents, permission) =>
    allowPermission(permission),
  );
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event) => {
    if (!isAppUrl(event.url)) event.preventDefault();
  });
  contents.on('will-redirect', (event) => {
    if (!isAppUrl(event.url)) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  // A game, not a document app: closing the window quits on every OS.
  app.on('window-all-closed', () => {
    app.quit();
  });
  void app.whenReady().then(() => {
    harden();
    Menu.setApplicationMenu(
      Menu.buildFromTemplate(menuTemplate(process.platform, !app.isPackaged)),
    );
    createWindow();
  });
}
