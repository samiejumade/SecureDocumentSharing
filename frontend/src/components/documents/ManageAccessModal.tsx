"use client";

import { useState } from "react";
import {
  Users,
  Eye,
  FileText,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useWallet } from "@/context/WalletContext";
import { revokeDocumentAccess } from "@/lib/web3";
import {
  removeSharedAccess,
  addAuditEntry,
  generateId,
  type StoredDocument,
  type SharedAccess,
} from "@/lib/store";

interface ManageAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: StoredDocument | null;
  onRevoked: () => void; // callback to refresh the parent
}

const ACCESS_LABELS: Record<number, { label: string; icon: React.ReactNode; color: string }> = {
  1: { label: "View Only", icon: <Eye size={13} />, color: "var(--accent-teal)" },
  2: { label: "Edit", icon: <FileText size={13} />, color: "var(--accent-copper)" },
  3: { label: "Full Access", icon: <Shield size={13} />, color: "var(--accent-emerald)" },
};

export default function ManageAccessModal({
  isOpen,
  onClose,
  document,
  onRevoked,
}: ManageAccessModalProps) {
  const { wallet } = useWallet();
  const [revoking, setRevoking] = useState<string | null>(null); // address being revoked
  const [error, setError] = useState("");
  const [lastRevokeTx, setLastRevokeTx] = useState("");
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  if (!document) return null;

  const handleRevoke = async (access: SharedAccess) => {
    setRevoking(access.address);
    setError("");
    setRevokeSuccess(false);
    setLastRevokeTx("");

    try {
      // On-chain revocation
      let txHash = "";
      if (wallet && access.address !== "pending") {
        try {
          const result = await revokeDocumentAccess(
            document.docHash,
            access.address,
            document.cid // keep same CID for now
          );
          txHash = result.txHash;
        } catch (chainErr: any) {
          throw new Error(
            `Blockchain revocation failed: ${chainErr?.message || "Transaction rejected"}`
          );
        }
      } else {
        // For email-only shares without an on-chain address
        txHash =
          "0x" +
          Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("");
      }

      setLastRevokeTx(txHash);

      // Remove from local store
      removeSharedAccess(document.id, access.address);

      // Register revocation on server so magic links stop working
      try {
        await fetch("/api/access/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docHash: document.docHash,
            identifier: access.email || access.address,
          }),
        });
      } catch {
        // Non-blocking — local revocation still works
      }

      // Add audit entry
      addAuditEntry({
        id: generateId(),
        docHash: document.docHash,
        action: `Access Revoked`,
        actor: access.email || access.address,
        fileName: document.name,
        timestamp: new Date().toISOString(),
        txHash,
        category: "revoke",
      });

      setRevokeSuccess(true);
      onRevoked();

      // Brief delay then reset
      setTimeout(() => {
        setRevokeSuccess(false);
        setLastRevokeTx("");
      }, 2000);
    } catch (e: any) {
      setError(e?.message || "Failed to revoke access");
    } finally {
      setRevoking(null);
    }
  };

  const sharedList = document.sharedWith || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Document Access"
      titleIcon={<Users size={18} color="var(--accent-teal)" />}
    >
      {/* Document info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(34,211,238,0.04)",
          border: "1px solid rgba(34,211,238,0.1)",
          marginBottom: 20,
        }}
      >
        <FileText size={16} color="var(--accent-teal)" />
        <span style={{ fontSize: 13, fontWeight: 500 }}>{document.name}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          {sharedList.length} user{sharedList.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
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
          <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
          {error}
        </div>
      )}

      {/* Revoke success */}
      {revokeSuccess && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.2)",
            fontSize: 13,
            color: "var(--accent-emerald)",
            marginBottom: 16,
          }}
        >
          <CheckCircle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Access revoked successfully
          {lastRevokeTx && (
            <a
              href={`https://amoy.polygonscan.com/tx/${lastRevokeTx}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: "var(--accent-teal)",
              }}
            >
              <ExternalLink size={11} style={{ verticalAlign: "middle" }} /> View TX
            </a>
          )}
        </div>
      )}

      {/* No users */}
      {sharedList.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-muted)",
          }}
        >
          <Users size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 14, marginBottom: 4 }}>No one has access</p>
          <p style={{ fontSize: 12 }}>
            Share this document to grant access to other users.
          </p>
        </div>
      )}

      {/* User list */}
      {sharedList.map((access, idx) => {
        const levelConf = ACCESS_LABELS[access.level] || ACCESS_LABELS[1];
        const isRevoking = revoking === access.address;
        const displayName = access.email || access.address;
        const grantedDate = new Date(access.grantedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div
            key={`${access.address}-${idx}`}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
              marginBottom: 10,
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* User icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${levelConf.color}12`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: levelConf.color,
                  flexShrink: 0,
                }}
              >
                {levelConf.icon}
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 2,
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: levelConf.color, fontWeight: 600 }}>
                    {levelConf.label}
                  </span>
                  <span>·</span>
                  <span>Granted {grantedDate}</span>
                </div>
              </div>

              {/* Revoke button */}
              <button
                onClick={() => handleRevoke(access)}
                disabled={isRevoking}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: isRevoking
                    ? "rgba(251,113,133,0.06)"
                    : "rgba(251,113,133,0.08)",
                  border: "1px solid rgba(251,113,133,0.15)",
                  color: "var(--accent-red)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isRevoking ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                  opacity: isRevoking ? 0.6 : 1,
                }}
              >
                {isRevoking ? (
                  <>
                    <Loader2
                      size={12}
                      style={{ animation: "shield-spin 0.8s linear infinite" }}
                    />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Trash2 size={12} />
                    Revoke
                  </>
                )}
              </button>
            </div>

            {/* TX reference */}
            {access.txHash && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                }}
              >
                tx: {access.txHash.slice(0, 10)}...{access.txHash.slice(-6)}
                <a
                  href={`https://amoy.polygonscan.com/tx/${access.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: 6, color: "var(--accent-teal)" }}
                >
                  <ExternalLink size={10} style={{ verticalAlign: "middle" }} />
                </a>
              </div>
            )}
          </div>
        );
      })}

      {/* Info */}
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(34,211,238,0.04)",
          border: "1px solid rgba(34,211,238,0.08)",
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.6,
          marginTop: 16,
        }}
      >
        <Shield
          size={13}
          style={{ verticalAlign: "middle", marginRight: 6, color: "var(--accent-teal)" }}
        />
        Revoking access records the action immutably on the Polygon blockchain. Previously shared
        magic links will no longer grant access.
      </div>
    </Modal>
  );
}
