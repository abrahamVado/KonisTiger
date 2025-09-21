    import { app, BrowserWindow, protocol, ipcMain, Menu, Tray, nativeImage, shell, Notification } from 'electron';
    import path from 'node:path';
    import fs from 'node:fs';
    import log from 'electron-log';
    import { autoUpdater } from 'electron-updater';
    import { Channels } from '@konistiger/shared';
    import os from 'node:os';

    const isDev = !app.isPackaged;
    const RESOURCES = isDev ? path.resolve(__dirname, '../../../') : process.resourcesPath;
    const RENDERER_DIR = isDev ? path.resolve(RESOURCES, 'packages/renderer/out') : path.join(RESOURCES, 'renderer');
    const MIGRATIONS_DIR = isDev ? path.resolve(RESOURCES, 'migrations') : path.join(RESOURCES, 'migrations');
    const PRELOAD_PATH = isDev
      ? path.resolve(__dirname, '../../preload/dist/index.js')
      : path.resolve(__dirname, '../preload.js'); // electron-builder may re-map, verify during packaging

    let tray: Tray | null = null;
    let mainWindow: BrowserWindow | null = null;
    let printWindow: BrowserWindow | null = null;
    let settingsWindow: BrowserWindow | null = null;

    protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

    const createWindow = (name: 'main' | 'print' | 'settings', htmlEntry: string) => {
      const win = new BrowserWindow({
        width: name === 'print' ? 900 : 1200,
        height: name === 'print' ? 700 : 800,
        show: true,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          preload: PRELOAD_PATH,
        },
      });

      if (isDev) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL! + htmlEntry);
      } else {
        win.loadURL(`app://renderer/${htmlEntry}`);
      }

      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' })); // block new-window
      win.webContents.on('will-navigate', (e) => e.preventDefault()); // block navigation
      return win;
    };

    app.on('ready', async () => {
      // Register 'app://' file protocol pointing to exported Next assets
      protocol.registerFileProtocol('app', (request, callback) => {
        try {
          const url = new URL(request.url);
          const p = url.pathname.startsWith('/renderer')
            ? url.pathname.replace('/renderer', '')
            : url.pathname;
          let filepath = path.normalize(path.join(RENDERER_DIR, p));
          if (filepath.endsWith('/')) filepath += 'index.html';
          callback({ path: filepath });
        } catch (err) {
          log.error('Protocol error', err);
        }
      });

      // Tray
      const trayIcon = nativeImage.createEmpty(); // placeholder; replace with assets
      tray = new Tray(trayIcon);
      const menu = Menu.buildFromTemplate([
        { label: 'Show', click: () => { if (!mainWindow) mainWindow = createWindow('main', 'index.html'); else mainWindow.show(); } },
        { label: 'Settings', click: () => { settingsWindow = createWindow('settings', 'settings/index.html'); } },
        { type: 'separator' },
        { label: 'Check for updates', click: () => autoUpdater.checkForUpdates() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
      ]);
      tray.setToolTip('KonisTiger');
      tray.setContextMenu(menu);

      mainWindow = createWindow('main', 'index.html');
      registerIpc();
      setupAutoLaunch(true);
      autoUpdater.autoDownload = true;
      autoUpdater.logger = log;
    });

    app.on('window-all-closed', () => {
      // Keep running in tray
    });

    function registerIpc() {
      ipcMain.handle(Channels.APP_GET_VERSION, () => app.getVersion());
      ipcMain.handle(Channels.APP_GET_PATHS, () => ({
        userData: app.getPath('userData'),
        appData: app.getPath('appData'),
        temp: app.getPath('temp'),
      }));
      ipcMain.handle(Channels.APP_CHECK_UPDATES, async () => {
        const result = await autoUpdater.checkForUpdates();
        const updateInfo = result?.updateInfo;
        return updateInfo && updateInfo.version !== app.getVersion()
          ? { available: true, version: updateInfo.version, notes: updateInfo.releaseNotes as any }
          : { available: false };
      });
      ipcMain.handle(Channels.APP_INSTALL_UPDATE, async () => {
        autoUpdater.quitAndInstall();
        return { restarting: true };
      });
      ipcMain.handle(Channels.APP_SET_AUTOLAUNCH, async (_e, enabled: boolean) => {
        setupAutoLaunch(enabled);
        return { enabled };
      });
      ipcMain.handle(Channels.APP_NOTIFY, (_e, payload: { title: string; body?: string; silent?: boolean }) => {
        new Notification({ title: payload.title, body: payload.body ?? '', silent: payload.silent ?? false }).show();
      });

      // DB
      const { ensureDb, runMigrations, seed, exec } = require('./modules/db.js');
      ipcMain.handle(Channels.DB_RUN_MIGRATIONS, async () => {
        const db = ensureDb();
        const applied = runMigrations(db, MIGRATIONS_DIR);
        return { applied };
      });
      ipcMain.handle(Channels.DB_SEED, async () => {
        const db = require('./modules/db.js').ensureDb();
        const inserted = seed(db, MIGRATIONS_DIR);
        return { inserted };
      });
      ipcMain.handle(Channels.DB_EXEC, async (_e, name: string, args: any) => {
        const db = require('./modules/db.js').ensureDb();
        return exec(db, name, args);
      });

      // Serial (stubs)
      const serial = require('./modules/serial.js');
      ipcMain.handle(Channels.SERIAL_LIST, () => serial.list());
      ipcMain.handle(Channels.SERIAL_OPEN, (_e, opts) => serial.open(opts));
      ipcMain.handle(Channels.SERIAL_WRITE, (_e, id, data) => serial.write(id, data));
      ipcMain.handle(Channels.SERIAL_READ, (_e, id) => serial.read(id));
      ipcMain.handle(Channels.SERIAL_CLOSE, (_e, id) => serial.close(id));

      // Print
      ipcMain.handle(Channels.PRINT_GET_PRINTERS, (e) => e.sender.getPrinters());
      ipcMain.handle(Channels.PRINT_PRINT, (e, opts) => e.sender.print(opts || {}));
      ipcMain.handle(Channels.PRINT_PDF, async (e, opts) => {
        const pdf = await e.sender.printToPDF(opts || {});
        const file = path.join(app.getPath('downloads'), `konistiger-${Date.now()}.pdf`);
        fs.writeFileSync(file, pdf);
        return { filePath: file };
      });

      // Settings (backed by DB)
      ipcMain.handle(Channels.SETTINGS_GET_THEME, () => require('./modules/db.js').getSetting('theme'));
      ipcMain.handle(Channels.SETTINGS_SET_THEME, (_e, t) => require('./modules/db.js').setSetting('theme', t));
      ipcMain.handle(Channels.SETTINGS_GET_LOCALE, () => require('./modules/db.js').getSetting('locale'));
      ipcMain.handle(Channels.SETTINGS_SET_LOCALE, (_e, l) => require('./modules/db.js').setSetting('locale', l));
    }

    function setupAutoLaunch(enabled: boolean) {
      const platform = process.platform;
      if (platform === 'darwin' || platform === 'win32') {
        app.setLoginItemSettings({ openAtLogin: enabled });
      } else {
        // Linux: create/remove a .desktop autostart entry
        const dir = path.join(os.homedir(), '.config', 'autostart');
        fs.mkdirSync(dir, { recursive: true });
        const desktopPath = path.join(dir, 'konistiger.desktop');
        if (enabled) {
          const bin = process.execPath;
          const content = [
            '[Desktop Entry]',
            'Type=Application',
            'Name=KonisTiger',
            `Exec="${bin}"`,
            'X-GNOME-Autostart-enabled=true',
          ].join('\n');
          fs.writeFileSync(desktopPath, content);
        } else if (fs.existsSync(desktopPath)) {
          fs.unlinkSync(desktopPath);
        }
      }
    }
    