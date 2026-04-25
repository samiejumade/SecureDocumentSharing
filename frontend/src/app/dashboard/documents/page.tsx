"use client";

import { useState, useCallback } from "react";
import { Upload, Shield, Send, Search, Filter } from "lucide-react";
import dynamic from "next/dynamic";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import UploadZone from "@/components/documents/UploadZone";
import SecurityFlow, { type FlowStep } from "@/components/documents/SecurityFlow";
import DocumentCard from "@/components/documents/DocumentCard";
const ShareModal = dynamic(() => import("@/components/documents/ShareModal"), { ssr: false });
const ManageAccessModal = dynamic(() => import("@/components/documents/ManageAccessModal"), { ssr: false });
const WalletGuide = dynamic(() => import("@/components/documents/WalletGuide"), { ssr: false });
import { useDocuments } from "@/hooks/useDocuments";
import { useWallet } from "@/context/WalletContext";
import { encryptFile } from "@/lib/crypto";
import { uploadToIPFS } from "@/lib/ipfs";
import { anchorDocument } from "@/lib/web3";
import {
  saveDocument,
  addAuditEntry,
  generateId,
  formatFileSize,
  type StoredDocument,
  type DocType,
} from "@/lib/store";

export default function DocumentsPage() {
  const { documents } = useDocuments();
  const { wallet, vertical } = useWallet();

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [flowState, setFlowState] = useState<FlowStep>("idle");
  const [lastCid, setLastCid] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [flowError, setFlowError] = useState("");

  // Share state
  const [shareDoc, setShareDoc] = useState<StoredDocument | null>(null);
  const [manageDoc, setManageDoc] = useState<StoredDocument | null>(null);

  // Search/filter
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Map vertical to docType
  const docType: DocType =
    vertical === "legal" ? "legal" : vertical === "script" ? "script" : "business";

  const runSecurityFlow = useCallback(async () => {
    if (!selectedFile) return;
    setFlowError("");
    setLastCid("");
    setLastTxHash("");

    try {
      // Step 1: Encrypt
      setFlowState("encrypting");
      const { encryptedBlob, payload } = await encryptFile(selectedFile);

      // Step 2: Upload to IPFS
      setFlowState("uploading");
      let cid: string;
      try {
        const result = await uploadToIPFS(encryptedBlob, selectedFile.name);
        cid = result.cid;
      } catch (ipfsErr: any) {
        throw new Error(`IPFS upload failed: ${ipfsErr?.message || "Unknown error"}. Please check your Pinata configuration.`);
      }
      setLastCid(cid);

      // Step 3: Anchor on blockchain
      setFlowState("anchoring");
      let txHash: string;
      let docHash: string;
      try {
        const result = await anchorDocument(selectedFile.name, cid, docType);
        txHash = result.txHash;
        docHash = result.docHash;
      } catch (chainErr: any) {
        throw new Error(`Blockchain anchoring failed: ${chainErr?.message || "Transaction rejected or failed"}. Please try again.`);
      }
      setLastTxHash(txHash);

      // Save to local store
      const docId = generateId();
      saveDocument({
        id: docId,
        name: selectedFile.name,
        size: selectedFile.size,
        sizeFormatted: formatFileSize(selectedFile.size),
        docHash,
        cid,
        encKeyHex: payload.rawKeyHex,
        ownerAddress: wallet?.address || "unknown",
        docType,
        createdAt: new Date().toISOString(),
        txHash,
        status: "anchored",
        expiry: 0,
        ipTimestamp: vertical === "script",
        sharedWith: [],
      });

      // Add audit entry
      addAuditEntry({
        id: generateId(),
        docHash,
        action: "Document Securely Anchored",
        actor: wallet?.address || "You",
        fileName: selectedFile.name,
        timestamp: new Date().toISOString(),
        txHash,
        category: "anchor",
      });

      setFlowState("done");
    } catch (e: any) {
      setFlowError(e?.message || "An error occurred during the security flow");
      setFlowState("idle");
    }
  }, [selectedFile, wallet, vertical, docType]);

  const handleReset = () => {
    setFlowState("idle");
    setSelectedFile(null);
    setLastCid("");
    setLastTxHash("");
    setFlowError("");
  };

  // Filter documents
  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || d.docType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
          <Shield size={24} style={{ verticalAlign: "middle", marginRight: 10, color: "var(--accent-teal)" }} />
          Document Management
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Upload, encrypt, and share documents with blockchain-backed security.
        </p>
      </div>

      {/* Wallet Guide — shown when no wallet connected */}
      {!wallet && <WalletGuide />}

      {/* Upload Section */}
      <GlassCard padding={28} hoverable={false} style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>
          <Upload size={18} style={{ verticalAlign: "middle", marginRight: 10, color: "var(--accent-teal)" }} />
          Secure New Document
        </h2>

        {flowState === "idle" && (
          <>
            <UploadZone
              onFileSelected={setSelectedFile}
              selectedFile={selectedFile}
              onClear={() => setSelectedFile(null)}
            />
            {selectedFile && (
              <div style={{ marginTop: 18 }}>
                <Button
                  variant="primary"
                  style={{ width: "100%" }}
                  onClick={runSecurityFlow}
                  icon={<Shield size={16} />}
                >
                  Encrypt & Anchor Document
                </Button>
              </div>
            )}
          </>
        )}

        <SecurityFlow
          state={flowState}
          cid={lastCid}
          txHash={lastTxHash}
          error={flowError}
        />

        {flowState === "done" && (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Button
              variant="primary"
              style={{ flex: 1 }}
              onClick={() => {
                const doc = documents[0]; // most recent
                if (doc) setShareDoc(doc);
              }}
              icon={<Send size={14} />}
            >
              Share Document
            </Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={handleReset}>
              Secure Another
            </Button>
          </div>
        )}
      </GlassCard>

      {/* Document List */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Secured Documents</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              className="input-field"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, padding: "8px 14px 8px 36px", fontSize: 13, width: 220 }}
            />
          </div>

          {/* Type filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { key: "all", label: "All" },
              { key: "legal", label: "Legal" },
              { key: "script", label: "Script" },
              { key: "business", label: "Business" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.2s ease",
                  background: typeFilter === f.key ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.03)",
                  borderColor: typeFilter === f.key ? "rgba(34,211,238,0.25)" : "var(--border-subtle)",
                  color: typeFilter === f.key ? "var(--accent-teal)" : "var(--text-secondary)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredDocs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onShare={setShareDoc}
              onManageAccess={setManageDoc}
            />
          ))}
        </div>
      ) : (
        <GlassCard padding={48} hoverable={false}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <Filter size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 14 }}>
              {search || typeFilter !== "all"
                ? "No documents match your search."
                : "No documents yet. Upload one above to get started."}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Share Modal */}
      <ShareModal isOpen={!!shareDoc} onClose={() => setShareDoc(null)} document={shareDoc} />

      {/* Manage Access Modal */}
      <ManageAccessModal
        isOpen={!!manageDoc}
        onClose={() => setManageDoc(null)}
        document={manageDoc}
        onRevoked={() => {
          // Refresh the manage modal with updated doc
          if (manageDoc) {
            const updated = documents.find((d) => d.id === manageDoc.id);
            setManageDoc(updated || null);
          }
        }}
      />
    </div>
  );
}
