/* ─────────────────────────────────────────────────
   SecureDocChain — Access Verification API
   Server-side revocation registry. When access is
   revoked, the docHash + identifier is recorded.
   The share page checks this before allowing downloads.
   
   Storage: JSON file on disk (production: database).
   ───────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

interface RevokedEntry {
  docHash: string;
  identifier: string; // email or wallet address
  revokedAt: string;
}

// In-memory fallback cache for serverless host instances
let memoryCache: RevokedEntry[] = [];

const DATA_DIR = join(tmpdir(), "sdc_cache");
const REVOKED_FILE = join(DATA_DIR, "revoked-access.json");

function ensureDataDir() {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("Failed to create temporary cache directory:", err);
  }
}

function getRevokedList(): RevokedEntry[] {
  try {
    ensureDataDir();
    if (!existsSync(REVOKED_FILE)) return memoryCache;
    const raw = readFileSync(REVOKED_FILE, "utf-8");
    const list = JSON.parse(raw) as RevokedEntry[];
    memoryCache = list;
    return list;
  } catch (err) {
    console.warn("Temp file read failed, falling back to memory cache:", err);
    return memoryCache;
  }
}

function saveRevokedList(list: RevokedEntry[]) {
  memoryCache = list;
  try {
    ensureDataDir();
    writeFileSync(REVOKED_FILE, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Temp file write failed:", err);
  }
}

/**
 * POST — Register a revocation
 * Body: { docHash, identifier }
 */
export async function POST(req: NextRequest) {
  try {
    const { docHash, identifier } = await req.json();
    if (!docHash || !identifier) {
      return NextResponse.json({ error: "Missing docHash or identifier" }, { status: 400 });
    }

    const list = getRevokedList();

    // Avoid duplicates
    const exists = list.some(
      (e) => e.docHash === docHash && e.identifier === identifier
    );
    if (!exists) {
      list.push({ docHash, identifier, revokedAt: new Date().toISOString() });
      saveRevokedList(list);
    }

    return NextResponse.json({ success: true, revoked: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

/**
 * GET — Check if access is revoked
 * Query: ?docHash=xxx&identifier=xxx
 */
export async function GET(req: NextRequest) {
  const docHash = req.nextUrl.searchParams.get("docHash");
  const identifier = req.nextUrl.searchParams.get("identifier");

  if (!docHash) {
    return NextResponse.json({ error: "Missing docHash" }, { status: 400 });
  }

  const list = getRevokedList();

  // Check if this specific user's access is revoked
  const isRevoked = list.some(
    (e) =>
      e.docHash === docHash &&
      (!identifier || e.identifier === identifier)
  );

  return NextResponse.json({ revoked: isRevoked });
}
