// atlas/src/index.ts
// SUPER COMMENTS — IMPLEMENTATION ROADMAP
import { ipcMain } from 'electron';
const NS = 'atlas' as const;
export function activate() {
  ipcMain.handle(`${NS}:ping`, () => ({ ok: true, purpose: "Principal Electron app that discovers, loads, and hosts all modules as plugins (the hub)." }));
}
export function deactivate() {
  ipcMain.removeHandler(`${NS}:ping`);
}