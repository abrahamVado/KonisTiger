
# Yamato Static Runner — with Local Auth Backend

A production-ready Electron scaffolding that:
- clones **Yamato**, installs deps, builds & exports **Next.js** statically
- serves it from **app://yamato/** (no local server)
- exposes a **local auth backend** via preload IPC (register/login/verify/reset) using **better-sqlite3**

## Quick Start
```bash
pnpm i
pnpm start
```
1) Pick a base folder → **Clone** → **pnpm i**  
2) Click **Build + Export + Load**  
3) Use your Yamato UI; for testing you can also try the small **Auth demo** on the left

## Next.js config (Yamato)
Use this minimal switch to enable export in Electron:
```js
// next.config.js
const isStatic = process.env.ELECTRON_STATIC === '1'
const nextConfig = {
  ...(isStatic ? { output: 'export', trailingSlash: true } : {}),
  images: { unoptimized: !!isStatic },
  assetPrefix: isStatic ? 'app://yamato' : undefined,
}
module.exports = nextConfig
```

## Prebuild-friendly setup
- Electron pinned: `"electron": "30.0.0"`
- `postinstall`: `electron-builder install-app-deps` to fetch **prebuilt** native binaries
- `"asarUnpack": ["**/*.node"]`, `"npmRebuild": false`, `"nodeGypRebuild": false`

Run `scripts/check-native.sh` to list native `.node` files.

## Auth API (window.auth)
```ts
register(email, password) -> { ok, userId, email, verificationCode? }
login(email, password)    -> { ok, token, user }
startVerify(userId)       -> { ok, code }
confirmVerify(userId, code) -> { ok }
startReset(email)         -> { ok, userId?, code? }
confirmReset(userId, code, newPassword) -> { ok }
```
> For now, codes are returned by the API (no SMTP). Wire to your UI or email service later.

## Security
- Renderer sandboxed; no Node in DOM. All privileged ops go through **preload** allowlist.
- CSP only allows `self` and `app:`.
- DB path: Electron `userData` → `yamato-auth.db`.

## CI (optional)
A basic GitHub Actions matrix is included (`.github/workflows/build.yml`) to build on Windows/macOS/Linux.
