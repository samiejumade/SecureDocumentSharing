"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Lock,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Wallet,
  Ban,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
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

interface TokenPayload {
  docName: string;
  docHash: string;
  cid: string;
  level: number;
  sender: string;
  sharedAt: string;
  encKeyHex: string;
  recipientAddress: string;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const json = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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

function ShareViewContent() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { wallet, connect, isConnecting, isCorrectNetwork, ensureNetwork } = useWallet();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [error, setError] = useState("");

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

      if (!isCorrectNetwork) {
        setLoading(false);
        setError("NETWORK_CONFLICT");
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
        if (!payload) {
          setError("Decryption metadata payload is invalid or empty.");
          setLoading(false);
          return;
        }
        importSharedDocument(payload, token, wallet.address);
        setVerified(true);

        // Redirect immediately to the recipient's documents dashboard tab!
        setTimeout(() => {
          router.push("/dashboard/documents");
        }, 1500);

      } catch (err: any) {
        console.error("Verification error details:", err);
        setError(err?.reason || err?.message || "Failed to verify on-chain permissions.");
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [token, payload, wallet, router, isCorrectNetwork]);

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
            Secure Document Gateway
          </p>
        </div>

        {/* Loading / Verifying */}
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
                Checking your on-chain permissions & credentials...
              </p>
            </div>
          </GlassCard>
        )}

        {/* Importing & Redirecting */}
        {!loading && verified && !accessRevoked && (
          <GlassCard padding={48} hoverable={false}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(34, 211, 238, 0.08)",
                border: "2px solid var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                color: "var(--accent-emerald)",
              }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                Access Approved
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
                Importing document keys into secure sandbox...
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", fontSize: 12, color: "var(--text-muted)" }}>
                <Loader2 size={14} className="animate-spin" style={{ animation: "shield-spin 1s linear infinite" }} />
                Redirecting to dashboard workspace
              </div>
            </div>
          </GlassCard>
        )}

        {/* WALLET NOT CONNECTED */}
        {!loading && !wallet && !verified && (
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
                To verify access and decrypt this document, connect the Web3 wallet that corresponds to the authorized recipient address.
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
                The document owner has revoked your access permissions. This magic link has been invalidated.
              </p>
            </div>
          </GlassCard>
        )}

        {/* WRONG NETWORK */}
        {!loading && error === "NETWORK_CONFLICT" && wallet && (
          <GlassCard padding={48} hoverable={false}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "2px solid var(--accent-amber)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  color: "var(--accent-amber)",
                }}
              >
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Incorrect Blockchain Network
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                You are currently connected to an incorrect network. SecureDocChain requires the <strong>Polygon Amoy Testnet</strong> network to authenticate document permissions.
              </p>
              <Button
                variant="primary"
                onClick={ensureNetwork}
                style={{ width: "100%" }}
                icon={<Shield size={16} />}
              >
                Switch to Polygon Amoy
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Error / Failed verification */}
        {!loading && error && error !== "NETWORK_CONFLICT" && !accessRevoked && !verified && (
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
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                <strong>Important:</strong> Check that your browser's Web3 wallet is connected and active on the <strong>Polygon Amoy Testnet</strong> network.
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
