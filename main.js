
// main.js (static + local auth backend)
import { app, BrowserWindow, ipcMain, dialog, protocol } from "electron";
import path from "node:path";
import { spawn } from "node:child_process";
import Store from "electron-store";
import simpleGit from "simple-git";
import fs from "node:fs";

// ---- Auth backend imports ----
import {
  register as authRegister,
  login as authLogin,
  startEmailVerification as authStartVerify,
  confirmEmailVerification as authConfirmVerify,
  startPasswordReset as authStartReset,
  confirmPasswordReset as authConfirmReset
} from "./src/backend/auth.js";

const DEFAULT_REPO = "https://github.com/abrahamVado/Yamato.git";
const store = new Store({
  schema: {
    repoUrl: { type: "string", default: DEFAULT_REPO },
    baseDir: { type: "string", default: "" },
    buildScript: { type: "string", default: "pnpm build" },
    exportScript: { type: "string", default: "pnpm export" },
    exportSubdir: { type: "string", default: "out" }
  }
});

let win;

function registerAppProtocol(exportRoot) {
  protocol.registerFileProtocol("app", (request, callback) => {
    // URL: app://yamato/<path>
    const url = request.url.replace(/^app:\/\//, ""); // yamato/...
    const parts = url.split("/");
    const relParts = parts.slice(1); // drop 'yamato'
    let rel = relParts.join("/").replace(/\.\./g, "");

    // direct file (scripts/css/assets)
    const direct = path.join(exportRoot, rel);
    if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
      return callback({ path: direct });
    }

    // route folder index.html
    const indexHtml = path.join(exportRoot, rel, "index.html");
    if (fs.existsSync(indexHtml)) return callback({ path: indexHtml });

    // SPA fallback
    return callback({ path: path.join(exportRoot, "index.html") });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1120,
    height: 780,
    webPreferences: {
      preload: path.join(process.cwd(), "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.removeMenu();
  win.loadFile(path.join(process.cwd(), "renderer/index.html"));
}

app.whenReady().then(() => {
  protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { secure: true, standard: true, supportFetchAPI: true } }
  ]);
  createWindow();
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// ----- helpers -----
function guessedRepoPath() {
  const base = store.get("baseDir");
  const url = store.get("repoUrl") || DEFAULT_REPO;
  if (!base) return "";
  const name = url.replace(/\.git$/,"").split("/").pop();
  return path.join(base, name);
}

function run(cmd, args, cwd, onData) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: true, env: { ...process.env, ELECTRON_STATIC: "1" } });
    child.stdout.on("data", d => onData?.(d.toString()));
    child.stderr.on("data", d => onData?.(d.toString()));
    child.on("close", code => code === 0 ? resolve(0) : reject(new Error(`${cmd} ${args.join(" ")} -> ${code}`)));
  });
}

function log(s) {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) w.webContents.send("log", s);
}

// ----- IPC: repo ops & export -----
ipcMain.handle("cfg:get", async () => ({
  repoUrl: store.get("repoUrl"),
  baseDir: store.get("baseDir"),
  buildScript: store.get("buildScript"),
  exportScript: store.get("exportScript"),
  exportSubdir: store.get("exportSubdir"),
}));
ipcMain.handle("cfg:update", async (_e, patch) => { Object.entries(patch||{}).forEach(([k,v]) => store.set(k,v)); return true; });

ipcMain.handle("pickBase", async () => {
  const res = await dialog.showOpenDialog({ properties: ["openDirectory","createDirectory"] });
  if (res.canceled || !res.filePaths[0]) return null;
  store.set("baseDir", res.filePaths[0]);
  return res.filePaths[0];
});

ipcMain.handle("cloneRepo", async (_e, { repoUrl, baseDir }) => {
  repoUrl = repoUrl || store.get("repoUrl");
  baseDir  = baseDir  || store.get("baseDir");
  if (!repoUrl || !baseDir) throw new Error("Need repoUrl and baseDir");
  const dest = guessedRepoPath();
  const git = simpleGit();
  if (fs.existsSync(path.join(dest, ".git"))) return { ok: true, msg: `Already cloned at ${dest}`, dest };
  await git.clone(repoUrl, dest);
  return { ok: true, msg: `Cloned to ${dest}`, dest };
});

ipcMain.handle("pullRepo", async () => {
  const dir = guessedRepoPath();
  const git = simpleGit({ baseDir: dir });
  const res = await git.pull();
  return { ok: true, res };
});

ipcMain.handle("installDeps", async () => {
  const dir = guessedRepoPath();
  await run("pnpm", ["i"], dir, log);
  return { ok: true };
});

ipcMain.handle("buildExportLoad", async () => {
  const dir = guessedRepoPath();
  const build = (store.get("buildScript") || "pnpm build").split(/\s+/);
  const exp   = (store.get("exportScript") || "pnpm export").split(/\s+/);
  await run(build.shift(), build, dir, log);
  await run(exp.shift(), exp, dir, log);
  const outDir = path.join(dir, store.get("exportSubdir") || "out");
  if (!fs.existsSync(path.join(outDir, "index.html"))) throw new Error(`Export folder missing index.html: ${outDir}`);
  registerAppProtocol(outDir);
  await win.loadURL("app://yamato/");
  return { ok: true, outDir };
});

// ----- IPC: auth backend -----
function safeInvoke(fn) {
  return async (_event, payload) => {
    try { return await fn(payload || {}); }
    catch (e) { return { ok: false, error: e.message || String(e) }; }
  };
}

ipcMain.handle("auth:register",        safeInvoke(authRegister));
ipcMain.handle("auth:login",           safeInvoke(authLogin));
ipcMain.handle("auth:verify:start",    safeInvoke(({ userId }) => authStartVerify(userId)));
ipcMain.handle("auth:verify:confirm",  safeInvoke(authConfirmVerify));
ipcMain.handle("auth:reset:start",     safeInvoke(authStartReset));
ipcMain.handle("auth:reset:confirm",   safeInvoke(authConfirmReset));
