
// /src/backend/auth.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { openDb } from "./db.js";
import { now, minutes, newCode, isEmail } from "./util.js";
import { randomUUID } from "node:crypto";

const JWT_SECRET = "replace-this-secret"; // TODO: pull from env/secure storage
const TOKEN_TTL_MIN = 60 * 24 * 7; // 7 days

const db = openDb();

const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, created_at) VALUES (@id,@email,@password_hash,@created_at)
`);
const getUserByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);
const getUserById    = db.prepare(`SELECT * FROM users WHERE id = ?`);
const setVerified    = db.prepare(`UPDATE users SET verified_at = ? WHERE id = ?`);

const upsertVerify = db.prepare(`
  INSERT OR REPLACE INTO email_verifications (user_id, code, expires_at) VALUES (?,?,?)
`);
const findVerify = db.prepare(`SELECT * FROM email_verifications WHERE user_id = ? AND code = ?`);
const delVerify = db.prepare(`DELETE FROM email_verifications WHERE user_id = ?`);

const upsertReset = db.prepare(`
  INSERT OR REPLACE INTO password_resets (user_id, code, expires_at) VALUES (?,?,?)
`);
const findReset = db.prepare(`SELECT * FROM password_resets WHERE user_id = ? AND code = ?`);
const delReset = db.prepare(`DELETE FROM password_resets WHERE user_id = ?`);

export async function register({ email, password }) {
  email = String(email || "").trim().toLowerCase();
  if (!isEmail(email)) throw new Error("Invalid email");
  if (!password || password.length < 8) throw new Error("Password too short");

  const exists = getUserByEmail.get(email);
  if (exists) throw new Error("Email already registered");

  const id = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);
  insertUser.run({ id, email, password_hash, created_at: now() });

  const code = newCode();
  upsertVerify.run(id, code, now() + minutes(30)); // 30 min

  return { ok: true, userId: id, email, verificationCode: code };
}

export async function login({ email, password }) {
  email = String(email || "").trim().toLowerCase();
  const u = getUserByEmail.get(email);
  if (!u) throw new Error("Invalid credentials");
  const ok = await bcrypt.compare(password || "", u.password_hash);
  if (!ok) throw new Error("Invalid credentials");

  const token = jwt.sign(
    { sub: u.id, email: u.email, verified: !!u.verified_at },
    JWT_SECRET,
    { expiresIn: `${TOKEN_TTL_MIN}m` }
  );
  return { ok: true, token, user: { id: u.id, email: u.email, verified: !!u.verified_at } };
}

export function startEmailVerification(userId) {
  const u = getUserById.get(userId);
  if (!u) throw new Error("User not found");
  const code = newCode();
  upsertVerify.run(userId, code, now() + minutes(30));
  return { ok: true, code };
}

export function confirmEmailVerification({ userId, code }) {
  const row = findVerify.get(userId, code);
  if (!row) throw new Error("Invalid code");
  if (row.expires_at < now()) { delVerify.run(userId); throw new Error("Code expired"); }
  setVerified.run(now(), userId);
  delVerify.run(userId);
  return { ok: true };
}

export function startPasswordReset({ email }) {
  email = String(email || "").trim().toLowerCase();
  const u = getUserByEmail.get(email);
  if (!u) return { ok: true }; // do not leak existence
  const code = newCode();
  upsertReset.run(u.id, code, now() + minutes(30));
  return { ok: true, userId: u.id, code };
}

export async function confirmPasswordReset({ userId, code, newPassword }) {
  if (!newPassword || newPassword.length < 8) throw new Error("Password too short");
  const row = findReset.get(userId, code);
  if (!row) throw new Error("Invalid code");
  if (row.expires_at < now()) { delReset.run(userId); throw new Error("Code expired"); }
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, userId);
  delReset.run(userId);
  return { ok: true };
}
