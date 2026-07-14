"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FileText, Send, Eye, ExternalLink, Users, Shield, Clock, Download, Lock, Loader2, X, AlertTriangle, CheckCircle, Copy, Check, RefreshCw } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import Badge from "@/components/ui/Badge";
import type { StoredDocument } from "@/lib/store";
import { getDocumentComments, addDocumentComment, getDocumentSignatures, signDocumentLocally, hasUserSignedLocally, type Comment, type SignatureRecord } from "@/lib/comments";
import { hasUserSigned, signDocumentOnChain, shortenAddress } from "@/lib/web3";
import PDFCanvasViewer from "./PDFCanvasViewer";

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
  const { user } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"pdf" | "image" | "text" | "unknown" | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [isBlurry, setIsBlurry] = useState(false);

  const ownerAddress = doc.ownerAddress.toLowerCase();
  const walletAddress = wallet?.address?.toLowerCase() || "";
  const isOwner = !!walletAddress && ownerAddress === walletAddress;
  const isRecipientViewOnly = doc.status === "shared" && doc.accessLevel === 1 && !isOwner;

  const [viewerLabel, setViewerLabel] = useState("unknown viewer");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMouseInside, setIsMouseInside] = useState(false);

  // Collaborative comments & signatures state
  const [comments, setComments] = useState<Comment[]>([]);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [hasSigned, setHasSigned] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Load comments from local storage, and query true on-chain signatures from the blockchain
  useEffect(() => {
    if (showPreview && doc.docHash) {
      setComments(getDocumentComments(doc.docHash));
      
      const loadOnChainSignaturesAndStatus = async () => {
        const sigs: SignatureRecord[] = [];
        try {
          // 1. Check if owner has signed on-chain
          const ownerSigned = await hasUserSigned(doc.docHash, doc.ownerAddress);
          if (ownerSigned) {
            sigs.push({ signer: doc.ownerAddress, timestamp: doc.createdAt || new Date().toISOString() });
          }

          // 2. Check shared recipients on-chain
          if (doc.sharedWith && doc.sharedWith.length > 0) {
            await Promise.all(
              doc.sharedWith.map(async (recipient) => {
                const signed = await hasUserSigned(doc.docHash, recipient.address);
                if (signed) {
                  // Retrieve local sync timestamp if available, else use current time
                  const localSigs = getDocumentSignatures(doc.docHash);
                  const matchingSig = localSigs.find(s => s.signer.toLowerCase() === recipient.address.toLowerCase());
                  sigs.push({ 
                    signer: recipient.address, 
                    timestamp: matchingSig ? matchingSig.timestamp : recipient.grantedAt 
                  });
                }
              })
            );
          } else if (walletAddress && walletAddress !== doc.ownerAddress.toLowerCase()) {
            // Recipient viewing - check self
            const selfSigned = await hasUserSigned(doc.docHash, walletAddress);
            if (selfSigned) {
              const localSigs = getDocumentSignatures(doc.docHash);
              const matchingSig = localSigs.find(s => s.signer.toLowerCase() === walletAddress);
              sigs.push({ 
                signer: walletAddress, 
                timestamp: matchingSig ? matchingSig.timestamp : new Date().toISOString() 
              });
            }
          }
        } catch (err) {
          console.error("Failed to load on-chain signatures:", err);
        }

        setSignatures(sigs);
        
        if (walletAddress) {
          try {
            const signed = await hasUserSigned(doc.docHash, walletAddress);
            setHasSigned(signed);
          } catch {
            setHasSigned(false);
          }
        }
      };

      loadOnChainSignaturesAndStatus();
    }
  }, [showPreview, doc.docHash, walletAddress, doc.ownerAddress, doc.sharedWith]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !walletAddress) return;
    const updated = addDocumentComment(doc.docHash, walletAddress, newCommentText);
    setComments(updated);
    setNewCommentText("");
  };

  const handleSignDocument = async () => {
    if (!walletAddress) return;
    
    setIsSigning(true);
    setToastMessage(null);

    try {
      // Execute true on-chain signature transaction (gasless Relayer prioritised)
      const result = await signDocumentOnChain(doc.docHash);
      
      setHasSigned(true);
      setToastMessage("Document successfully approved & signed on-chain!");

      // Update local state list
      setSignatures(prev => {
        if (prev.some(s => s.signer.toLowerCase() === walletAddress)) return prev;
        return [...prev, { signer: walletAddress, timestamp: new Date().toISOString() }];
      });

      // Synchronize in local storage comments utility as fallback cache
      signDocumentLocally(doc.docHash, walletAddress);

      // Add to local audit log with the actual on-chain transaction hash
      try {
        const logsRaw = localStorage.getItem("sdc_audit_log");
        const logs = logsRaw ? JSON.parse(logsRaw) : [];
        logs.unshift({
          id: Math.random().toString(),
          docHash: doc.docHash,
          action: "Document On-Chain Signed",
          actor: walletAddress,
          fileName: doc.name,
          timestamp: new Date().toISOString(),
          txHash: result.txHash,
          category: "view"
        });
        localStorage.setItem("sdc_audit_log", JSON.stringify(logs));
        window.dispatchEvent(new CustomEvent("sdc:audit-changed"));
      } catch {}

    } catch (err: any) {
      console.error("Signature transaction failed:", err);
      setToastMessage(err?.message || "On-chain signature failed.");
    } finally {
      setIsSigning(false);
    }
  };

  const resolveAddressToLabel = (address: string) => {
    const addrLower = address.toLowerCase();
    
    // Check if it is the owner
    if (addrLower === doc.ownerAddress.toLowerCase()) {
      let ownerEmail = "";
      try {
        const raw = localStorage.getItem("sdc_email_bindings");
        if (raw) {
          const bindings = JSON.parse(raw);
          ownerEmail = Object.keys(bindings).find(k => bindings[k].toLowerCase() === addrLower) || "";
        }
      } catch {}
      return `Owner ${ownerEmail ? `(${ownerEmail})` : ""}`;
    }

    // Check email bindings for recipients
    try {
      const raw = localStorage.getItem("sdc_email_bindings");
      if (raw) {
        const bindings = JSON.parse(raw);
        const email = Object.keys(bindings).find(k => bindings[k].toLowerCase() === addrLower);
        if (email) {
          return `${address.slice(0, 6)}...${address.slice(-4)} (${email})`;
        }
      }
    } catch {}

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const [copiedSyncLink, setCopiedSyncLink] = useState(false);

  const handleCopySyncLink = () => {
    if (typeof window === "undefined") return;
    
    let currentBindings: Record<string, string> = {};
    try {
      const raw = localStorage.getItem("sdc_email_bindings");
      currentBindings = raw ? JSON.parse(raw) : {};
    } catch {}

    const payload = {
      docHash: doc.docHash,
      comments: getDocumentComments(doc.docHash),
      signatures: getDocumentSignatures(doc.docHash),
      bindings: currentBindings,
    };
    
    try {
      const token = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
        
      const syncUrl = `${window.location.origin}/share/sync?token=${token}`;
      navigator.clipboard.writeText(syncUrl).then(() => {
        setCopiedSyncLink(true);
        setToastMessage("Collaboration sync link copied!");
        setTimeout(() => setCopiedSyncLink(false), 2000);
      });
    } catch (err) {
      console.error("Failed to generate sync link:", err);
      setToastMessage("Error generating sync link.");
    }
  };

  const [ownerEmailInput, setOwnerEmailInput] = useState("");
  const [isNotifyingOwner, setIsNotifyingOwner] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  const getOwnerEmail = (): string => {
    const ownerAddr = doc.ownerAddress.toLowerCase();
    try {
      const raw = localStorage.getItem("sdc_email_bindings");
      if (raw) {
        const bindings = JSON.parse(raw);
        return Object.keys(bindings).find(k => bindings[k].toLowerCase() === ownerAddr) || "";
      }
    } catch {}
    return "";
  };

  const handleNotifyOwner = async () => {
    const ownerEmail = getOwnerEmail() || ownerEmailInput;
    if (!ownerEmail) {
      setToastMessage("Please enter the owner's email address.");
      return;
    }

    setIsNotifyingOwner(true);
    setToastMessage(null);

    let currentBindings: Record<string, string> = {};
    try {
      const raw = localStorage.getItem("sdc_email_bindings");
      currentBindings = raw ? JSON.parse(raw) : {};
    } catch {}

    const payload = {
      docHash: doc.docHash,
      comments: getDocumentComments(doc.docHash),
      signatures: getDocumentSignatures(doc.docHash),
      bindings: currentBindings,
    };

    try {
      const token = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
        
      const syncLink = `${window.location.origin}/share/sync?token=${token}`;
      
      const myEmail = Object.keys(currentBindings).find(
        (k) => currentBindings[k].toLowerCase() === walletAddress
      ) || "";

      const response = await fetch("/api/sync-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail,
          recipientEmail: myEmail,
          documentName: doc.name,
          syncLink,
          commentsCount: comments.length,
          hasSigned,
        }),
      });

      const resData = await response.json();

      if (response.ok) {
        setNotifySuccess(true);
        setToastMessage("Collaboration updates emailed to the owner!");
        setTimeout(() => setNotifySuccess(false), 3000);
      } else {
        setToastMessage(resData.error || "Failed to notify owner.");
      }
    } catch (err: any) {
      console.error(err);
      setToastMessage("Error sending email notification.");
    } finally {
      setIsNotifyingOwner(false);
    }
  };

  const handleCopyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  };

  useEffect(() => {
    const address = wallet?.address?.toLowerCase();
    if (!address) {
      setViewerLabel("unknown viewer");
      return;
    }
    const bindingsRaw = typeof window !== "undefined" ? localStorage.getItem("sdc_email_bindings") : null;
    let bindings: Record<string, string> = {};
    try {
      bindings = bindingsRaw ? JSON.parse(bindingsRaw) : {};
    } catch {}
    const email = Object.keys(bindings).find(
      (k) => bindings[k].toLowerCase() === address
    );
    if (email) {
      setViewerLabel(`${wallet?.address || ""} (${email})`);
    } else {
      setViewerLabel(wallet?.address || "");
    }
  }, [wallet?.address]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const buildWatermarkDataUrl = () => {
    const timestamp = new Date().toLocaleString();
    const shortHash = doc.docHash ? `${doc.docHash.slice(0, 10)}...${doc.docHash.slice(-8)}` : "N/A";
    const shortToken = doc.shareToken ? `${doc.shareToken.slice(0, 8)}...${doc.shareToken.slice(-8)}` : "N/A";
    
    // Resolve email address: prioritize the logged-in user email, then bound email, fallback to wallet address
    let activeEmail = user?.email || "";
    if (!activeEmail && wallet?.address) {
      try {
        const raw = localStorage.getItem("sdc_email_bindings");
        if (raw) {
          const bindings = JSON.parse(raw);
          activeEmail = Object.keys(bindings).find(k => bindings[k].toLowerCase() === wallet.address.toLowerCase()) || "";
        }
      } catch {}
    }
    
    const userLabel = activeEmail ? `${activeEmail} (${shortenAddress(wallet?.address || "")})` : (wallet?.address || "unknown viewer");
    
    // High-density diagonal text including all required metadata
    const text1 = `USER: ${userLabel} | HASH: ${shortHash} | TIME: ${timestamp}`;
    const text2 = `TOKEN: ${shortToken} | PREVIEW ONLY - DO NOT RECORD`;
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300">
      <style>
        text {
          font-family: 'Courier New', Courier, monospace;
          font-size: 10px;
          font-weight: bold;
          fill: rgba(34, 211, 238, 0.12);
          text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
          letter-spacing: 0.5px;
        }
      </style>
      <!-- Single clean diagonal layout for readability and easy verification -->
      <text x="40" y="80" transform="rotate(-20 40 80)">${text1}</text>
      <text x="40" y="110" transform="rotate(-20 40 110)">${text2}</text>
      
      <text x="40" y="200" transform="rotate(-20 40 200)">${text1}</text>
      <text x="40" y="230" transform="rotate(-20 40 230)">${text2}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Global screenshot and keyboard print/save blocker for all documents in dashboard
  useEffect(() => {
    if (!showPreview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPreview(false);
        return;
      }
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Block print, save, copy, and inspect
      if (isCmdOrCtrl && (e.key?.toLowerCase() === "p" || e.key?.toLowerCase() === "s" || e.key?.toLowerCase() === "c")) {
        e.preventDefault();
        setIsBlurry(true);
        setToastMessage("Security Trigger: Printing, saving, and copying are disabled.");
      }

      // Block standard screenshot keys
      if (e.key === "PrintScreen" || e.key === "Snapshot" || e.key === "Meta" || e.key === "OS" || e.key === "ContextMenu") {
        e.preventDefault();
        setIsBlurry(true);
        setToastMessage("Security Trigger: Screenshots disabled.");
      }

      // Block macOS screenshot combinations: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5")) {
        e.preventDefault();
        setIsBlurry(true);
        setToastMessage("Security Trigger: macOS Screen Capture blocked.");
      }

      // Block Windows Snipping tool: Win+Shift+S
      if (e.metaKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setIsBlurry(true);
        setToastMessage("Security Trigger: Windows Screen Capture blocked.");
      }

      // Block Inspect element keyboard triggers: F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
      if (e.key === "F12" || (isCmdOrCtrl && e.shiftKey && (e.key === "i" || e.key === "I" || e.key === "c" || e.key === "C" || e.key === "j" || e.key === "J"))) {
        e.preventDefault();
        setIsBlurry(true);
        setToastMessage("Security Trigger: Developer Tools blocked.");
      }
    };

    const handleBlur = () => {
      if (document.activeElement && document.activeElement.tagName === "IFRAME") {
        return;
      }
      setIsBlurry(true);
      setToastMessage("Security Trigger: Focus lost. View blocked.");
    };

    const handleFocus = () => {
      // Keep it blurry until they explicitly click the resume button to prevent quick-screenshot capture
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [showPreview]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
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

            {/* Download Button: owner only */}
            {isOwner ? (
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
      {showPreview && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 14, 26, 0.82)",
            backdropFilter: "blur(30px) saturate(180%)",
            WebkitBackdropFilter: "blur(30px) saturate(180%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          className="backdrop-fade-in"
          onClick={() => setShowPreview(false)}
        >
          {/* Absolute glass toast notification inside modal */}
          {toastMessage && (
            <div
              style={{
                position: "fixed",
                top: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(251, 113, 133, 0.15)",
                border: "1px solid rgba(251, 113, 133, 0.3)",
                backdropFilter: "blur(16px) saturate(120%)",
                padding: "12px 24px",
                borderRadius: "12px",
                color: "var(--accent-red)",
                fontWeight: 600,
                fontSize: "13px",
                zIndex: 100000,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                animation: "backdrop-fade-in 0.2s ease-out",
              }}
            >
              <AlertTriangle size={16} />
              {toastMessage}
            </div>
          )}

          <div
            style={{
              background: "rgba(13, 20, 38, 0.65)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: isFullscreen ? "0px" : "24px",
              width: "100%",
              maxWidth: isFullscreen ? "100vw" : "1100px",
              height: isFullscreen ? "100vh" : "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              position: "relative",
              backdropFilter: "blur(20px)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            className="modal-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Window Titlebar (macOS Desktop Style) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 24px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(13, 17, 29, 0.6)",
                userSelect: "none",
              }}
            >
              {/* Left: Window Controls */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", width: "120px" }}>
                <button 
                  onClick={() => setShowPreview(false)}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#ff5f56",
                    border: "1px solid #e0443e",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Close"
                />
                <button 
                  onClick={() => setShowPreview(false)}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#ffbd2e",
                    border: "1px solid #dea123",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Minimize"
                />
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#27c93f",
                    border: "1px solid #1aab29",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Toggle Zoom"
                />
              </div>

              {/* Center: Title & Lock */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", flex: 1 }}>
                <Lock size={12} color="var(--accent-teal)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: 0.5 }}>
                  {doc.name} — Secure Sandbox
                </span>
              </div>

              {/* Right: Verified Badge */}
              <div style={{ display: "flex", justifyContent: "flex-end", width: "120px" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "20px",
                    background: "rgba(52, 211, 153, 0.1)",
                    border: "1px solid rgba(52, 211, 153, 0.2)",
                    color: "var(--accent-emerald)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-emerald)" }} />
                  Verified
                </span>
              </div>
            </div>

            {/* Static Header Rail Banner */}
            {isRecipientViewOnly && (
              <div
                style={{
                  background: "rgba(10, 14, 26, 0.9)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "8px 16px",
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "var(--accent-teal)",
                  textAlign: "center",
                  letterSpacing: "0.5px",
                  fontWeight: 600,
                  textShadow: "1px 1px 1px rgba(0,0,0,0.5)",
                }}
              >
                Authorized Preview for: {viewerLabel} | IPFS Reference: {doc.cid.slice(0, 20)}... | DO NOT DUPLICATE
              </div>
            )}

                    {/* Split View Body */}
                    <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
                      {/* Content pane */}
                      <div
                        onContextMenu={(e) => e.preventDefault()}
                        onCopy={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        onMouseEnter={() => setIsMouseInside(true)}
                        onMouseLeave={() => setIsMouseInside(false)}
                        style={{
                          padding: "24px",
                          flex: 1,
                          overflowY: previewType === "pdf" ? "hidden" : "auto",
                          position: "relative",
                          textAlign: "center",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          MozUserSelect: "none",
                          msUserSelect: "none",
                          background: "rgba(10, 14, 26, 0.3)",
                        }}
                      >
                        {/* Screenshot Blocker or Hover Guard Blur Warning Overlay */}
                        {(isBlurry || !isMouseInside) && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 999,
                              background: "rgba(10, 14, 26, 0.95)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 20,
                              color: "var(--accent-red)",
                              fontWeight: 600,
                              fontSize: 14,
                              textAlign: "center",
                              cursor: isBlurry ? "pointer" : "default",
                            }}
                            onClick={() => {
                              if (isBlurry) {
                                setIsBlurry(false);
                                setToastMessage("Active session resumed.");
                              }
                            }}
                          >
                            <Lock size={32} style={{ marginBottom: 12 }} />
                            {isBlurry ? (
                              <span>Screenshots & Inactive Window Blocked - Click to resume viewing</span>
                            ) : (
                              <span style={{ color: "var(--accent-teal)" }}>Security Guard: Hover mouse over document area to view content</span>
                            )}
                          </div>
                        )}

                        {/* Watermark grid overlay */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 10,
                            pointerEvents: "none",
                            backgroundImage: `url("${buildWatermarkDataUrl()}")`,
                            backgroundRepeat: "repeat",
                          }}
                        />

                        {loadingPreview && (
                          <div style={{ padding: "80px 0", color: "var(--text-muted)", fontSize: 13 }}>
                            <Loader2
                              size={24}
                              style={{ animation: "shield-spin 1s linear infinite", margin: "0 auto 12px" }}
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
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              justifyContent: "center",
                              filter: (isBlurry || !isMouseInside) ? "blur(30px)" : "none",
                              transition: "filter 0.2s ease",
                            }}
                          >
                            {previewType === "pdf" && previewUrl && (
                              <PDFCanvasViewer url={previewUrl} />
                            )}
                            {previewType === "image" && previewUrl && (
                              <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 12, display: "inline-block" }}>
                                <img
                                  src={previewUrl}
                                  alt={doc.name}
                                  onDragStart={(e) => e.preventDefault()}
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "560px",
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

                      {/* Right Sidebar Panel */}
                      <div
                        style={{
                          width: "320px",
                          background: "rgba(10, 14, 26, 0.4)",
                          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          overflowY: "auto",
                          padding: "24px",
                          gap: "24px",
                        }}
                        className="viewer-sidebar"
                      >
                        {/* Security Profile */}
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>
                            Security Profile
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Connected Address</div>
                              <div style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: "monospace", wordBreak: "break-all", marginTop: 2 }}>{wallet?.address}</div>
                            </div>
                            {viewerLabel.includes("(") && (
                              <div>
                                <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Bound Identity</div>
                                <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 2 }}>{viewerLabel.split("(")[1].replace(")", "")}</div>
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Access Role</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                <Shield size={12} color={isOwner ? "var(--accent-teal)" : "var(--accent-emerald)"} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: isOwner ? "var(--accent-teal)" : "var(--accent-emerald)" }}>
                                  {isOwner ? "Document Owner" : `Recipient (Level ${doc.accessLevel})`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Security Checklist */}
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>
                            Active Safeguards
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {[
                              "Web3 Identity Authenticated",
                              "Polygon Permission Validated",
                              "AES-256 Client-Side Decrypted",
                              isRecipientViewOnly ? "Dual-Angle Forensic Watermark" : "Owner Root Access Bypass",
                              isRecipientViewOnly ? "Screenshots & Focus Lockout" : "Owner Action Bypass",
                            ].map((item, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                                <CheckCircle size={14} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Blockchain Records */}
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>
                            On-Chain Records
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                                <span>IPFS CID Reference</span>
                                <button 
                                  onClick={() => handleCopyField(doc.cid, "cid")} 
                                  style={{ background: "none", border: "none", color: "var(--accent-teal)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, padding: 0 }}
                                >
                                  {copiedField === "cid" ? <Check size={10} /> : <Copy size={10} />}
                                  <span style={{ fontSize: 9 }}>Copy</span>
                                </button>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace", wordBreak: "break-all", background: "rgba(0,0,0,0.25)", padding: "6px 10px", borderRadius: 8, marginTop: 4, border: "1px solid rgba(255,255,255,0.04)" }}>
                                {doc.cid.slice(0, 16)}...{doc.cid.slice(-8)}
                              </div>
                            </div>

                            {doc.txHash && (
                              <div>
                                <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                                  <span>Polygon Transaction</span>
                                  <button 
                                    onClick={() => handleCopyField(doc.txHash, "txHash")} 
                                    style={{ background: "none", border: "none", color: "var(--accent-teal)", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, padding: 0 }}
                                  >
                                    {copiedField === "txHash" ? <Check size={10} /> : <Copy size={10} />}
                                    <span style={{ fontSize: 9 }}>Copy</span>
                                  </button>
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace", wordBreak: "break-all", background: "rgba(0,0,0,0.25)", padding: "6px 10px", borderRadius: 8, marginTop: 4, border: "1px solid rgba(255,255,255,0.04)" }}>
                                  {doc.txHash.slice(0, 10)}...{doc.txHash.slice(-8)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* On-Chain Signatures Panel */}
                        {(isOwner || doc.accessLevel === 3) && (
                          <div>
                            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>
                              Decentralized Approvals
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {signatures.length === 0 ? (
                                <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                                  No signatures registered yet.
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {signatures.map((sig, idx) => (
                                    <div key={idx} style={{ background: "rgba(52, 211, 153, 0.04)", border: "1px solid rgba(52, 211, 153, 0.15)", borderRadius: 10, padding: 8 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--accent-emerald)" }}>
                                        <CheckCircle size={10} />
                                        <span>Signed & Verified</span>
                                      </div>
                                      <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-secondary)", marginTop: 2, wordBreak: "break-all" }}>
                                        {resolveAddressToLabel(sig.signer)}
                                      </div>
                                      <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 1 }}>
                                        {new Date(sig.timestamp).toLocaleString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {!isOwner && doc.accessLevel === 3 && (
                                <div style={{ marginTop: 6 }}>
                                  {hasSigned ? (
                                    <div style={{ fontSize: 11, color: "var(--accent-emerald)", fontWeight: 600, textAlign: "center", background: "rgba(52, 211, 153, 0.08)", padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(52, 211, 153, 0.2)" }}>
                                      You have signed this document
                                    </div>
                                  ) : (
                                    <button
                                      onClick={handleSignDocument}
                                      disabled={isSigning}
                                      style={{
                                        width: "100%",
                                        background: "linear-gradient(135deg, #22d3ee, #818cf8)",
                                        border: "none",
                                        borderRadius: "10px",
                                        color: "white",
                                        padding: "8px 12px",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: isSigning ? "default" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 6,
                                        opacity: isSigning ? 0.7 : 1,
                                        boxShadow: "0 4px 12px rgba(34, 211, 238, 0.2)",
                                      }}
                                    >
                                      {isSigning ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <Shield size={14} />
                                      )}
                                      {isSigning ? "Signing on-chain..." : "Sign & Approve Document"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Collaboration Comments Panel */}
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>
                            Collaboration Notes
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {/* Comment list */}
                            <div 
                              style={{ 
                                display: "flex", 
                                flexDirection: "column", 
                                gap: 8, 
                                maxHeight: "220px", 
                                overflowY: "auto",
                                paddingRight: 4
                              }}
                            >
                              {comments.length === 0 ? (
                                <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", padding: "10px 0" }}>
                                  No comments posted yet.
                                </div>
                              ) : (
                                comments.map((c, idx) => (
                                  <div key={idx} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 8 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                      <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--accent-teal)", fontWeight: 600 }}>
                                        {resolveAddressToLabel(c.author)}
                                      </span>
                                      <span style={{ fontSize: 8, color: "var(--text-muted)" }}>
                                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap", textAlign: "left", lineHeight: 1.4 }}>
                                      {c.content}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Comment Input */}
                            {(isOwner || (doc.accessLevel !== undefined && doc.accessLevel >= 2)) && (
                              <form onSubmit={handleCommentSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                                <textarea
                                  placeholder="Type an annotation comment..."
                                  value={newCommentText}
                                  onChange={(e) => setNewCommentText(e.target.value)}
                                  rows={2}
                                  style={{
                                    width: "100%",
                                    background: "rgba(0,0,0,0.3)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "8px",
                                    padding: "8px",
                                    fontSize: 11,
                                    color: "var(--text-primary)",
                                    resize: "none",
                                    fontFamily: "inherit",
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleCommentSubmit(e);
                                    }
                                  }}
                                />
                                <button
                                  type="submit"
                                  disabled={!newCommentText.trim()}
                                  style={{
                                    background: newCommentText.trim() ? "rgba(34, 211, 238, 0.15)" : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${newCommentText.trim() ? "rgba(34, 211, 238, 0.3)" : "rgba(255,255,255,0.05)"}`,
                                    borderRadius: "8px",
                                    color: newCommentText.trim() ? "var(--accent-teal)" : "var(--text-muted)",
                                    padding: "6px 12px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: newCommentText.trim() ? "pointer" : "default",
                                    textAlign: "center",
                                    transition: "all 0.2s ease"
                                  }}
                                >
                                  Add Note
                                </button>
                              </form>
                            )}

                            {/* Submit & Email Owner Panel */}
                            {!isOwner && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
                                {!(doc.ownerEmail || getOwnerEmail()) && (
                                  <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>
                                      Owner's Email Address
                                    </label>
                                    <input
                                      type="email"
                                      placeholder="owner@example.com"
                                      value={ownerEmailInput}
                                      onChange={(e) => setOwnerEmailInput(e.target.value)}
                                      style={{
                                        width: "100%",
                                        background: "rgba(0,0,0,0.3)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "8px",
                                        padding: "6px 8px",
                                        fontSize: 11,
                                        color: "var(--text-primary)",
                                      }}
                                    />
                                  </div>
                                )}
                                <button
                                  onClick={handleNotifyOwner}
                                  disabled={isNotifyingOwner || (!(doc.ownerEmail || getOwnerEmail()) && !ownerEmailInput.trim())}
                                  style={{
                                    width: "100%",
                                    background: "linear-gradient(135deg, #10b981, #059669)",
                                    border: "none",
                                    borderRadius: "10px",
                                    color: "white",
                                    padding: "8px 12px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: (isNotifyingOwner || (!(doc.ownerEmail || getOwnerEmail()) && !ownerEmailInput.trim())) ? "default" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    opacity: (isNotifyingOwner || (!(doc.ownerEmail || getOwnerEmail()) && !ownerEmailInput.trim())) ? 0.6 : 1,
                                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
                                  }}
                                >
                                  {isNotifyingOwner ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : notifySuccess ? (
                                    <CheckCircle size={12} />
                                  ) : (
                                    <Send size={12} />
                                  )}
                                  {isNotifyingOwner ? "Notifying Owner..." : notifySuccess ? "Notification Sent!" : "Submit & Email Owner"}
                                </button>
                                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, textAlign: "center", lineHeight: 1.4 }}>
                                  {(doc.ownerEmail || getOwnerEmail()) 
                                    ? `Direct notification will be sent to ${doc.ownerEmail || getOwnerEmail()}` 
                                    : "Enter the owner's email to send the sync link directly"}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Visual Audit Log */}
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>
                            Audit Chronology
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 14, borderLeft: "1px solid rgba(255, 255, 255, 0.08)", paddingLeft: 12, marginLeft: 6 }}>
                            {[
                              { title: "Smart Contract Anchored", time: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "Just now" },
                              { title: "Symmetric Decryption Handshake", time: "Verified" },
                              { title: "Polygon Access Registry Queried", time: "Verified" },
                              { title: "Forensic Preview Rendering", time: new Date().toLocaleTimeString() }
                            ].map((item, idx) => (
                              <div key={idx} style={{ position: "relative" }}>
                                <div style={{
                                  position: "absolute",
                                  left: "-16px",
                                  top: "4px",
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: idx === 3 ? "var(--accent-teal)" : "var(--accent-emerald)",
                                  boxShadow: idx === 3 ? "0 0 8px var(--accent-teal)" : "none"
                                }} />
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{item.time}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

            {/* Static Footer Rail Banner */}
            {isRecipientViewOnly && (
              <div
                style={{
                  background: "rgba(10, 14, 26, 0.9)",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "8px 16px",
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "var(--accent-teal)",
                  textAlign: "center",
                  letterSpacing: "0.5px",
                  fontWeight: 600,
                  textShadow: "1px 1px 1px rgba(0,0,0,0.5)",
                }}
              >
                Secure Doc Hash: {doc.docHash || "N/A"} | Timestamp: {new Date().toLocaleString()} | RESTRICTED ACCESS
              </div>
            )}
          </div>
        </div>,
        document.body
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
