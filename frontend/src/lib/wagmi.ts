/* ─────────────────────────────────────────────────
   SecureDocChain — Wagmi + Reown AppKit Configuration
   Multi-wallet support (MetaMask, Coinbase, WalletConnect, etc.)
   configured for Polygon Amoy Testnet.
   ───────────────────────────────────────────────── */

import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { type AppKitNetwork } from "@reown/appkit/networks";

/* ── Polygon Amoy Testnet definition ──────────── */
export const polygonAmoy = {
  id: 80002,
  name: "Polygon Amoy Testnet",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-amoy.polygon.technology"] },
  },
  blockExplorers: {
    default: { name: "Polygonscan", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
} as const satisfies AppKitNetwork;

/* ── Project ID from Reown Cloud ──────────────── */
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

if (!projectId) {
  console.warn("NEXT_PUBLIC_REOWN_PROJECT_ID not set — wallet modal will not work");
}

/* ── Networks ─────────────────────────────────── */
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [polygonAmoy];

/* ── Wagmi Adapter ────────────────────────────── */
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
