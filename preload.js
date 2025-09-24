
// preload.js
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getCfg: () => ipcRenderer.invoke("cfg:get"),
  updateCfg: (patch) => ipcRenderer.invoke("cfg:update", patch),
  pickBase: () => ipcRenderer.invoke("pickBase"),
  cloneRepo: (repoUrl, baseDir) => ipcRenderer.invoke("cloneRepo", { repoUrl, baseDir }),
  pullRepo: () => ipcRenderer.invoke("pullRepo"),
  installDeps: () => ipcRenderer.invoke("installDeps"),
  buildExportLoad: () => ipcRenderer.invoke("buildExportLoad"),
  onLog: (cb) => ipcRenderer.on("log", (_, s) => cb(s)),
});

// Auth API
contextBridge.exposeInMainWorld("auth", {
  register: (email, password) => ipcRenderer.invoke("auth:register", { email, password }),
  login:    (email, password) => ipcRenderer.invoke("auth:login", { email, password }),
  startVerify:  (userId) => ipcRenderer.invoke("auth:verify:start", { userId }),
  confirmVerify:(userId, code) => ipcRenderer.invoke("auth:verify:confirm", { userId, code }),
  startReset:   (email) => ipcRenderer.invoke("auth:reset:start", { email }),
  confirmReset: (userId, code, newPassword) => ipcRenderer.invoke("auth:reset:confirm", { userId, code, newPassword }),
});
