"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Mail,
  LogIn,
  Wallet,
  Scale,
  Film,
  Briefcase,
  ChevronLeft,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { buildLoginToken, setSession, generateAuthToken } from "@/lib/auth";

type Vertical = "legal" | "script" | "vault";

const VERTICALS: Record<Vertical, { label: string; icon: React.ReactNode; color: string }> = {
  legal: { label: "LegalVault", icon: <Scale size={16} />, color: "#22d3ee" },
  script: { label: "ScriptSafe", icon: <Film size={16} />, color: "#a78bfa" },
  vault: { label: "VaultDesk", icon: <Briefcase size={16} />, color: "#c084fc" },
};

export default function LoginPage() {
  const router = useRouter();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [activeVertical, setActiveVertical] = useState<Vertical>("vault");
  const [error, setError] = useState("");

  const handleEmailLogin = async () => {
    if (!loginEmail) {
      setError("Please enter your email address");
      return;
    }
    setLoginLoading(true);
    setError("");

    try {
      // Store vertical choice
      localStorage.setItem("sdc_vertical", activeVertical);

      // Create session directly (no magic link click required)
      setSession({
        email: loginEmail,
        loginMethod: "email",
        authenticatedAt: new Date().toISOString(),
        sessionToken: generateAuthToken(),
      });
      localStorage.setItem("sdc_user_email", loginEmail);

      // Trigger the sign-in notification email in the background
      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, type: "notification" }),
      }).catch((e) => {
        // Log error but do not block direct login
        console.warn("Notification email trigger error:", e);
      });

      // Redirect immediately to dashboard
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
      setLoginLoading(false);
    }
  };

  // Wagmi account + AppKit modal
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();

  // When wallet connects via AppKit modal, create session and redirect
  useEffect(() => {
    if (isConnected && address && walletLoading) {
      localStorage.setItem("sdc_vertical", activeVertical);
      localStorage.setItem("sdc_wallet_address", address);

      setSession({
        email: "",
        walletAddress: address,
        loginMethod: "wallet",
        authenticatedAt: new Date().toISOString(),
        sessionToken: generateAuthToken(),
      });

      setWalletLoading(false);
      router.push("/dashboard");
    }
  }, [isConnected, address, walletLoading, activeVertical, router]);

  const handleWalletLogin = () => {
    setWalletLoading(true);
    setError("");
    try {
      open(); // Opens the AppKit multi-wallet modal
    } catch (e: any) {
      setError(e?.message || "Wallet connection failed");
      setWalletLoading(false);
    }
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
      <div
        className="glass-card"
        style={{ padding: 44, maxWidth: 440, width: "100%", borderRadius: 28 }}
      >
        {/* Back link */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginBottom: 24,
            transition: "color 0.2s",
          }}
        >
          <ChevronLeft size={14} />
          Back to home
        </Link>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Image
            src="/logo.png"
            alt="SecureDocChain"
            width={52}
            height={52}
            style={{
              borderRadius: 14,
              marginBottom: 20,
              boxShadow: "0 0 40px -8px rgba(34, 211, 238, 0.3)",
            }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
            Welcome to SecureDocChain
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Sign in to securely share and manage your documents
          </p>
        </div>

        {/* Vertical Selector */}
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          Select Your Workspace
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["legal", "script", "vault"] as Vertical[]).map((v) => {
            const c = VERTICALS[v];
            const active = activeVertical === v;
            return (
              <button
                key={v}
                onClick={() => setActiveVertical(v)}
                style={{
                  flex: 1,
                  padding: "14px 8px",
                  borderRadius: 12,
                  background: active ? `${c.color}15` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? `${c.color}40` : "var(--border-subtle)"}`,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  color: active ? c.color : "var(--text-muted)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                  {c.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{c.label}</div>
              </button>
            );
          })}
        </div>

        {/* Email */}
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          Email Address
        </label>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Mail
            size={16}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="email"
            className="input-field"
            placeholder="you@company.com"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
            style={{ paddingLeft: 44 }}
          />
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
            {error}
          </div>
        )}

        {/* Email Login */}
        <button
          className="btn-primary"
          style={{
            width: "100%",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onClick={handleEmailLogin}
          disabled={loginLoading}
        >
          {loginLoading ? (
            <>
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  animation: "shield-spin 0.8s linear infinite",
                }}
              />
              Creating Session...
            </>
          ) : (
            <>
              <LogIn size={16} />
              Sign In with Email
            </>
          )}
        </button>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            margin: "20px 0",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
        </div>

        {/* Wallet */}
        <button
          className="btn-secondary"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onClick={handleWalletLogin}
          disabled={walletLoading}
        >
          {walletLoading ? (
            <>
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(34,211,238,0.3)",
                  borderTopColor: "var(--accent-teal)",
                  borderRadius: "50%",
                  animation: "shield-spin 0.8s linear infinite",
                }}
              />
              Connecting...
            </>
          ) : (
            <>
              <Wallet size={16} />
              Connect Wallet
            </>
          )}
        </button>

        {/* Footer */}
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "center",
            marginTop: 24,
            lineHeight: 1.6,
          }}
        >
          No wallet? No problem. Sign in with your email and we&apos;ll create your session immediately while sending a background notification.
        </p>
      </div>
    </div>
  );
}
