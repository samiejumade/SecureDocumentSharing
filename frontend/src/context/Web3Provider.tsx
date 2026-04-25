"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type State } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, projectId, networks, polygonAmoy } from "@/lib/wagmi";

/* ── Query Client (singleton) ─────────────────── */
const queryClient = new QueryClient();

/* ── AppKit Metadata ──────────────────────────── */
const metadata = {
  name: "SecureDocChain",
  description: "Blockchain-Powered Secure Document Sharing",
  url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  icons: ["/favicon.ico"],
};

/* ── Initialize AppKit (once) ─────────────────── */
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    defaultNetwork: polygonAmoy,
    metadata,
    features: {
      analytics: false,
      email: false,      // We handle email auth ourselves
      socials: false,     // No social login via AppKit
    },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#22d3ee",
      "--w3m-color-mix": "#0a0e1a",
      "--w3m-color-mix-strength": 50,
      "--w3m-border-radius-master": "1px",
      "--w3m-font-family": "'Outfit', system-ui, sans-serif",
    },
  });
}

/* ── Provider Component ───────────────────────── */
export default function Web3Provider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
