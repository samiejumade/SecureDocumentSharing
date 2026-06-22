"use client";

import { useState } from "react";
import { FileText, Send, Eye, ExternalLink, Users, Shield, Clock, Download, Lock, Loader2 } from "lucide-react";
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!doc.cid) return;
    setDownloading(true);
    setDownloadError("");

    const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";

    try {
      const url = `${GATEWAY_URL}/${doc.cid}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch from IPFS (${res.status})`);
      }

      const encryptedData = await res.arrayBuffer();
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
            {doc.status === "shared" && doc.shareToken && (
              <a
                href={`/share/${doc.shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  padding: "10px 18px",
                  fontSize: 13,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Eye size={13} style={{ marginRight: 6 }} />
                Open Document
              </a>
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
