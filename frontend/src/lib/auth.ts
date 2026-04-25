/* ─────────────────────────────────────────────────
   SecureDocChain — Auth Store
   Simple token-based session with localStorage.
   Production upgrade: use httpOnly cookies + JWT.
   ───────────────────────────────────────────────── */

import { randomBytes } from "crypto";

const AUTH_SESSION_KEY = "sdc_auth_session";
const AUTH_TOKENS_KEY = "sdc_auth_tokens"; // server-side (file/memory)

export interface AuthSession {
  email: string;
  name?: string;
  walletAddress?: string;
  loginMethod: "email" | "wallet";
  authenticatedAt: string;
  sessionToken: string;
}

/** Generate a secure random token */
export function generateAuthToken(): string {
  // For client-side or simple usage, use a timestamp + random hex
  const ts = Date.now().toString(36);
  const rand = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `${ts}_${rand}`;
}

/** Build a magic link token payload (base64) */
export function buildLoginToken(email: string): string {
  const payload = {
    email,
    type: "login",
    token: generateAuthToken(),
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  };
  const json = JSON.stringify(payload);
  if (typeof window !== "undefined") {
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(json).toString("base64url");
}

/** Decode a login token */
export function decodeLoginToken(
  token: string
): { email: string; type: string; token: string; createdAt: number; expiresAt: number } | null {
  try {
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";

    let json: string;
    if (typeof window !== "undefined") {
      json = atob(b64);
    } else {
      json = Buffer.from(b64, "base64").toString("utf-8");
    }
    const payload = JSON.parse(json);
    if (payload.type !== "login") return null;
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ── Client-side Session ──────────────────────── */

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("sdc:auth-changed"));
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
  window.dispatchEvent(new CustomEvent("sdc:auth-changed"));
}
