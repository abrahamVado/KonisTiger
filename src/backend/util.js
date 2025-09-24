
// /src/backend/util.js
import { customAlphabet } from "nanoid";
export const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6); // 6-char, no 0/O/1/I

export function now() { return Date.now(); }
export function minutes(n) { return 1000 * 60 * n; }
export function newCode() { return nano(); }
export function isEmail(s="") { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
