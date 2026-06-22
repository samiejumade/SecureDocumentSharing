"use client";

import { useState } from "react";
import { Send, Eye, FileText, Shield, CheckCircle, AlertTriangle, Mail, Copy, Check } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useWallet } from "@/context/WalletContext";
import { grantDocumentAccess } from "@/lib/web3";
import { addSharedAccess, addAuditEntry, generateId, type StoredDocument } from "@/lib/store";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: StoredDocument | null;
}

export default function ShareModal({ isOpen, onClose, document }: ShareModalProps) {
  const { wallet } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<1 | 2 | 3>(1);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  if (!document) return null;

  /**
   * Build a base64 token that the recipient page can decode.
   * Contains: documentName, docHash, accessLevel, senderAddress, sharedAt
   */
  function buildMagicToken(): string {
    const payload = {
      docName: document!.name,
      docHash: document!.docHash,
      cid: document!.cid,
      level: accessLevel,
      sender: wallet?.address || "unknown",
      sharedAt: new Date().toISOString(),
      // Include the AES key so the recipient can decrypt
      encKeyHex: document!.encKeyHex,
    };
    // URL-safe base64
    return btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  const handleShare = async () => {
    if (!recipientAddress && !recipientEmail) {
      setError("Please provide a wallet address or email");
      return;
    }

    setIsSharing(true);
    setError("");
    setEmailSent(false);
    setEmailError("");
    setMagicLink("");

    // Build token FIRST so it is always available even if the on-chain TX fails
    const token = buildMagicToken();
    const fullLink = `${window.location.origin}/share/${token}`;
    setMagicLink(fullLink);

    let currentTxHash = "";

    try {
      // If wallet is connected, do on-chain grant
      if (wallet && recipientAddress) {
        const result = await grantDocumentAccess(document.docHash, recipientAddress, accessLevel);
        currentTxHash = result.txHash;
      } else {
        // Simulated for email-only shares (would go through backend in production)
        currentTxHash =
          "0x" +
          Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("");
      }
      setTxHash(currentTxHash);

      // Update local store
      addSharedAccess(document.id, {
        address: recipientAddress || "pending",
        email: recipientEmail || undefined,
        level: accessLevel,
        grantedAt: new Date().toISOString(),
        txHash: currentTxHash,
      });

      // Add audit entry
      addAuditEntry({
        id: generateId(),
        docHash: document.docHash,
        action: `Access Granted — ${accessLevel === 1 ? "View" : accessLevel === 2 ? "Edit" : "Sign"}`,
        actor: recipientEmail || recipientAddress,
        fileName: document.name,
        timestamp: new Date().toISOString(),
        txHash: currentTxHash,
        category: "access",
      });

      // Send magic link email if email was provided
      if (recipientEmail) {
        try {
          const res = await fetch("/api/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientEmail,
              documentName: document.name,
              accessLevel,
              token,
              senderAddress: wallet?.address || "Unknown",
            }),
          });
          const data = await res.json();
          if (data.success) {
            setEmailSent(true);
          } else {
            setEmailError(data.error || "Email delivery failed");
          }
        } catch (emailErr: any) {
          setEmailError(emailErr?.message || "Email delivery failed");
          // Continue — the on-chain grant already succeeded
        }
      }

      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        setRecipientAddress("");
        setRecipientEmail("");
        setAccessLevel(1);
        setTxHash("");
        setEmailSent(false);
        setEmailError("");
        setMagicLink("");
        setLinkCopied(false);
        onClose();
      }, emailError ? 8000 : 3500); // keep open longer if email failed
    } catch (e: any) {
      // TX failed — keep magic link visible so sender can share manually
      setError(e?.message || "Transaction failed. Share via the magic link below.");
    } finally {
      setIsSharing(false);
    }
  };

  const levels = [
    { value: 1 as const, label: "View Only", icon: <Eye size={14} />, desc: "Read-only access" },
    { value: 2 as const, label: "Edit", icon: <FileText size={14} />, desc: "Can annotate" },
    { value: 3 as const, label: "Full Access", icon: <Shield size={14} />, desc: "Can sign & modify" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Document Securely"
      titleIcon={<Send size={18} color="var(--accent-teal)" />}
    >
      {!shareSuccess ? (
        <>
          {/* Document being shared */}
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
          </div>

          {/* Recipient wallet address */}
          <Input
            label="Recipient Wallet Address"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />

          {/* Recipient email */}
          <Input
            label="Recipient Email (for Magic Link)"
            placeholder="colleague@company.com"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />

          {/* Access Level */}
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Access Level
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {levels.map((lvl) => (
              <button
                key={lvl.value}
                onClick={() => setAccessLevel(lvl.value)}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background:
                    accessLevel === lvl.value ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    accessLevel === lvl.value ? "rgba(34,211,238,0.25)" : "var(--border-subtle)"
                  }`,
                  color: accessLevel === lvl.value ? "var(--accent-teal)" : "var(--text-secondary)",
                }}
              >
                {lvl.icon}
                <span style={{ fontWeight: 600 }}>{lvl.label}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{lvl.desc}</span>
              </button>
            ))}
          </div>

          {/* Info note */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(34,211,238,0.04)",
              border: "1px solid rgba(34,211,238,0.08)",
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            <Shield
              size={13}
              style={{ verticalAlign: "middle", marginRight: 6, color: "var(--accent-teal)" }}
            />
            Access will be anchored immutably on the Polygon blockchain.
            {recipientEmail ? (
              <>
                {" "}
                <Mail size={13} style={{ verticalAlign: "middle", marginRight: 4, color: "var(--accent-copper)" }} />
                A magic link email will be sent to <strong>{recipientEmail}</strong>.
              </>
            ) : (
              " The recipient gets a secure magic link — no wallet required."
            )}
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
                marginBottom: 12,
              }}
            >
              <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
              {error}
            </div>
          )}

          {/* TX failed — show copyable magic link so sender can share manually */}
          {error && magicLink && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(251,191,36,0.05)",
                border: "1px solid rgba(251,191,36,0.2)",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24", marginBottom: 6 }}>
                Share manually via magic link:
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  wordBreak: "break-all",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 6,
                  padding: "6px 8px",
                  fontFamily: "monospace",
                  marginBottom: 8,
                  lineHeight: 1.5,
                }}
              >
                {magicLink}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(magicLink).then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2500);
                  });
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 8,
                  background: linkCopied ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${linkCopied ? "rgba(52,211,153,0.25)" : "var(--border-subtle)"}`,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: linkCopied ? "var(--accent-emerald)" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
              >
                {linkCopied ? <Check size={13} /> : <Copy size={13} />}
                {linkCopied ? "Copied!" : "Copy Magic Link"}
              </button>
            </div>
          )}

          {/* Submit */}
          <Button
            variant="primary"
            loading={isSharing}
            style={{ width: "100%" }}
            onClick={handleShare}
            icon={<Send size={14} />}
          >
            Grant Secure Access
          </Button>
        </>
      ) : (
        /* Success state */
        <div className="fade-in" style={{ textAlign: "center", padding: "20px 0" }}>
          <div className="success-circle" style={{ marginBottom: 20 }}>
            <CheckCircle size={32} color="var(--accent-emerald)" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Granted!</h3>

          {emailSent && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.15)",
                marginBottom: 12,
                fontSize: 13,
                color: "var(--accent-teal)",
              }}
            >
              <Mail size={14} />
              Magic link emailed successfully!
            </div>
          )}

          {/* Email failure fallback — show copyable link */}
          {emailError && magicLink && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(251,113,133,0.06)",
                border: "1px solid rgba(251,113,133,0.2)",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--accent-red)",
                  marginBottom: 8,
                }}
              >
                <AlertTriangle size={14} />
                Email delivery failed — share this link manually
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  wordBreak: "break-all",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontFamily: "monospace",
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                {magicLink}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(magicLink).then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2500);
                  });
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: linkCopied ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${linkCopied ? "rgba(52,211,153,0.25)" : "var(--border-subtle)"}`,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: linkCopied ? "var(--accent-emerald)" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
              >
                {linkCopied ? <Check size={13} /> : <Copy size={13} />}
                {linkCopied ? "Copied!" : "Copy Magic Link"}
              </button>
            </div>
          )}

          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
            {emailSent
              ? "A secure magic link has been sent to"
              : "Access has been granted to"}
          </p>
          <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {recipientEmail || recipientAddress}
          </p>
          {txHash && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, fontFamily: "monospace" }}>
              tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
