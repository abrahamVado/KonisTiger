    # KonisTiger

    Electron + Next.js (App Router) + TypeScript monorepo with secure IPC, SQLite (`better-sqlite3`),
    USB serial, printing, auto-launch, notifications, Playwright e2e, and Electron Builder packaging.

    ## Quick start

    ```bash
    pnpm i
    pnpm dev
    ```

    - Renderer: Next.js dev server on http://localhost:3000
    - Electron launches after the renderer is ready.

    ## Build and package (Windows .exe)

    ```bash
    pnpm build
    pnpm dist:win
    ```

    To publish to GitHub Releases (set `publish: always` token), set `GH_TOKEN` or rely on Actions' `GITHUB_TOKEN`:

    ```bash
    pnpm release:win
    ```

    ## Notes
    - Production bundles serve the renderer via a custom `app://` protocol with **no remote URLs**.
    - Strict Electron security: `contextIsolation`, `sandbox`, `nodeIntegration: false`, CSP, navigation blocked.
    - DB at `${userData}/konistiger.db`. Migrations in `/migrations` are applied on first run.
    