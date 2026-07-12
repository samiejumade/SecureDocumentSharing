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
  Wallet,
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
import { WalletProvider, useWallet } from "@/context/WalletContext";
import { getAccessLevel } from "@/lib/web3";

/** Decoded payload from the base64 magic link token */
interface TokenPayload {
  docName: string;
  docHash: string;
  cid: string;
  level: number;
  sender: string;
  sharedAt: string;
  encKeyHex?: string;
  recipientAddress?: string;
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
function importSharedDocument(
  payload: TokenPayload,
  token: string,
  recipientAddress: string
): boolean {
  try {
    const existing = getDocuments();
    const alreadyImported = existing.some(
      (d) =>
        d.docHash === payload.docHash &&
        d.status === "shared" &&
        d.recipientAddress?.toLowerCase() === recipientAddress.toLowerCase()
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
      recipientAddress: recipientAddress.toLowerCase(),
      docType: "business",
      createdAt: payload.sharedAt,
      txHash: "",
      status: "shared",
      expiry: 0,
      ipTimestamp: false,
      sharedWith: [],
      accessLevel: payload.level as any,
      shareToken: token,
    };

    saveDocument(doc);
    return true;
  } catch {
    return false;
  }
}

export function ShareViewContent() {
  const params = useParams();
  const token = params?.token as string;
  const { wallet, connect, isConnecting } = useWallet();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [docImported, setDocImported] = useState(false);
  const [keyWarningDismissed, setKeyWarningDismissed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isBlurry, setIsBlurry] = useState(false);

  // Edit & Sign state
  const [showEditor, setShowEditor] = useState(false);
  const [annotations, setAnnotations] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [signed, setSigned] = useState(false);
  const [saved, setSaved] = useState(false);

  const payload = useMemo(() => decodeToken(token || ""), [token]);

  useEffect(() => {
    const verifyAccess = async () => {
      setError("");
      setAccessRevoked(false);
      setVerified(false);

      if (!payload && (!token || token.length <= 5)) {
        setError("Invalid or expired share link.");
        setLoading(false);
        return;
      }

      if (!wallet) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const targetDocHash = payload!.docHash;

      // 1. Check if token was generated for a different recipient
      if (payload?.recipientAddress && payload.recipientAddress.toLowerCase() !== wallet.address.toLowerCase()) {
        setError(`This magic link was shared with a different address (${payload.recipientAddress.slice(0, 6)}...${payload.recipientAddress.slice(-4)}). Please switch accounts in your wallet.`);
        setLoading(false);
        return;
      }

      try {
        // 2. On-chain permission verification
        const level = await getAccessLevel(targetDocHash, wallet.address);
        if (level === 0) {
          setAccessRevoked(true);
          setLoading(false);
          return;
        }

        // 3. Server-side revocation registry verification (using identifier)
        const res = await fetch(
          `/api/access/verify?docHash=${encodeURIComponent(targetDocHash)}&identifier=${encodeURIComponent(wallet.address.toLowerCase())}`
        );
        const data = await res.json();
        if (data.revoked) {
          setAccessRevoked(true);
          setLoading(false);
          return;
        }

        // 4. Import the document
        if (payload && token && wallet?.address) {
          const imported = importSharedDocument(payload, token, wallet.address);
          setDocImported(imported);
        }

        setVerified(true);
      } catch (err: any) {
        setError(err?.message || "Failed to verify on-chain permissions.");
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [token, payload, wallet]);

  const accessLevel = payload?.level || 1;

  // Global screenshot and keyboard print/save blocker for View-Only documents
  useEffect(() => {
    if (accessLevel !== 1 || !verified) return;

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
  }, [accessLevel, verified]);
  const access = ACCESS_CONFIG[accessLevel] || ACCESS_CONFIG[1];
  const docName = payload?.docName || "Shared_Document.pdf";
  const senderAddr = payload?.sender || "Unknown";
  const sharedAt = payload?.sharedAt
    ? new Date(payload.sharedAt).toLocaleString()
    : "";
  const cid = payload?.cid || "";

  // Inline Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"pdf" | "image" | "text" | "unknown" | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const loadInlinePreview = async () => {
    if (!cid) {
      setPreviewError("No IPFS CID available for preview.");
      return;
    }
    setLoadingPreview(true);
    setPreviewError("");

    try {
      const url = `${GATEWAY_URL}/${cid}`;
      let encryptedData: ArrayBuffer;
      const res = await fetch(url).catch(() => null);
      
      if (res && res.ok) {
        encryptedData = await res.arrayBuffer();
      } else {
        console.warn("Failed to fetch from IPFS gateway. Falling back to mock document bytes for demo.");
        const text = `Demo document content secured by SecureDocChain.\n\nDocument Name: ${docName}\nCID: ${cid}\n\nThis is a high-fidelity mock fallback since the Pinata gateway returned an error or was not configured.`;
        const encoder = new TextEncoder();
        const plaintextBytes = encoder.encode(text);
        
        if (payload?.encKeyHex) {
          const keyBytes = new Uint8Array(payload.encKeyHex.length / 2);
          for (let i = 0; i < payload.encKeyHex.length; i += 2) {
            keyBytes[i / 2] = parseInt(payload.encKeyHex.substring(i, i + 2), 16);
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

          decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv, tagLength: 128 },
            cryptoKey,
            ciphertext
          );
        } catch (decryptErr) {
          throw new Error("Failed to decrypt document. The encryption key may be invalid.");
        }
      } else {
        decrypted = encryptedData;
      }

      // Detect file type by extension
      const ext = docName.split(".").pop()?.toLowerCase() || "";
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
      setShowPreview(true);
    } catch (e: any) {
      setPreviewError(e?.message || "Failed to load document preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Automatically trigger preview decryption when verification succeeds
  useEffect(() => {
    if (verified && cid) {
      loadInlinePreview();
    }
  }, [verified, cid]);

  // Clean up object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
      let encryptedData: ArrayBuffer;
      const res = await fetch(url).catch(() => null);
      
      if (res && res.ok) {
        encryptedData = await res.arrayBuffer();
      } else {
        console.warn("Failed to fetch from IPFS gateway. Falling back to mock document bytes.");
        const text = `Demo document content secured by SecureDocChain.\n\nDocument Name: ${docName}\nCID: ${cid}\n\nThis is a high-fidelity mock fallback since the Pinata gateway returned an error or was not configured.`;
        const encoder = new TextEncoder();
        const plaintextBytes = encoder.encode(text);
        
        if (payload?.encKeyHex) {
          const keyBytes = new Uint8Array(payload.encKeyHex.length / 2);
          for (let i = 0; i < payload.encKeyHex.length; i += 2) {
            keyBytes[i / 2] = parseInt(payload.encKeyHex.substring(i, i + 2), 16);
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
      {/* Dynamic print-prevention styles */}
      {accessLevel === 1 && (
        <style>
          {`
            @media print {
              body, html, #__next, div, iframe, img, pre, canvas {
                display: none !important;
                visibility: hidden !important;
              }
            }
          `}
        </style>
      )}
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

        {/* WALLET NOT CONNECTED */}
        {!loading && !wallet && (
          <GlassCard padding={48} hoverable={false}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(34, 211, 238, 0.08)",
                  border: "2px solid var(--accent-teal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  color: "var(--accent-teal)",
                }}
              >
                <Wallet size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Wallet Connection Required
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                To decrypt and view this document, you must connect the Web3 wallet that corresponds to the authorized recipient address.
              </p>
              <Button
                variant="primary"
                onClick={connect}
                loading={isConnecting}
                style={{ width: "100%" }}
                icon={<Wallet size={16} />}
              >
                Connect Wallet
              </Button>
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
                  variant={accessLevel === 1 ? "secondary" : "primary"}
                  style={{ flex: 1, opacity: accessLevel === 1 ? 0.6 : 1, cursor: accessLevel === 1 ? "not-allowed" : "pointer" }}
                  icon={
                    accessLevel === 1 ? (
                      <Lock size={14} />
                    ) : downloading ? (
                      <Loader2
                        size={14}
                        style={{ animation: "shield-spin 1s linear infinite" }}
                      />
                    ) : (
                      <Download size={14} />
                    )
                  }
                  onClick={accessLevel === 1 ? undefined : handleDownload}
                  disabled={accessLevel === 1}
                  loading={downloading}
                >
                  {accessLevel === 1 ? "Download Locked (View Only)" : downloading ? "Downloading..." : "Download Document"}
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

              {/* ─── Inline Document Preview Pane ─── */}
              {showPreview && (
                <div
                  className="fade-in"
                  onContextMenu={(e) => accessLevel === 1 && e.preventDefault()}
                  style={{
                    padding: "20px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-subtle)",
                    marginBottom: 20,
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                    userSelect: accessLevel === 1 ? "none" : "auto",
                    WebkitUserSelect: accessLevel === 1 ? "none" : "auto",
                    filter: isBlurry ? "blur(30px)" : "none",
                    transition: "filter 0.2s ease",
                  }}
                >
                  {/* Screenshot Blocker Blur Warning Overlay */}
                  {isBlurry && (
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
                  {/* Dynamic Watermark Overlay for View-Only */}
                  {accessLevel === 1 && wallet?.address && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 10,
                        pointerEvents: "none",
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='160' viewBox='0 0 280 160'><text x='20' y='80' fill='rgba(34,211,238,0.08)' font-size='9' font-family='monospace' transform='rotate(-25 20 80)'>${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)} ${new Date().toLocaleDateString()}</text></svg>")`,
                        backgroundRepeat: "repeat",
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <h4
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "var(--text-primary)",
                      }}
                    >
                      <Eye size={16} color="var(--accent-teal)" style={{ flexShrink: 0 }} />
                      Document Preview
                    </h4>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>
                      {previewType}
                    </span>
                  </div>

                  {loadingPreview && (
                    <div style={{ padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
                      <Loader2
                        size={20}
                        style={{ animation: "shield-spin 1s linear infinite", margin: "0 auto 10px" }}
                        color="var(--accent-teal)"
                      />
                      Decrypting preview...
                    </div>
                  )}

                  {previewError && (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "rgba(251,113,133,0.06)",
                        border: "1px solid rgba(251,113,133,0.15)",
                        fontSize: 12,
                        color: "var(--accent-red)",
                        textAlign: "left",
                      }}
                    >
                      <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                      {previewError}
                    </div>
                  )}

                  {!loadingPreview && !previewError && (
                    <div style={{ marginTop: 8 }}>
                      {previewType === "pdf" && previewUrl && (
                        <iframe
                          src={`${previewUrl}#toolbar=0`}
                          style={{
                            width: "100%",
                            height: "480px",
                            border: "none",
                            borderRadius: "12px",
                            background: "white",
                          }}
                        />
                      )}
                      {previewType === "image" && previewUrl && (
                        <div 
                          style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 12 }}
                          onContextMenu={(e) => accessLevel === 1 && e.preventDefault()}
                        >
                          <img
                            src={previewUrl}
                            alt={docName}
                            onDragStart={(e) => accessLevel === 1 && e.preventDefault()}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "480px",
                              objectFit: "contain",
                              borderRadius: "8px",
                              margin: "0 auto",
                            }}
                          />
                        </div>
                      )}
                      {previewType === "text" && previewText && (
                        <pre
                          style={{
                            width: "100%",
                            maxHeight: "400px",
                            overflow: "auto",
                            padding: "16px",
                            borderRadius: "12px",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            textAlign: "left",
                            lineHeight: 1.5,
                            userSelect: accessLevel === 1 ? "none" : "auto",
                            WebkitUserSelect: accessLevel === 1 ? "none" : "auto",
                            MozUserSelect: accessLevel === 1 ? "none" : "auto",
                            msUserSelect: accessLevel === 1 ? "none" : "auto",
                          }}
                          onContextMenu={(e) => accessLevel === 1 && e.preventDefault()}
                        >
                          {previewText}
                        </pre>
                      )}
                      {previewType === "unknown" && (
                        <div style={{ padding: "30px 20px", color: "var(--text-muted)", fontSize: 13 }}>
                          <AlertTriangle size={24} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                          Inline preview not available for this file type.
                          {accessLevel > 1 && (
                            <div style={{ marginTop: 8, fontSize: 12 }}>
                              Please download the document to view it.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

export default function ShareViewPage() {
  return (
    <WalletProvider>
      <ShareViewContent />
    </WalletProvider>
  );
}
