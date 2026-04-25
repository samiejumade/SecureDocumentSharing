"use client";

import { Scale, Film, Briefcase, Bell, ChevronDown, LogOut, User, Wallet } from "lucide-react";
import Image from "next/image";
import { useWallet, type Vertical } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

const VERTICAL_CONFIG: Record<Vertical, { label: string; icon: React.ReactNode; color: string }> = {
  legal:  { label: "LegalVault",  icon: <Scale size={14} />,     color: "#22d3ee" },
  script: { label: "ScriptSafe", icon: <Film size={14} />,       color: "#a78bfa" },
  vault:  { label: "VaultDesk",  icon: <Briefcase size={14} />,  color: "#c084fc" },
};

export { VERTICAL_CONFIG };

export default function Navbar() {
  const { wallet, displayAddress, vertical, setVertical, isCorrectNetwork, disconnect, connect } = useWallet();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const vConf = VERTICAL_CONFIG[vertical];

  // Display name: email or wallet address
  const displayName = user?.email
    ? user.email
    : wallet
      ? displayAddress
      : "Not Connected";

  const handleLogout = () => {
    disconnect();
    logout();
    setShowMenu(false);
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 28px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(10, 14, 26, 0.85)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left — Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Image
          src="/logo.png"
          alt="SecureDocChain"
          width={36}
          height={36}
          style={{ borderRadius: 10 }}
        />
        <span style={{ fontSize: 18, fontWeight: 700 }}>SecureDocChain</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 8,
            background: `${vConf.color}15`,
            color: vConf.color,
            letterSpacing: 0.5,
          }}
        >
          {vConf.label}
        </span>
      </div>

      {/* Right — Network + Vertical Switcher + Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Network indicator / Connect wallet */}
        {wallet ? (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              background: isCorrectNetwork ? "rgba(52,211,153,0.1)" : "rgba(251,113,133,0.1)",
              color: isCorrectNetwork ? "var(--accent-emerald)" : "var(--accent-red)",
              border: `1px solid ${isCorrectNetwork ? "rgba(52,211,153,0.2)" : "rgba(251,113,133,0.2)"}`,
            }}
          >
            {isCorrectNetwork ? "● Polygon Amoy" : "⚠ Wrong Network"}
          </div>
        ) : (
          <button
            onClick={connect}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              background: "rgba(251,191,36,0.08)",
              color: "var(--accent-amber)",
              border: "1px solid rgba(251,191,36,0.2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
            }}
          >
            <Wallet size={12} />
            Connect Wallet
          </button>
        )}

        {/* Vertical switcher */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["legal", "script", "vault"] as Vertical[]).map((v) => {
            const c = VERTICAL_CONFIG[v];
            return (
              <button
                key={v}
                title={c.label}
                onClick={() => setVertical(v)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: vertical === v ? `${c.color}20` : "transparent",
                  border: `1px solid ${vertical === v ? `${c.color}40` : "transparent"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: vertical === v ? c.color : "var(--text-muted)",
                  transition: "all 0.2s ease",
                }}
              >
                {c.icon}
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary)",
            position: "relative",
          }}
        >
          <Bell size={16} />
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--accent-teal)",
            }}
          />
        </button>

        {/* Profile pill with dropdown */}
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setShowMenu(!showMenu)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle)",
              fontSize: 13,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: user ? "var(--accent-emerald)" : "var(--text-muted)",
              }}
            />
            <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </span>
            <ChevronDown
              size={12}
              style={{
                transform: showMenu ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 0.2s",
              }}
            />
          </div>

          {/* Dropdown menu */}
          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: 220,
                borderRadius: 14,
                background: "#0c1220",
                border: "1px solid rgba(34,211,238,0.1)",
                boxShadow: "0 20px 60px -12px rgba(0,0,0,0.6)",
                overflow: "hidden",
                zIndex: 50,
                animation: "fadeIn 0.15s ease",
              }}
            >
              {/* User info */}
              <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                  Signed in as
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", wordBreak: "break-all" }}>
                  {user?.email || displayAddress || "Unknown"}
                </div>
                {user?.loginMethod && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    via {user.loginMethod === "email" ? "Magic Link" : "MetaMask"}
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "var(--accent-red)",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(251,113,133,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
