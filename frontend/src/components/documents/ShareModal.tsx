"use client";

import { useState, useEffect } from "react";
import { Send, Eye, FileText, Shield, CheckCircle, AlertTriangle, Mail, Copy, Check } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { grantDocumentAccess, batchGrantDocumentAccess } from "@/lib/web3";
import { addSharedAccess, addAuditEntry, generateId, type StoredDocument } from "@/lib/store";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: StoredDocument | null;
}

interface RecipientItem {
  id: string;
  email: string;
  address: string;
  level: 1 | 2 | 3;
}

export default function ShareModal({ isOpen, onClose, document }: ShareModalProps) {
  const { wallet } = useWallet();
  const { user } = useAuth();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<1 | 2 | 3>(1);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [recipientsSnapshot, setRecipientsSnapshot] = useState<RecipientItem[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Clean up and reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setRecipientAddress("");
      setRecipientEmail("");
      setAccessLevel(1);
      setRecipients([]);
      setRecipientsSnapshot([]);
      setIsSharing(false);
      setShareSuccess(false);
      setError("");
      setTxHash("");
      setEmailSent(false);
      setEmailError("");
      setMagicLink("");
      setLinkCopied(false);
    }
  }, [isOpen]);

  if (!document) return null;

  const readBindings = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("sdc_email_bindings");
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  };

  const handleAddRecipient = () => {
    if (!recipientAddress) {
      setError("Recipient Wallet Address is mandatory.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress.trim())) {
      setError("Recipient Wallet Address must be a valid 42-character Hex address starting with 0x.");
      return;
    }
    if (!recipientEmail) {
      setError("Recipient Email is mandatory.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    const emailKey = recipientEmail.toLowerCase().trim();
    const targetAddress = recipientAddress.toLowerCase().trim();

    // Check duplication in the list itself
    if (recipients.some(r => r.email === emailKey || r.address === targetAddress)) {
      setError("This collaborator email or wallet address is already added to the batch list.");
      return;
    }

    const bindings = readBindings();

    // Check 1: Is this email already bound to a different wallet?
    const existingBinding = bindings[emailKey];
    if (existingBinding && existingBinding.toLowerCase() !== targetAddress) {
      setError(`Security Validation: Email is already bound to wallet address: [${existingBinding}].`);
      return;
    }

    // Check 2: Is this wallet already bound to a different email?
    const boundEmail = Object.keys(bindings).find(
      (k) => bindings[k].toLowerCase() === targetAddress
    );
    if (boundEmail && boundEmail.toLowerCase().trim() !== emailKey) {
      setError(`Security Validation: The wallet address is already bound to a different email: [${boundEmail}].`);
      return;
    }

    setRecipients(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        email: emailKey,
        address: targetAddress,
        level: accessLevel
      }
    ]);

    // Clear inputs for the next entry
    setRecipientEmail("");
    setRecipientAddress("");
    setAccessLevel(1);
    setError("");
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const handleBatchShare = async () => {
    if (recipients.length === 0) {
      setError("Please add at least one recipient.");
      return;
    }

    setIsSharing(true);
    setError("");
    setEmailSent(false);
    setEmailError("");
    setTxHash("");
    setShareSuccess(false);

    // Save snapshot of recipients for success screen visualization
    setRecipientsSnapshot(recipients);

    const addresses = recipients.map(r => r.address);
    const levels = recipients.map(r => r.level);

    let currentTxHash = "";

    try {
      if (wallet) {
        const result = await batchGrantDocumentAccess(document.docHash, addresses, levels);
        currentTxHash = result.txHash;
      } else {
        throw new Error("Your wallet is not connected. Wallet connection is mandatory to grant access on-chain.");
      }
      setTxHash(currentTxHash);

      const emailFailures: string[] = [];

      for (const r of recipients) {
        // Build unique token for each recipient
        const payload = {
          docName: document.name,
          docHash: document.docHash,
          cid: document.cid,
          level: r.level,
          sender: wallet.address,
          senderEmail: user?.email || "",
          sharedAt: new Date().toISOString(),
          encKeyHex: document.encKeyHex,
          recipientAddress: r.address,
        };

        const token = btoa(JSON.stringify(payload))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        // Update local store
        addSharedAccess(document.id, {
          address: r.address,
          email: r.email,
          level: r.level,
          grantedAt: new Date().toISOString(),
          txHash: currentTxHash,
        });

        // Save email binding locally for resolution
        try {
          const currentBindings = readBindings();
          currentBindings[r.email] = r.address;
          localStorage.setItem("sdc_email_bindings", JSON.stringify(currentBindings));
        } catch {}

        // Add audit entry
        addAuditEntry({
          id: generateId(),
          docHash: document.docHash,
          action: `Access Granted (Batch) — ${r.level === 1 ? "View" : r.level === 2 ? "Edit" : "Sign"}`,
          actor: r.email,
          fileName: document.name,
          timestamp: new Date().toISOString(),
          txHash: currentTxHash,
          category: "access",
        });

        // Send email notifier
        try {
          const res = await fetch("/api/share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientEmail: r.email,
              documentName: document.name,
              accessLevel: r.level,
              token,
              senderAddress: wallet.address,
            }),
          });
          const data = await res.json();
          if (!data.success) {
            emailFailures.push(`${r.email}: ${data.error || "delivery failure"}`);
          }
        } catch (err: any) {
          emailFailures.push(`${r.email}: ${err.message || "network error"}`);
        }
      }

      if (emailFailures.length > 0) {
        setEmailError(`Email delivery failed for some recipients: ${emailFailures.join(", ")}`);
      } else {
        setEmailSent(true);
      }

      setShareSuccess(true);
      setRecipients([]);
      
      if (emailFailures.length === 0) {
        setTimeout(() => {
          onClose();
        }, 4000);
      }
    } catch (e: any) {
      setError(e?.message || "Batch access transaction failed.");
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
              marginBottom: 16,
            }}
          >
            <FileText size={16} color="var(--accent-teal)" />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{document.name}</span>
          </div>

          {/* Add Recipient Form section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, border: "1px solid rgba(255,255,255,0.05)", padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.01)", marginBottom: 16 }}>
            <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--accent-teal)", margin: 0 }}>
              Add Collaborator
            </h4>
            
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
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Access Level
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {levels.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setAccessLevel(lvl.value)}
                    style={{
                      flex: 1,
                      padding: "8px 6px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background:
                        accessLevel === lvl.value ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${accessLevel === lvl.value ? "rgba(34,211,238,0.25)" : "var(--border-subtle)"}`,
                      color: accessLevel === lvl.value ? "var(--accent-teal)" : "var(--text-secondary)",
                    }}
                  >
                    {lvl.icon}
                    <span style={{ fontWeight: 600, fontSize: 10 }}>{lvl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddRecipient}
              type="button"
              style={{
                width: "100%",
                background: "rgba(34, 211, 238, 0.08)",
                border: "1px dashed rgba(34, 211, 238, 0.3)",
                borderRadius: "10px",
                color: "var(--accent-teal)",
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34, 211, 238, 0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(34, 211, 238, 0.08)")}
            >
              + Add to Share List
            </button>
          </div>

          {/* Recipients Batch List */}
          {recipients.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Batch Recipients List ({recipients.length})
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: "140px",
                  overflowY: "auto",
                  background: "rgba(0,0,0,0.25)",
                  borderRadius: 12,
                  padding: 8,
                }}
              >
                {recipients.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      borderRadius: 8,
                      padding: "6px 10px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{r.email}</span>
                      <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--text-muted)" }}>
                        {r.address.slice(0, 8)}...{r.address.slice(-6)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background:
                            r.level === 1
                              ? "rgba(34,211,238,0.08)"
                              : r.level === 2
                              ? "rgba(52,211,153,0.08)"
                              : "rgba(168,85,247,0.08)",
                          color: r.level === 1 ? "var(--accent-teal)" : r.level === 2 ? "var(--accent-emerald)" : "#a855f7",
                        }}
                      >
                        {r.level === 1 ? "View" : r.level === 2 ? "Edit" : "Sign"}
                      </span>
                      <button
                        onClick={() => handleRemoveRecipient(r.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--accent-red)",
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 700,
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info note */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(34,211,238,0.02)",
              border: "1px solid rgba(34,211,238,0.06)",
              fontSize: 11,
              color: "var(--text-secondary)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            <Shield
              size={12}
              style={{ verticalAlign: "middle", marginRight: 6, color: "var(--accent-teal)" }}
            />
            Sponsor gas will be paid once for all batch recipients. Magic links will be distributed automatically via email.
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(251,113,133,0.08)",
                border: "1px solid rgba(251,113,133,0.2)",
                fontSize: 12,
                color: "var(--accent-red)",
                marginBottom: 12,
              }}
            >
              <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            variant="primary"
            loading={isSharing}
            disabled={recipients.length === 0}
            style={{ width: "100%" }}
            onClick={handleBatchShare}
            icon={<Send size={14} />}
          >
            {isSharing ? "Granting Batch Access..." : `Grant Access (${recipients.length} Collaborator${recipients.length !== 1 ? "s" : ""})`}
          </Button>
        </>
      ) : (
        /* Success state */
        <div className="fade-in" style={{ textAlign: "center", padding: "10px 0" }}>
          <div className="success-circle" style={{ marginBottom: 16 }}>
            <CheckCircle size={32} color="var(--accent-emerald)" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Granted!</h3>

          {emailSent && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.15)",
                marginBottom: 12,
                fontSize: 12,
                color: "var(--accent-teal)",
              }}
            >
              <Mail size={12} />
              Magic links emailed successfully!
            </div>
          )}

          {emailError && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(251,113,133,0.06)",
                border: "1px solid rgba(251,113,133,0.2)",
                marginBottom: 12,
                fontSize: 11,
                color: "var(--accent-red)",
                textAlign: "left",
              }}
            >
              {emailError}
            </div>
          )}

          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
            Collaborators granted access on Polygon:
          </p>

          <div
            style={{
              maxHeight: "120px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginBottom: 16,
              background: "rgba(0,0,0,0.2)",
              borderRadius: 10,
              padding: "6px 10px",
            }}
          >
            {recipientsSnapshot.map((r, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{r.email}</span>
                <span style={{ color: "var(--accent-teal)" }}>
                  {r.level === 1 ? "View" : r.level === 2 ? "Edit" : "Sign"}
                </span>
              </div>
            ))}
          </div>

          {txHash && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 12 }}>
              tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}

          <Button
            variant="secondary"
            style={{ width: "100%", marginTop: 12 }}
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
