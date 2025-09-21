    import { contextBridge, ipcRenderer } from 'electron';
    import { z } from 'zod';
    import { Channels, LocaleSchema, ThemeSchema, NotificationSchema } from '@konistiger/shared';

    // Helpers
    const invoke = (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args);

    const appApi = {
      getVersion: () => invoke(Channels.APP_GET_VERSION),
      getPaths: () => invoke(Channels.APP_GET_PATHS),
      checkUpdates: () => invoke(Channels.APP_CHECK_UPDATES),
      installUpdate: () => invoke(Channels.APP_INSTALL_UPDATE),
      setAutoLaunch: (enabled: boolean) => invoke(Channels.APP_SET_AUTOLAUNCH, !!enabled),
      showNotification: (payload: unknown) => {
        NotificationSchema.parse(payload);
        return invoke(Channels.APP_NOTIFY, payload);
      },
    };

    const dbApi = {
      runMigrations: () => invoke(Channels.DB_RUN_MIGRATIONS),
      seed: () => invoke(Channels.DB_SEED),
      exec: (name: string, args: any) => invoke(Channels.DB_EXEC, name, args),
    };

    const serialApi = {
      listPorts: () => invoke(Channels.SERIAL_LIST),
      open: (opts: any) => invoke(Channels.SERIAL_OPEN, opts),
      write: (handleId: string, data: string | Uint8Array) => invoke(Channels.SERIAL_WRITE, handleId, data),
      read: (handleId: string) => invoke(Channels.SERIAL_READ, handleId),
      close: (handleId: string) => invoke(Channels.SERIAL_CLOSE, handleId),
      onData: (cb: (d: Uint8Array) => void) => ipcRenderer.on('serial:data', (_e, d) => cb(d)),
    };

    const printApi = {
      getPrinters: () => invoke(Channels.PRINT_GET_PRINTERS),
      printCurrent: (opts?: any) => invoke(Channels.PRINT_PRINT, opts),
      printToPDF: (opts?: any) => invoke(Channels.PRINT_PDF, opts),
    };

    const settingsApi = {
      getTheme: () => invoke(Channels.SETTINGS_GET_THEME),
      setTheme: (t: unknown) => invoke(Channels.SETTINGS_SET_THEME, ThemeSchema.parse(t)),
      getLocale: () => invoke(Channels.SETTINGS_GET_LOCALE),
      setLocale: (l: unknown) => invoke(Channels.SETTINGS_SET_LOCALE, LocaleSchema.parse(l)),
    };

    contextBridge.exposeInMainWorld('api', {
      app: appApi,
      db: dbApi,
      serial: serialApi,
      print: printApi,
      settings: settingsApi,
    });

    export type PreloadAPI = typeof window & {
      api: {
        app: typeof appApi;
        db: typeof dbApi;
        serial: typeof serialApi;
        print: typeof printApi;
        settings: typeof settingsApi;
      };
    };
    