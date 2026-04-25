"use client";

import {
  Wallet,
  ExternalLink,
  Shield,
  Coins,
  Globe,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";

const STEPS = [
  {
    num: 1,
    icon: <Wallet size={18} />,
    title: "Install a Crypto Wallet",
    desc: "Install any EVM-compatible wallet. Popular options:",
    links: [
      { label: "MetaMask", url: "https://metamask.io/download/" },
      { label: "Coinbase Wallet", url: "https://www.coinbase.com/wallet" },
      { label: "Trust Wallet", url: "https://trustwallet.com/" },
    ],
  },
  {
    num: 2,
    icon: <Globe size={18} />,
    title: "Add Polygon Amoy Testnet",
    desc: "Add the Polygon Amoy test network to your wallet:",
    details: [
      "Network: Polygon Amoy Testnet",
      "Chain ID: 80002",
      "RPC: https://rpc-amoy.polygon.technology",
      "Symbol: MATIC",
      "Explorer: https://amoy.polygonscan.com",
    ],
  },
  {
    num: 3,
    icon: <Coins size={18} />,
    title: "Get Free Test MATIC (Faucet)",
    desc: "You need test MATIC tokens (gas) to create blockchain transactions:",
    links: [
      { label: "Polygon Amoy Faucet", url: "https://faucet.polygon.technology/" },
      { label: "Alchemy Amoy Faucet", url: "https://www.alchemy.com/faucets/polygon-amoy" },
    ],
  },
  {
    num: 4,
    icon: <Zap size={18} />,
    title: "Connect Your Wallet",
    desc: "Click the button below to connect your wallet to SecureDocChain. You can use any compatible wallet!",
    action: true,
  },
];

export default function WalletGuide() {
  const { connect } = useWallet();

  return (
    <div
      className="fade-in"
      style={{
        padding: "28px",
        borderRadius: 20,
        background:
          "linear-gradient(135deg, rgba(34,211,238,0.03) 0%, rgba(139,92,246,0.03) 100%)",
        border: "1px solid rgba(34,211,238,0.12)",
        marginBottom: 28,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-amber)",
          }}
        >
          <Shield size={22} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
            Wallet Required for Document Security
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Connect a wallet with Polygon Amoy to encrypt, anchor, and share
            documents on the blockchain.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {STEPS.map((step) => (
          <div
            key={step.num}
            style={{
              padding: "16px 18px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "rgba(34,211,238,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-teal)",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {step.num}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--accent-teal)",
                }}
              >
                {step.icon}
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {step.title}
                </span>
              </div>
            </div>

            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: step.links || step.details || step.action ? 10 : 0,
                lineHeight: 1.5,
                paddingLeft: 40,
              }}
            >
              {step.desc}
            </p>

            {/* Links */}
            {step.links && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  paddingLeft: 40,
                }}
              >
                {step.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      background: "rgba(34,211,238,0.06)",
                      border: "1px solid rgba(34,211,238,0.12)",
                      color: "var(--accent-teal)",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {link.label}
                    <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            )}

            {/* Network details */}
            {step.details && (
              <div
                style={{
                  paddingLeft: 40,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {step.details.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ChevronRight size={10} color="var(--accent-teal)" />
                    {d}
                  </div>
                ))}
              </div>
            )}

            {/* Connect button */}
            {step.action && (
              <div style={{ paddingLeft: 40 }}>
                <button
                  className="btn-primary"
                  onClick={connect}
                  style={{
                    padding: "12px 28px",
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Wallet size={15} />
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
