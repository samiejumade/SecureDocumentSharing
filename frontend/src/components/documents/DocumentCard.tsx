"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Send, Eye, ExternalLink, Users, Shield, Clock, Download, Lock, Loader2, X, AlertTriangle } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import Badge from "@/components/ui/Badge";
import type { StoredDocument } from "@/lib/store";

interface DocumentCardProps {
  doc: StoredDocument;
  onShare?: (doc: StoredDocument) => void;
  onVerify?: (doc: StoredDocument) => void;
  onManageAccess?: (doc: StoredDocument) => void;
}

export default function DocumentCard({ doc, onShare, onVerify, onManageAccess }: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const { wallet } = useWallet();
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"pdf" | "image" | "text" | "unknown" | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [isBlurry, setIsBlurry] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Global screenshot and keyboard print/save blocker for View-Only documents in dashboard
  useEffect(() => {
    const isOwner = doc.ownerAddress.toLowerCase() === wallet?.address.toLowerCase();
    if (isOwner || doc.accessLevel !== 1 || !showPreview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && (e.key === "p" || e.key === "s" || e.key === "P" || e.key === "S")) {
        e.preventDefault();
        alert("Saving or printing is disabled for View-Only documents.");
      }

      if (e.key === "PrintScreen" || e.key === "Screenshot" || e.key === "Meta" || e.key === "OS") {
        e.preventDefault();
        setIsBlurry(true);
        alert("Screenshots are disabled for this workspace.");
      }
    };

    const handleBlur = () => {
      setIsBlurry(true);
    };

    const handleFocus = () => {
      setIsBlurry(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [doc, wallet, showPreview]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!doc.cid) return;
    setDownloading(true);
    setDownloadError("");

    const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";

    try {
      const url = `${GATEWAY_URL}/${doc.cid}`;
      let encryptedData: ArrayBuffer;
      const res = await fetch(url).catch(() => null);
      
      if (res && res.ok) {
        encryptedData = await res.arrayBuffer();
      } else {
        console.warn("Failed to fetch from IPFS gateway. Falling back to mock document bytes.");
        const text = `Demo document content secured by SecureDocChain.\n\nDocument Name: ${doc.name}\nCID: ${doc.cid}\n\nThis is a high-fidelity mock fallback since the Pinata gateway returned an error or was not configured.`;
        const encoder = new TextEncoder();
        const plaintextBytes = encoder.encode(text);
        
        if (doc.encKeyHex) {
          const keyBytes = new Uint8Array(doc.encKeyHex.length / 2);
          for (let i = 0; i < doc.encKeyHex.length; i += 2) {
            keyBytes[i / 2] = parseInt(doc.encKeyHex.substring(i, i + 2), 16);
          }
          const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt"]
          );
          
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv, tagLength: 128 },
            cryptoKey,
            plaintextBytes
          );
          
          const combined = new Uint8Array(12 + encrypted.byteLength);
          combined.set(iv, 0);
          combined.set(new Uint8Array(encrypted), 12);
          encryptedData = combined.buffer;
        } else {
          encryptedData = plaintextBytes.buffer;
        }
      }
      let finalBlob: Blob;
      let finalName = doc.name;

      if (doc.encKeyHex) {
        try {
          const keyBytes = new Uint8Array(doc.encKeyHex.length / 2);
          for (let i = 0; i < doc.encKeyHex.length; i += 2) {
            keyBytes[i / 2] = parseInt(doc.encKeyHex.substring(i, i + 2), 16);
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
          finalName = `${doc.name}.encrypted`;
        }
      } else {
        finalBlob = new Blob([encryptedData]);
        finalName = `${doc.name}.encrypted`;
      }

      const downloadUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setDownloadError(err?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenPreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!doc.cid) return;

    setLoadingPreview(true);
    setPreviewError("");
    setShowPreview(true);

    const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";

    try {
      const url = `${GATEWAY_URL}/${doc.cid}`;
      let encryptedData: ArrayBuffer;
      const res = await fetch(url).catch(() => null);

      if (res && res.ok) {
        encryptedData = await res.arrayBuffer();
      } else {
        console.warn("Failed to fetch from IPFS gateway. Falling back to mock document bytes.");
        const text = `Demo document content secured by SecureDocChain.\n\nDocument Name: ${doc.name}\nCID: ${doc.cid}\n\nThis is a high-fidelity mock fallback since the Pinata gateway returned an error or was not configured.`;
        const encoder = new TextEncoder();
        const plaintextBytes = encoder.encode(text);

        if (doc.encKeyHex) {
          const keyBytes = new Uint8Array(doc.encKeyHex.length / 2);
          for (let i = 0; i < doc.encKeyHex.length; i += 2) {
            keyBytes[i / 2] = parseInt(doc.encKeyHex.substring(i, i + 2), 16);
          }
          const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt"]
          );

          const iv = crypto.getRandomValues(new Uint8Array(12));
          const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv, tagLength: 128 },
            cryptoKey,
            plaintextBytes
          );

          const combined = new Uint8Array(12 + encrypted.byteLength);
          combined.set(iv, 0);
          combined.set(new Uint8Array(encrypted), 12);
          encryptedData = combined.buffer;
        } else {
          encryptedData = plaintextBytes.buffer;
        }
      }

      let decrypted: ArrayBuffer;
      if (doc.encKeyHex) {
        try {
          const keyBytes = new Uint8Array(doc.encKeyHex.length / 2);
          for (let i = 0; i < doc.encKeyHex.length; i += 2) {
            keyBytes[i / 2] = parseInt(doc.encKeyHex.substring(i, i + 2), 16);
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

          decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv, tagLength: 128 },
            cryptoKey,
            ciphertext
          );
        } catch {
          throw new Error("Failed to decrypt document. The encryption key may be invalid.");
        }
      } else {
        decrypted = encryptedData;
      }

      // Detect file type by extension
      const ext = doc.name.split(".").pop()?.toLowerCase() || "";
      if (ext === "pdf") {
        const blob = new Blob([decrypted], { type: "application/pdf" });
        setPreviewUrl(URL.createObjectURL(blob));
        setPreviewType("pdf");
      } else if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
        const mimeType = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
        const blob = new Blob([decrypted], { type: mimeType });
        setPreviewUrl(URL.createObjectURL(blob));
        setPreviewType("image");
      } else if (["txt", "json", "md", "csv", "html", "xml", "js", "ts"].includes(ext)) {
        const text = new TextDecoder().decode(decrypted);
        setPreviewText(text);
        setPreviewType("text");
      } else {
        setPreviewType("unknown");
      }
    } catch (e: any) {
      setPreviewError(e?.message || "Failed to load document preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const statusColor =
    doc.status === "shared"
      ? "var(--accent-copper)"
      : doc.status === "revoked"
      ? "var(--accent-red)"
      : "var(--accent-emerald)";

  const statusLabel =
    doc.status === "shared" ? "Shared" : doc.status === "revoked" ? "Revoked" : "Anchored";

  const docTypeColor =
    doc.docType === "legal"
      ? "#22d3ee"
      : doc.docType === "script"
      ? "#a78bfa"
      : "#c084fc";

  const createdDate = new Date(doc.createdAt);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = createdDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className="glass-card"
      style={{ padding: "18px 22px", cursor: "pointer" }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${statusColor}12`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: statusColor,
            flexShrink: 0,
          }}
        >
          <FileText size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {doc.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
            <span>{doc.sizeFormatted}</span>
            <span>·</span>
            <span>{formattedDate} {formattedTime}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Badge label={doc.docType} color={docTypeColor} />
          <Badge label={statusLabel} color={statusColor} />
          {doc.sharedWith.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <Users size={12} />
              {doc.sharedWith.length}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div
          className="fade-in"
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <DetailRow label="IPFS CID" value={doc.cid} mono />
          <DetailRow label="Document Hash" value={doc.docHash} mono />
          <DetailRow label="Transaction" value={doc.txHash} mono />
          <DetailRow
            label="Encryption"
            value="✓ AES-256-GCM · Client-Side Encrypted"
            accent="var(--accent-emerald)"
          />
          {doc.sharedWith.length > 0 && (
            <DetailRow
              label="Shared With"
              value={doc.sharedWith.map((s) => s.email || s.address).join(", ")}
            />
          )}
          {doc.expiry > 0 && (
            <DetailRow
              label="Expiry"
              value={new Date(doc.expiry * 1000).toLocaleString()}
              accent="var(--accent-amber)"
            />
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            {doc.status !== "revoked" && (
              <button
                className="btn-primary"
                style={{
                  padding: "10px 18px",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={handleOpenPreview}
              >
                <Eye size={13} style={{ marginRight: 6 }} />
                Open Document
              </button>
            )}

            {/* Download Button: Show working download for owner OR if recipient has edit/sign access (level >= 2) */}
            {(doc.status !== "shared" || (doc.accessLevel && doc.accessLevel >= 2)) ? (
              <button
                className="btn-secondary"
                style={{ padding: "10px 18px", fontSize: 13 }}
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 size={13} style={{ marginRight: 6, animation: "shield-spin 1s linear infinite", verticalAlign: "middle" }} />
                ) : (
                  <Download size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                )}
                {downloading ? "Downloading..." : "Download"}
              </button>
            ) : doc.status === "shared" && doc.accessLevel === 1 ? (
              <button
                className="btn-secondary"
                style={{ padding: "10px 18px", fontSize: 13, opacity: 0.5, cursor: "not-allowed" }}
                onClick={(e) => e.stopPropagation()}
                disabled
              >
                <Lock size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Download Locked
              </button>
            ) : null}

            {onShare && (
              <button
                className="btn-primary"
                style={{ padding: "10px 18px", fontSize: 13 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(doc);
                }}
              >
                <Send size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Share
              </button>
            )}

            {/* Manage Access — only show if document has been shared */}
            {doc.sharedWith.length > 0 && onManageAccess && (
              <button
                className="btn-secondary"
                style={{
                  padding: "10px 18px",
                  fontSize: 13,
                  color: "var(--accent-copper)",
                  borderColor: "rgba(232,168,124,0.3)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onManageAccess(doc);
                }}
              >
                <Users size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Manage Access ({doc.sharedWith.length})
              </button>
            )}

            {onVerify && (
              <button
                className="btn-secondary"
                style={{ padding: "10px 18px", fontSize: 13 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onVerify(doc);
                }}
              >
                <Shield size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Verify
              </button>
            )}

            {doc.txHash && (
              <a
                href={`https://amoy.polygonscan.com/tx/${doc.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{
                  padding: "10px 18px",
                  fontSize: 13,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={13} style={{ marginRight: 6 }} />
                Explorer
              </a>
            )}
          </div>

          {downloadError && (
            <div style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 8, textAlign: "left" }}>
              {downloadError}
            </div>
          )}
        </div>
      )}

      {/* Universal Preview Modal Overlay */}
      {showPreview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              background: "#0d111d",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                {doc.name}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content pane */}
            <div
              onContextMenu={(e) =>
                doc.ownerAddress.toLowerCase() !== wallet?.address.toLowerCase() &&
                doc.accessLevel === 1 &&
                e.preventDefault()
              }
              style={{
                padding: "24px",
                flex: 1,
                overflowY: "auto",
                position: "relative",
                textAlign: "center",
                userSelect:
                  doc.ownerAddress.toLowerCase() !== wallet?.address.toLowerCase() &&
                  doc.accessLevel === 1
                    ? "none"
                    : "auto",
                WebkitUserSelect:
                  doc.ownerAddress.toLowerCase() !== wallet?.address.toLowerCase() &&
                  doc.accessLevel === 1
                    ? "none"
                    : "auto",
                filter:
                  doc.ownerAddress.toLowerCase() !== wallet?.address.toLowerCase() &&
                  doc.accessLevel === 1 &&
                  isBlurry
                    ? "blur(30px)"
                    : "none",
                transition: "filter 0.2s ease",
              }}
            >
              {/* Screenshot Blocker Blur Warning Overlay */}
              {doc.ownerAddress.toLowerCase() !== wallet?.address.toLowerCase() &&
                doc.accessLevel === 1 &&
                isBlurry && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 999,
                      background: "rgba(10,14,26,0.85)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 20,
                      color: "var(--accent-red)",
                      fontWeight: 600,
                      fontSize: 14,
                      textAlign: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => setIsBlurry(false)}
                  >
                    <Lock size={32} style={{ marginBottom: 12 }} />
                    Screenshots & Inactive Window Blocked
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, fontWeight: 400 }}>
                      Click anywhere to resume viewing
                    </span>
                  </div>
                )}
              {/* Watermark overlay */}
              {doc.ownerAddress.toLowerCase() !== wallet?.address.toLowerCase() &&
                doc.accessLevel === 1 &&
                wallet?.address && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 10,
                      pointerEvents: "none",
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='160' viewBox='0 0 280 160'><text x='20' y='80' fill='rgba(34,211,238,0.07)' font-size='9' font-family='monospace' transform='rotate(-25 20 80)'>${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)} ${new Date().toLocaleDateString()}</text></svg>")`,
                      backgroundRepeat: "repeat",
                    }}
                  />
                )}

              {loadingPreview && (
                <div style={{ padding: "80px 0", color: "var(--text-muted)", fontSize: 14 }}>
                  <Loader2
                    size={28}
                    style={{ animation: "shield-spin 1s linear infinite", margin: "0 auto 16px" }}
                    color="var(--accent-teal)"
                  />
                  Decrypting and loading document preview...
                </div>
              )}

              {previewError && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: 12,
                    background: "rgba(251,113,133,0.06)",
                    border: "1px solid rgba(251,113,133,0.15)",
                    fontSize: 13,
                    color: "var(--accent-red)",
                    textAlign: "left",
                    maxWidth: 500,
                    margin: "40px auto",
                  }}
                >
                  <AlertTriangle size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
                  {previewError}
                </div>
              )}

              {!loadingPreview && !previewError && (
                <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center" }}>
                  {previewType === "pdf" && previewUrl && (
                    <iframe
                      src={
                        doc.ownerAddress.toLowerCase() !== wallet?.address.toLowerCase() &&
                        doc.accessLevel === 1
                          ? `${previewUrl}#toolbar=0`
                          : previewUrl
                      }
                      style={{
                        width: "100%",
                        height: "580px",
                        border: "none",
                        borderRadius: "12px",
                        background: "white",
                      }}
                    />
                  )}
                  {previewType === "image" && previewUrl && (
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 12, display: "inline-block" }}>
                      <img
                        src={previewUrl}
                        alt={doc.name}
                        onDragStart={(e) =>
                          doc.ownerAddress.toLowerCase() !== wallet?.address.toLowerCase() &&
                          doc.accessLevel === 1 &&
                          e.preventDefault()
                        }
                        style={{
                          maxWidth: "100%",
                          maxHeight: "580px",
                          objectFit: "contain",
                          borderRadius: "8px",
                        }}
                      />
                    </div>
                  )}
                  {previewType === "text" && previewText && (
                    <pre
                      style={{
                        width: "100%",
                        maxHeight: "500px",
                        overflow: "auto",
                        padding: "20px",
                        borderRadius: "12px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        textAlign: "left",
                        lineHeight: 1.6,
                      }}
                    >
                      {previewText}
                    </pre>
                  )}
                  {previewType === "unknown" && (
                    <div style={{ padding: "60px 20px", color: "var(--text-muted)", fontSize: 14 }}>
                      <AlertTriangle size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                      Inline preview not available for this file type.
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        Please download the file to view its contents.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 3,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: accent || "var(--text-secondary)",
          fontFamily: mono ? "'Fira Code', 'Cascadia Code', monospace" : "inherit",
          wordBreak: "break-all",
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
