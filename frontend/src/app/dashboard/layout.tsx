"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { WalletProvider, useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { Wallet, ShieldAlert } from "lucide-react";
import { useEffect } from "react";

function WalletGate({ children }: { children: React.ReactNode }) {
  const { user, login } = useAuth();
  const { wallet, connect, isConnecting } = useWallet();

  // Link wallet address to session once connected
  useEffect(() => {
    if (user && user.loginMethod === "email" && wallet?.address && user.walletAddress !== wallet.address) {
      login({
        ...user,
        walletAddress: wallet.address,
      });
    }
  }, [user, wallet, login]);

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
