/* ─────────────────────────────────────────────────
   SecureDocChain — Document Store (Local + Events)
   Client-side persistence for document metadata.
   Production upgrade path: swap to PostgreSQL via API.
   ───────────────────────────────────────────────── */

export type DocType = "legal" | "script" | "business";
export type DocStatus = "anchored" | "shared" | "revoked";
export type AccessLevel = 0 | 1 | 2 | 3; // none | view | edit | sign

export interface StoredDocument {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  docHash: string;          // bytes32 from contract
  cid: string;              // IPFS CID
  encKeyHex: string;        // AES key (hex) — owner-only
  ownerAddress: string;
  docType: DocType;
  createdAt: string;        // ISO timestamp
  txHash: string;           // Polygon tx hash
  status: DocStatus;
  expiry: number;           // Unix timestamp, 0 = no expiry
  ipTimestamp: boolean;     // ScriptSafe IP proof flag
  sharedWith: SharedAccess[];
}

export interface SharedAccess {
  address: string;
  email?: string;
  level: AccessLevel;
  grantedAt: string;
  txHash: string;
}

export interface AuditEntry {
  id: string;
  docHash: string;
  action: string;
  actor: string;
  fileName: string;
  timestamp: string;
  txHash: string;
  category: "anchor" | "access" | "view" | "revoke" | "verify" | "update";
}

const DOCS_KEY = "sdc_documents";
const AUDIT_KEY = "sdc_audit";

/* ── Document CRUD ─────────────────────────────── */

export function getDocuments(): StoredDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDocument(doc: StoredDocument): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    docs[idx] = doc;
  } else {
    docs.unshift(doc);
  }
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  window.dispatchEvent(new CustomEvent("sdc:documents-changed"));
}

export function getDocumentById(id: string): StoredDocument | undefined {
  return getDocuments().find((d) => d.id === id);
}

export function getDocumentByHash(docHash: string): StoredDocument | undefined {
  return getDocuments().find((d) => d.docHash === docHash);
}

export function updateDocumentStatus(id: string, status: DocStatus): void {
  const doc = getDocumentById(id);
  if (doc) {
    doc.status = status;
    saveDocument(doc);
  }
}

export function addSharedAccess(docId: string, access: SharedAccess): void {
  const doc = getDocumentById(docId);
  if (doc) {
    doc.sharedWith.push(access);
    doc.status = "shared";
    saveDocument(doc);
  }
}

export function removeSharedAccess(docId: string, address: string): void {
  const doc = getDocumentById(docId);
  if (doc) {
    doc.sharedWith = doc.sharedWith.filter((s) => s.address !== address);
    if (doc.sharedWith.length === 0) {
      doc.status = "anchored";
    }
    saveDocument(doc);
  }
}

/* ── Audit Log ─────────────────────────────────── */

export function getAuditEntries(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addAuditEntry(entry: AuditEntry): void {
  const entries = getAuditEntries();
  entries.unshift(entry);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent("sdc:audit-changed"));
}

/* ── Helpers ───────────────────────────────────── */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
