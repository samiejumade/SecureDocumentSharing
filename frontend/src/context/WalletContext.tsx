"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { BrowserProvider } from "ethers";
import { AMOY_CHAIN_ID } from "@/lib/contract";

/* ── Types ─────────────────────────────────────── */
export type Vertical = "legal" | "script" | "vault";

export interface WalletState {
  address: string;
  chainId: number;
  isConnected: boolean;
}

interface WalletContextValue {
  wallet: WalletState | null;
  isConnecting: boolean;
  error: string;
  vertical: Vertical;
  displayAddress: string;
  isCorrectNetwork: boolean;
  connect: () => void;           // Opens AppKit modal
  disconnect: () => void;
  setVertical: (v: Vertical) => void;
  ensureNetwork: () => Promise<void>;
  getEthersProvider: () => BrowserProvider | null;
}

/* ── Context ───────────────────────────────────── */
const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, chainId, connector } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { open } = useAppKit();

  const [error, setError] = useState("");
  const [vertical, setVertical] = useState<Vertical>("vault");
  const [isConnecting, setIsConnecting] = useState(false);

  // Build wallet state from wagmi
  const wallet: WalletState | null =
    isConnected && address
      ? { address, chainId: chainId || 0, isConnected: true }
      : null;

  // Load saved vertical on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sdc_vertical");
    if (saved === "legal" || saved === "script" || saved === "vault") {
      setVertical(saved);
    }
  }, []);

  // Persist vertical choice
  useEffect(() => {
    localStorage.setItem("sdc_vertical", vertical);
  }, [vertical]);

  // When wallet connects, store address
  useEffect(() => {
    if (address) {
      localStorage.setItem("sdc_wallet_address", address);
      setIsConnecting(false);
    }
  }, [address]);

  // Open the AppKit multi-wallet modal
  const connect = useCallback(() => {
    setError("");
    setIsConnecting(true);
    try {
      open();
    } catch (e: any) {
      setError(e?.message || "Failed to open wallet selector");
      setIsConnecting(false);
    }
  }, [open]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    wagmiDisconnect();
    localStorage.removeItem("sdc_wallet_address");
  }, [wagmiDisconnect]);

  // Switch to Polygon Amoy
  const ensureNetwork = useCallback(async () => {
    if (chainId && chainId !== AMOY_CHAIN_ID) {
      try {
        switchChain({ chainId: AMOY_CHAIN_ID });
      } catch (e: any) {
        setError("Please switch to Polygon Amoy network in your wallet");
      }
    }
  }, [chainId, switchChain]);

  // Get ethers provider from the connected wallet (for contract calls)
  const getEthersProvider = useCallback((): BrowserProvider | null => {
    if (typeof window === "undefined") return null;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;
    return new BrowserProvider(ethereum);
  }, []);

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const isCorrectNetwork = chainId === AMOY_CHAIN_ID;

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isConnecting,
        error,
        vertical,
        displayAddress,
        isCorrectNetwork,
        connect,
        disconnect,
        setVertical,
        ensureNetwork,
        getEthersProvider,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
