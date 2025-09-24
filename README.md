# KonisTiger

> The Electron “hub” that discovers, loads, and hosts modules as plugins. Next.js (App Router) renderer, strict Electron security, and a fast SQLite core.

[![CI](https://img.shields.io/badge/CI-pnpm%20build/dev-informational)](#)
[![Electron](https://img.shields.io/badge/Electron-ready-blue)](#)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

KonisTiger is an Electron + Next.js monorepo focused on **modular apps**: the shell auto-discovers plugins, exposes safe IPC surfaces, and ships with a local **SQLite** database (via `better-sqlite3`), **USB serial**, printing, notifications, auto-launch, Playwright e2e, and Electron Builder packaging. Security defaults include **`contextIsolation`**, **`sandbox`**, **`nodeIntegration: false`**, CSP, blocked navigation, and a custom offline **`app://`** protocol for production bundles.

---

## ✨ Features

- **Plugin Hub** – Discovers and hosts feature modules as plugins with a clean contract.
- **Modern Renderer** – Next.js (App Router) UI; hot reload in dev.
- **Local Data** – SQLite store (`better-sqlite3`) + file-based migrations applied at first run.
- **Device I/O** – USB serial support; printing & notifications.
- **DX & QA** – pnpm workspace, strict TS config, Playwright e2e.
- **Distribution** – Electron Builder for platform installers; GitHub Releases flow.

---

## 🧭 Repository Layout

```
/assets            # static assets (icons, images)
/migrations        # SQL migrations run at startup
/packages          # shared packages/plugins (workspace)
/playwright        # e2e tests
/src               # electron main, preload, renderer bootstrap
pnpm-workspace.yaml
package.json
```

> DB path: `${userData}/konistiger.db`. Migrations are applied on first launch.

---

## 🚀 Quick Start

```bash
pnpm i
pnpm dev
```

- Renderer dev server: http://localhost:3000  
- Electron launches after the renderer is ready.

---

## 🏗️ Build & Distribute

```bash
pnpm build        # production build
pnpm dist:win     # Windows .exe
pnpm release:win  # publish to GitHub Releases (requires GH_TOKEN or Actions GITHUB_TOKEN)
```

Production serves the renderer via a custom `app://` protocol—no remote URLs.

---

## 🔌 Plugin Model (overview)

> How a module plugs into the hub.

**1) Manifest**

```json
// packages/my-plugin/konistiger.plugin.json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "0.1.0",
  "entry": "dist/main.js",
  "renderer": "dist/ui/index.js",
  "permissions": ["serial", "db"]
}
```

**2) Main registration (example)**

```ts
// packages/my-plugin/src/main.ts
import { register } from "@konistiger/sdk";

export default register("my-plugin", ({ ipc, db, logger }) => {
  ipc.handle("my-plugin:doThing", async (_, payload) => {
    const row = db.prepare("select 42 as answer").get();
    logger.info("Did thing", { payload, row });
    return { ok: true, answer: row.answer };
  });
});
```

**3) Renderer usage**

```ts
// in a client component
const res = await window.api.invoke("my-plugin:doThing", { foo: "bar" });
```

> Tip: keep plugin APIs **namespaced** (`my-plugin:*`) and only expose what you need.

---

## 🔐 Security Defaults

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- **Preload-only** IPC via a minimal, vetted API surface (no `remote` module)
- CSP + blocked `new-window`/navigation; production UI served from `app://*`
- Explicit IPC allow-lists per plugin; no wildcard channels

---

## 🗃️ Database & Migrations

- DB file lives in the OS-specific Electron `userData` directory: `${userData}/konistiger.db`.
- Place SQL migrations in `/migrations`; they’re applied on first run and tracked.

---

## 🧰 Scripts (common)

| Command          | What it does                            |
|------------------|-----------------------------------------|
| `pnpm dev`       | Starts Next.js dev server + Electron    |
| `pnpm build`     | Builds production artifacts              |
| `pnpm dist:win`  | Creates Windows installer via Builder    |
| `pnpm release:win` | Publishes build to GitHub Releases     |

---

## 🧪 Testing

- **Playwright** e2e tests live under `/playwright`.
- Prefer black-box tests through the public UI or IPC surfaces.

---

## 🛠️ Development Notes

- **Workspace:** `pnpm-workspace.yaml` defines packages in `/packages`.
- **TypeScript:** strict base config in `tsconfig.base.json`.
- **Linting & Hooks:** see `lint-staged.config.mjs`.

---

## 🗺️ Roadmap (suggested)

- [ ] Cross-platform builds (macOS `.dmg`, Linux `.AppImage`).
- [ ] Auto-update channel with release notes.
- [ ] First-party Plugin SDK (`@konistiger/sdk`) + examples.
- [ ] Built-in plugin gallery/registry view.
- [ ] Secure capability prompts (serial, printing) per plugin.
- [ ] Diagnostics page (DB viewer, logs, env).

---

## 🤝 Contributing

1. Fork & branch: `feat/my-thing`
2. `pnpm i && pnpm dev`
3. Add tests where it makes sense
4. Open a PR with clear before/after notes

---

## 📄 License

MIT — see `LICENSE`.