    import { z } from 'zod';

    // App schemas for validating IPC payloads
    export const LocaleSchema = z.enum(['en','es','ja','zh','pt','de']);
    export const ThemeSchema = z.enum(['light','dark','system']);

    export const NotificationSchema = z.object({
      title: z.string(),
      body: z.string().optional(),
      silent: z.boolean().optional(),
    });

    export type Locale = z.infer<typeof LocaleSchema>;
    export type Theme = z.infer<typeof ThemeSchema>;

    // IPC channel names
    export const Channels = {
      APP_GET_VERSION: 'app:getVersion',
      APP_GET_PATHS: 'app:getPaths',
      APP_CHECK_UPDATES: 'app:checkUpdates',
      APP_INSTALL_UPDATE: 'app:installUpdate',
      APP_SET_AUTOLAUNCH: 'app:setAutoLaunch',
      APP_NOTIFY: 'app:notify',

      DB_RUN_MIGRATIONS: 'db:runMigrations',
      DB_SEED: 'db:seed',
      DB_EXEC: 'db:exec',

      SERIAL_LIST: 'serial:list',
      SERIAL_OPEN: 'serial:open',
      SERIAL_WRITE: 'serial:write',
      SERIAL_READ: 'serial:read',
      SERIAL_CLOSE: 'serial:close',

      PRINT_GET_PRINTERS: 'print:getPrinters',
      PRINT_PRINT: 'print:print',
      PRINT_PDF: 'print:pdf',

      SETTINGS_GET_THEME: 'settings:getTheme',
      SETTINGS_SET_THEME: 'settings:setTheme',
      SETTINGS_GET_LOCALE: 'settings:getLocale',
      SETTINGS_SET_LOCALE: 'settings:setLocale',
    } as const;

    export type Unpacked<T> = T extends Promise<infer U> ? U : T;
    