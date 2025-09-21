    import { app } from 'electron';
    import { spawn } from 'node:child_process';
    import waitOn from 'wait-on';
    import path from 'node:path';
    import { fileURLToPath } from 'node:url';

    // Start Electron after Next.js dev server is ready
    (async () => {
      const url = 'http://localhost:3000';
      await waitOn({ resources: [url] });
      const electronPath = require('electron');
      const mainPath = path.resolve(__dirname, 'main.js'); // tsx transpiles to memory but path remains
      const cp = spawn(electronPath, ['-r', 'tsx/register', path.resolve(__dirname, '../src/main.ts')], {
        stdio: 'inherit',
        env: { ...process.env, VITE_DEV_SERVER_URL: url, NODE_ENV: 'development' },
      });
      cp.on('exit', (code) => process.exit(code ?? 0));
    })();
    