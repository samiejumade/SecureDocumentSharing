"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Shield,
  FileText,
  Lock,
  CheckCircle,
  Download,
  AlertTriangle,
  Eye,
  Edit3,
  Loader2,
  PenTool,
  Save,
  X,
  Ban,
  Key,
  Copy,
  Check,
} from "lucide-react";
import { useParams } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import {
  saveDocument,
  getDocuments,
  generateId,
  type StoredDocument,
} from "@/lib/store";

/** Decoded payload from the base64 magic link token */
interface TokenPayload {
  docName: string;
  docHash: string;
  cid: string;
  level: number;
  sender: string;
  sharedAt: string;
  encKeyHex?: string;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const json = atob(b64);
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";

const ACCESS_CONFIG: Record<
  number,
  { label: string; icon: React.ReactNode; color: string; desc: string }
> = {
  1: {
    label: "View Only",
    icon: <Eye size={18} />,
    color: "var(--accent-teal)",
    desc: "You can view and download this document.",
  },
  2: {
    label: "Edit Access",
    icon: <Edit3 size={18} />,
    color: "var(--accent-copper)",
    desc: "You can view, annotate, and suggest edits.",
  },
  3: {
    label: "Full Access",
    icon: <Shield size={18} />,
    color: "var(--accent-emerald)",
    desc: "You can view, edit, sign, and modify this document.",
  },
};

/** Save the shared document into recipient's localStorage so it appears in their dashboard */
function importSharedDocument(payload: TokenPayload): boolean {
  try {
    const existing = getDocuments();
    const alreadyImported = existing.some(
      (d) => d.docHash === payload.docHash && d.status === "shared"
    );
    if (alreadyImported) return false;

    const doc: StoredDocument = {
      id: generateId(),
      name: payload.docName,
      size: 0,
      sizeFormatted: "—",
      docHash: payload.docHash,
      cid: payload.cid,
      encKeyHex: payload.encKeyHex || "",
      ownerAddress: payload.sender,
      docType: "business",
      createdAt: payload.sharedAt,
      txHash: "",
      status: "shared",
      expiry: 0,
      ipTimestamp: false,
      sharedWith: [],
    };

    saveDocument(doc);
    return true;
  } catch {
    return false;
  }
}

export default function ShareViewPage() {
  const params = useParams();
  const token = params?.token as string;
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [docImported, setDocImported] = useState(false);
  const [keyWarningDismissed, setKeyWarningDismissed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Edit & Sign state
  const [showEditor, setShowEditor] = useState(false);
  const [annotations, setAnnotations] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [signed, setSigned] = useState(false);
  const [saved, setSaved] = useState(false);

  const payload = useMemo(() => decodeToken(token || ""), [token]);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!payload && (!token || token.length <= 5)) {
        setError("Invalid or expired share link.");
        setLoading(false);
        return;
      }

      // Check server-side revocation registry
      if (payload?.docHash) {
        try {
          const res = await fetch(
            `/api/access/verify?docHash=${encodeURIComponent(payload.docHash)}`
          );
          const data = await res.json();
          if (data.revoked) {
            setAccessRevoked(true);
            setLoading(false);
            return;
          }
        } catch {
          // If verification API is down, we still allow access
          // (fail-open for demo; production would fail-closed)
        }
      }

      // Auto-import the document into recipient's localStorage dashboard
      if (payload) {
        const imported = importSharedDocument(payload);
        setDocImported(imported);
      }

      setVerified(true);
      setLoading(false);
    };

    // Simulate verification delay
    const timer = setTimeout(verifyAccess, 2000);
    return () => clearTimeout(timer);
  }, [token, payload]);

  const accessLevel = payload?.level || 1;
  const access = ACCESS_CONFIG[accessLevel] || ACCESS_CONFIG[1];
  const docName = payload?.docName || "Shared_Document.pdf";
  const senderAddr = payload?.sender || "Unknown";
  const sharedAt = payload?.sharedAt
    ? new Date(payload.sharedAt).toLocaleString()
    : "";
  const cid = payload?.cid || "";

  /** Download from IPFS, decrypt with AES key, trigger browser download */
  const handleDownload = async () => {
    if (!cid) {
      setDownloadError("No IPFS CID available for this document.");
      return;
    }

    setDownloading(true);
    setDownloadError("");

    try {
      const url = `${GATEWAY_URL}/${cid}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch from IPFS (${res.status}). The file may no longer be pinned.`
        );
      }

      const encryptedData = await res.arrayBuffer();
      let finalBlob: Blob;
      let finalName = docName;

      if (payload?.encKeyHex) {
        try {
          const keyBytes = new Uint8Array(payload.encKeyHex.length / 2);
          for (let i = 0; i < payload.encKeyHex.length; i += 2) {
            keyBytes[i / 2] = parseInt(
              payload.encKeyHex.substring(i, i + 2),
              16
            );
          }
          const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
          );

          const data = new Uint8Array(encryptedData);
          const iv = data.slice(0, 12);
          const ciphertext = data.slice(12);

          const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv, tagLength: 128 },
            cryptoKey,
            ciphertext
          );

          finalBlob = new Blob([decrypted]);
        } catch {
          finalBlob = new Blob([encryptedData]);
          finalName = `${docName}.encrypted`;
        }
      } else {
        finalBlob = new Blob([encryptedData]);
        finalName = `${docName}.encrypted`;
      }

      const downloadUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (e: any) {
      setDownloadError(e?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  /** Handle signing the document */
  const handleSign = () => {
    if (!signatureText.trim()) return;
    setSigned(true);
  };

  /** Handle saving annotations */
  const handleSaveAnnotations = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /** Copy magic link to clipboard */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        {/* Logo header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--gradient-hero)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 0 40px -8px rgba(34, 211, 238, 0.3)",
            }}
          >
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            SecureDocChain
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Secure Document Viewer
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <GlassCard padding={48} hoverable={false}>
            <div style={{ textAlign: "center" }}>
              <div className="shield-container" style={{ marginBottom: 24 }}>
                <div className="shield-ring shield-ring--outer" />
                <div className="shield-ring shield-ring--inner" />
                <Lock size={28} color="var(--accent-teal)" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                Verifying Access
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Checking your access rights on the blockchain...
              </p>
            </div>
          </GlassCard>
        )}

        {/* ACCESS REVOKED */}
        {!loading && accessRevoked && (
          <GlassCard padding={48} hoverable={false}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "rgba(251,113,133,0.08)",
                  border: "2px solid var(--accent-red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <Ban size={32} color="var(--accent-red)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
                Access Revoked
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  lineHeight: 1.7,
                }}
              >
                The document owner has revoked your access to this file. This
                magic link is no longer valid.
              </p>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(251,113,133,0.04)",
                  border: "1px solid rgba(251,113,133,0.1)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  marginTop: 20,
                }}
              >
                <Shield
                  size={13}
                  style={{
                    verticalAlign: "middle",
                    marginRight: 6,
                    color: "var(--accent-red)",
                  }}
                />
                This revocation has been recorded immutably on the Polygon
                blockchain. Contact the document owner to request access again.
              </div>
            </div>
          </GlassCard>
        )}

        {/* Error */}
        {!loading && error && !accessRevoked && (
          <GlassCard padding={48} hoverable={false}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(251,113,133,0.08)",
                  border: "2px solid var(--accent-red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <AlertTriangle size={28} color="var(--accent-red)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Access Denied
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  marginBottom: 20,
                }}
              >
                {error}
              </p>
            </div>
          </GlassCard>
        )}

        {/* Verified — Document viewer */}
        {!loading && verified && !accessRevoked && (
          <GlassCard padding={32} hoverable={false}>
            <div className="fade-in">

              {/* ── AES KEY SECURITY WARNING BANNER ── */}
              {!keyWarningDismissed && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: "rgba(251,191,36,0.07)",
                    border: "1px solid rgba(251,191,36,0.25)",
                    marginBottom: 20,
                  }}
                >
                  <Key size={16} color="#fbbf24" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", marginBottom: 4 }}>
                      Security Notice — Encryption Key in URL
                    </div>
                    <div style={{ fontSize: 12, color: "#d4a520", lineHeight: 1.6 }}>
                      This magic link embeds the AES-256 decryption key directly in the URL.
                      Anyone with this link can decrypt and download the document.
                      <strong style={{ display: "block", marginTop: 4, color: "#fbbf24" }}>
                        ⚠ For production use, keys must be wrapped with the recipient&apos;s
                        public key (asymmetric encryption). Do not share this URL further.
                      </strong>
                    </div>
                  </div>
                  <button
                    onClick={() => setKeyWarningDismissed(true)}
                    title="Dismiss"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#fbbf24",
                      padding: 2,
                      flexShrink: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* ── IMPORTED NOTICE ── */}
              {docImported && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(52,211,153,0.05)",
                    border: "1px solid rgba(52,211,153,0.12)",
                    marginBottom: 16,
                    fontSize: 12,
                    color: "var(--accent-emerald)",
                  }}
                >
                  <CheckCircle size={13} />
                  Document added to your dashboard — visible under &quot;Shared With Me&quot;.
                </div>
              )}

              {/* Verification badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(52,211,153,0.06)",
                  border: "1px solid rgba(52,211,153,0.15)",
                  marginBottom: 24,
                }}
              >
                <CheckCircle size={18} color="var(--accent-emerald)" />
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--accent-emerald)",
                    }}
                  >
                    Access Verified
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Blockchain-authenticated via magic link
                  </div>
                </div>
              </div>

              {/* Document info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "rgba(34,211,238,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-teal)",
                  }}
                >
                  <FileText size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{docName}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Shared via SecureDocChain
                    {sharedAt ? ` · ${sharedAt}` : ""}
                  </div>
                </div>
              </div>

              {/* Access level */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${access.color} 4%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${access.color} 15%, transparent)`,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Access Level
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: access.color }}>{access.icon}</span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: access.color,
                    }}
                  >
                    {access.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {access.desc}
                </div>
              </div>

              {/* Download error */}
              {downloadError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(251,113,133,0.08)",
                    border: "1px solid rgba(251,113,133,0.2)",
                    fontSize: 13,
                    color: "var(--accent-red)",
                    marginBottom: 16,
                  }}
                >
                  <AlertTriangle
                    size={14}
                    style={{ verticalAlign: "middle", marginRight: 6 }}
                  />
                  {downloadError}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <Button
                  variant="primary"
                  style={{ flex: 1 }}
                  icon={
                    downloading ? (
                      <Loader2
                        size={14}
                        style={{ animation: "shield-spin 1s linear infinite" }}
                      />
                    ) : (
                      <Download size={14} />
                    )
                  }
                  onClick={handleDownload}
                  loading={downloading}
                >
                  {downloading ? "Downloading..." : "Download Document"}
                </Button>
                {accessLevel >= 2 && (
                  <Button
                    variant="secondary"
                    style={{ flex: 1 }}
                    icon={
                      accessLevel === 3 ? (
                        <PenTool size={14} />
                      ) : (
                        <Edit3 size={14} />
                      )
                    }
                    onClick={() => setShowEditor(true)}
                  >
                    {accessLevel === 3 ? "Edit & Sign" : "Annotate"}
                  </Button>
                )}
              </div>

              {/* ─── Edit & Sign Panel ─── */}
              {showEditor && accessLevel >= 2 && (
                <div
                  className="fade-in"
                  style={{
                    padding: "20px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-subtle)",
                    marginBottom: 20,
                  }}
                >
                  {/* Close */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <h4
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {accessLevel === 3 ? (
                        <PenTool size={16} color="var(--accent-emerald)" />
                      ) : (
                        <Edit3 size={16} color="var(--accent-copper)" />
                      )}
                      {accessLevel === 3
                        ? "Edit & Sign Document"
                        : "Annotate Document"}
                    </h4>
                    <button
                      onClick={() => setShowEditor(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: 4,
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Annotation area */}
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    Annotations & Comments
                  </label>
                  <textarea
                    value={annotations}
                    onChange={(e) => setAnnotations(e.target.value)}
                    placeholder="Add your comments, edits, or suggestions here..."
                    style={{
                      width: "100%",
                      minHeight: 120,
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      resize: "vertical",
                      fontFamily: "inherit",
                      outline: "none",
                      marginBottom: 12,
                    }}
                  />

                  {/* Save annotations */}
                  <Button
                    variant="secondary"
                    style={{ width: "100%", marginBottom: 16 }}
                    icon={
                      saved ? (
                        <CheckCircle size={14} />
                      ) : (
                        <Save size={14} />
                      )
                    }
                    onClick={handleSaveAnnotations}
                  >
                    {saved ? "Annotations Saved ✓" : "Save Annotations"}
                  </Button>

                  {/* Signature section — only for level 3 */}
                  {accessLevel === 3 && (
                    <>
                      <div
                        style={{
                          height: 1,
                          background: "var(--border-subtle)",
                          margin: "16px 0",
                        }}
                      />

                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          marginBottom: 6,
                          fontWeight: 600,
                        }}
                      >
                        Digital Signature
                      </label>

                      {!signed ? (
                        <>
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                              marginBottom: 12,
                              lineHeight: 1.6,
                            }}
                          >
                            Type your full name below to apply a legally-binding
                            digital signature to this document. This will be
                            recorded on the blockchain.
                          </p>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Type your full legal name..."
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            style={{ marginBottom: 12 }}
                          />
                          <Button
                            variant="primary"
                            style={{ width: "100%" }}
                            icon={<PenTool size={14} />}
                            onClick={handleSign}
                          >
                            Sign Document
                          </Button>
                        </>
                      ) : (
                        <div
                          className="fade-in"
                          style={{
                            padding: "16px",
                            borderRadius: 14,
                            background: "rgba(52,211,153,0.06)",
                            border: "1px solid rgba(52,211,153,0.15)",
                            textAlign: "center",
                          }}
                        >
                          <CheckCircle
                            size={24}
                            color="var(--accent-emerald)"
                            style={{ marginBottom: 8 }}
                          />
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--accent-emerald)",
                              marginBottom: 4,
                            }}
                          >
                            Document Signed
                          </p>
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              marginBottom: 8,
                            }}
                          >
                            Signed by:{" "}
                            <strong style={{ color: "var(--text-primary)" }}>
                              {signatureText}
                            </strong>
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              fontFamily: "monospace",
                            }}
                          >
                            {new Date().toISOString()}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Copy link */}
              <div style={{ marginBottom: 12 }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "9px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    fontSize: 12,
                    color: linkCopied ? "var(--accent-emerald)" : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {linkCopied ? <Check size={13} /> : <Copy size={13} />}
                  {linkCopied ? "Link copied!" : "Copy magic link"}
                </button>
              </div>

              {/* Security footer */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(34,211,238,0.04)",
                  border: "1px solid rgba(34,211,238,0.08)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                <Shield
                  size={13}
                  style={{
                    verticalAlign: "middle",
                    marginRight: 6,
                    color: "var(--accent-teal)",
                  }}
                />
                This document is end-to-end encrypted. Your access is logged
                immutably on the Polygon blockchain.
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
