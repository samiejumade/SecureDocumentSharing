"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { WalletProvider, useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { Wallet, ShieldAlert, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EMAIL_BINDINGS_KEY = "sdc_email_bindings";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function readBindings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EMAIL_BINDINGS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeBindings(bindings: Record<string, string>) {
  localStorage.setItem(EMAIL_BINDINGS_KEY, JSON.stringify(bindings));
}

function WalletGate({ children }: { children: React.ReactNode }) {
  const { user, login, logout } = useAuth();
  const { wallet, connect, disconnect, isConnecting } = useWallet();
  const [bindings, setBindings] = useState<Record<string, string>>({});

  useEffect(() => {
    setBindings(readBindings());
  }, []);

  useEffect(() => {
    if (!user?.email || !wallet?.address) return;

    const emailKey = normalizeEmail(user.email);
    const walletAddress = normalizeAddress(wallet.address);
    const boundAddress = bindings[emailKey];

    // Find if this wallet address is already bound to any other email
    const boundEmail = Object.keys(bindings).find(
      (k) => normalizeAddress(bindings[k]) === walletAddress
    );

    if (!boundAddress && !boundEmail) {
      const nextBindings = { ...bindings, [emailKey]: walletAddress };
      writeBindings(nextBindings);
      setBindings(nextBindings);
      if (user.walletAddress !== wallet.address) {
        login({ ...user, walletAddress: wallet.address });
      }
      return;
    }

    if (boundAddress && normalizeAddress(boundAddress) !== walletAddress) {
      return;
    }

    if (boundEmail && normalizeEmail(boundEmail) !== emailKey) {
      return;
    }

    if (user.walletAddress !== wallet.address) {
      login({ ...user, walletAddress: wallet.address });
    }
  }, [user, wallet, login, bindings]);

  const conflict = useMemo(() => {
    if (!user?.email || !wallet?.address) return null;
    const emailKey = normalizeEmail(user.email);
    const walletAddress = normalizeAddress(wallet.address);

    const boundAddress = bindings[emailKey];
    if (boundAddress && normalizeAddress(boundAddress) !== walletAddress) {
      return {
        type: "email-already-bound",
        email: user.email,
        boundAddress,
      };
    }

    const boundEmail = Object.keys(bindings).find(
      (k) => normalizeAddress(bindings[k]) === walletAddress
    );
    if (boundEmail && normalizeEmail(boundEmail) !== emailKey) {
      return {
        type: "wallet-already-bound",
        email: boundEmail,
        boundAddress: wallet.address,
      };
    }

    return null;
  }, [user, wallet, bindings]);

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSignOut = () => {
    disconnect();
    logout();
  };

  if (conflict) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(10, 14, 26, 0.92)",
          backdropFilter: "blur(18px)",
          padding: 24,
        }}
      >
        <GlassCard padding={44} style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "rgba(251, 113, 133, 0.08)",
              border: "1px solid rgba(251, 113, 133, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: "var(--accent-red)",
            }}
          >
            <ShieldAlert size={34} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Wallet Binding Conflict</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.7 }}>
            {conflict.type === "email-already-bound" ? (
              `This email (${conflict.email}) is already bound to wallet address: [${conflict.boundAddress}]. You must connect with the linked wallet address to continue.`
            ) : (
              `This wallet address (${conflict.boundAddress}) is already bound to a different email: [${conflict.email}]. Please connect a different wallet or log in with the linked email.`
            )}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="secondary" onClick={handleDisconnect} icon={<Wallet size={16} />}>
              Disconnect Wallet
            </Button>
            <Button variant="primary" onClick={handleSignOut} icon={<LogOut size={16} />}>
              Sign Out
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  // If logged in via email but wallet is not connected, show gate
  if (user?.loginMethod === "email" && !wallet) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(10, 14, 26, 0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <GlassCard padding={44} style={{ maxWidth: 460, width: "90%", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: "var(--accent-amber)",
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Wallet Connection Required</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.6 }}>
            SecureDocChain requires a Web3 wallet connection to authenticate your on-chain credentials and verify permissions. Please connect your wallet to proceed to your workspace.
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
        </GlassCard>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <WalletGate>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Navbar />
          <div style={{ display: "flex", flex: 1 }}>
            <Sidebar />
            <main
              style={{
                flex: 1,
                padding: "32px 36px",
                maxWidth: "calc(100% - 260px)",
                overflowY: "auto",
              }}
            >
              {children}
            </main>
          </div>
        </div>
      </WalletGate>
    </WalletProvider>
  );
}
