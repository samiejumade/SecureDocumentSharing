"use client";

import { Settings, Shield, Scale, Film, Briefcase, Wallet, Globe, ExternalLink, Trash2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useWallet, type Vertical } from "@/context/WalletContext";
import { VERTICAL_CONFIG } from "@/components/layout/Navbar";

export default function SettingsPage() {
  const { wallet, vertical, setVertical, connect, disconnect, displayAddress, isCorrectNetwork, ensureNetwork } = useWallet();

  const clearData = () => {
    if (confirm("This will clear all locally stored documents and audit logs. Continue?")) {
      localStorage.removeItem("sdc_documents");
      localStorage.removeItem("sdc_audit");
      window.dispatchEvent(new CustomEvent("sdc:documents-changed"));
      window.dispatchEvent(new CustomEvent("sdc:audit-changed"));
    }
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
          <Settings size={24} style={{ verticalAlign: "middle", marginRight: 10, color: "var(--accent-teal)" }} />
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Manage your workspace, wallet connection, and preferences.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900 }}>
        {/* Workspace Selection */}
        <GlassCard padding={28} hoverable={false}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
            <Globe size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent-teal)" }} />
            Workspace
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["legal", "script", "vault"] as Vertical[]).map((v) => {
              const c = VERTICAL_CONFIG[v];
              const active = vertical === v;
              return (
                <button
                  key={v}
                  onClick={() => setVertical(v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: active ? `${c.color}10` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? `${c.color}30` : "var(--border-subtle)"}`,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${c.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: c.color,
                    }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: active ? c.color : "var(--text-primary)" }}>
                      {c.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {v === "legal" ? "Law Firms & Legal Teams" : v === "script" ? "Production Houses" : "Startups & Business"}
                    </div>
                  </div>
                  {active && (
                    <div
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: `${c.color}20`,
                        color: c.color,
                      }}
                    >
                      Active
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Wallet Connection */}
        <GlassCard padding={28} hoverable={false}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
            <Wallet size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent-teal)" }} />
            Wallet Connection
          </h3>

          {wallet ? (
            <div>
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "rgba(52,211,153,0.06)",
                  border: "1px solid rgba(52,211,153,0.15)",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                  Connected Address
                </div>
                <div style={{ fontSize: 14, fontFamily: "monospace", color: "var(--accent-emerald)", wordBreak: "break-all" }}>
                  {wallet.address}
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: isCorrectNetwork ? "rgba(52,211,153,0.06)" : "rgba(251,113,133,0.06)",
                  border: `1px solid ${isCorrectNetwork ? "rgba(52,211,153,0.15)" : "rgba(251,113,133,0.15)"}`,
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>Network</div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isCorrectNetwork ? "var(--accent-emerald)" : "var(--accent-red)",
                    }}
                  >
                    {isCorrectNetwork ? "Polygon Amoy Testnet" : `Chain ID: ${wallet.chainId}`}
                  </div>
                </div>
                {!isCorrectNetwork && (
                  <Button variant="secondary" size="sm" onClick={ensureNetwork}>
                    Switch Network
                  </Button>
                )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <a
                  href={`https://amoy.polygonscan.com/address/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ flex: 1, textDecoration: "none", textAlign: "center", padding: "10px 16px", fontSize: 13 }}
                >
                  <ExternalLink size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  View on Explorer
                </a>
                <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <Wallet size={32} color="var(--text-muted)" style={{ marginBottom: 14, opacity: 0.5 }} />
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
                Connect your wallet for on-chain document anchoring and access control.
              </p>
              <Button variant="primary" onClick={connect} icon={<Wallet size={14} />}>
                Connect MetaMask
              </Button>
            </div>
          )}
        </GlassCard>

        {/* Security Info */}
        <GlassCard padding={28} hoverable={false}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
            <Shield size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent-teal)" }} />
            Security
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Encryption", value: "AES-256-GCM (Client-Side)", color: "var(--accent-emerald)" },
              { label: "Storage", value: "IPFS via Pinata (Decentralized)", color: "var(--accent-teal)" },
              { label: "Blockchain", value: "Polygon Amoy Testnet", color: "var(--accent-copper)" },
              { label: "Key Management", value: "Per-Document AES Keys", color: "var(--accent-rose)" },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Data Management */}
        <GlassCard padding={28} hoverable={false}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
            <Trash2 size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent-red)" }} />
            Data Management
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 18 }}>
            Clear locally stored document metadata and audit logs. This does not affect on-chain data or
            IPFS-stored files.
          </p>
          <Button variant="danger" onClick={clearData} icon={<Trash2 size={14} />}>
            Clear Local Data
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}
