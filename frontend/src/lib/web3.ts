/* ─────────────────────────────────────────────────
   SecureDocChain — Web3 Integration Layer
   Contract interactions via ethers.js v6.
   Provider sourced from any connected wallet via wagmi.
   ───────────────────────────────────────────────── */

import { BrowserProvider, Contract, keccak256, toUtf8Bytes, parseUnits, JsonRpcProvider, FallbackProvider } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, FORWARDER_ADDRESS, FORWARDER_ABI, AMOY_CHAIN_ID, AMOY_NETWORK } from "./contract";

/* ── Types ─────────────────────────────────────── */
export interface WalletState {
  address: string;
  chainId: number;
  isConnected: boolean;
}

export interface AnchorResult {
  txHash: string;
  docHash: string;
  explorerUrl: string;
}

export interface GrantResult {
  txHash: string;
  explorerUrl: string;
}

/* ── Provider / Signer ─────────────────────────── */

/**
 * Get the EIP-1193 provider from the connected wallet.
 * Works with MetaMask, Coinbase Wallet, WalletConnect, etc.
 */
export function getEthereum() {
  if (typeof window === "undefined") {
    throw new Error("Not in browser environment");
  }

  // Check for wagmi-injected provider or any wallet provider
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error(
      "No wallet detected. Please connect a wallet (MetaMask, Coinbase Wallet, WalletConnect, etc.) to continue."
    );
  }
  return ethereum;
}

export function getProvider() {
  return new BrowserProvider(getEthereum());
}

export async function getContract(): Promise<Contract> {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Polygon Amoy requires a minimum gas tip of 25 gwei.
 * We set 30 gwei tip cap + 100 gwei max fee to ensure txs never fail
 * with "gas tip cap below minimum" (RPC error -32603).
 */
function getAmoyGasOverrides() {
  return {
    maxPriorityFeePerGas: parseUnits("30", "gwei"),  // 30 gwei tip (min is 25)
    maxFeePerGas: parseUnits("100", "gwei"),          // 100 gwei max fee
  };
}

/**
 * Builds a resilient FallbackProvider targeting all configured Amoy RPC endpoints.
 * staticNetwork prevents unnecessary chainId validation overhead.
 */
function getFallbackProvider(): FallbackProvider {
  const providers = AMOY_NETWORK.rpcUrls.map(
    (url) => new JsonRpcProvider(url, AMOY_CHAIN_ID, { staticNetwork: true })
  );
  return new FallbackProvider(providers);
}

export async function getReadContract(): Promise<Contract> {
  let provider;
  try {
    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : null;
    if (ethereum) {
      provider = new BrowserProvider(ethereum);
    } else {
      provider = getFallbackProvider();
    }
  } catch {
    provider = getFallbackProvider();
  }
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export async function getReadForwarder(): Promise<Contract> {
  let provider;
  try {
    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : null;
    if (ethereum) {
      provider = new BrowserProvider(ethereum);
    } else {
      provider = getFallbackProvider();
    }
  } catch {
    provider = getFallbackProvider();
  }
  return new Contract(FORWARDER_ADDRESS, FORWARDER_ABI, provider);
}

/* ── Wallet Connection ─────────────────────────── */

/**
 * Connect wallet — now handled by AppKit modal.
 * This function reads the currently connected account.
 */
export async function connectWallet(): Promise<WalletState> {
  const ethereum = getEthereum();
  const provider = new BrowserProvider(ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  const network = await provider.getNetwork();

  return {
    address: accounts[0],
    chainId: Number(network.chainId),
    isConnected: true,
  };
}

export async function switchToAmoy(): Promise<void> {
  const ethereum = getEthereum();
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AMOY_NETWORK.chainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [AMOY_NETWORK],
      });
    } else {
      throw switchError;
    }
  }
}

export async function getWalletState(): Promise<WalletState | null> {
  try {
    const ethereum = getEthereum();
    const accounts = await ethereum.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) return null;
    const provider = new BrowserProvider(ethereum);
    const network = await provider.getNetwork();
    return {
      address: accounts[0],
      chainId: Number(network.chainId),
      isConnected: true,
    };
  } catch {
    return null;
  }
}

import { sendGaslessTransaction } from "./meta-tx";

/* ── Contract Write Operations ─────────────────── */

/**
 * Anchor a document on-chain.
 */
export async function anchorDocument(
  fileName: string,
  cid: string,
  docType: string = "business",
  expiry: number = 0,
  ipTimestamp: boolean = false
): Promise<AnchorResult> {
  const provider = getProvider();
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== AMOY_CHAIN_ID) {
    await switchToAmoy();
  }

  const contract = await getContract();
  const docHash = keccak256(toUtf8Bytes(`${fileName}::${cid}`));

  // Encode the transaction calldata
  const calldata = contract.interface.encodeFunctionData("createDocument", [
    docHash,
    cid,
    docType,
    expiry,
    ipTimestamp
  ]);

  try {
    console.log("Attempting gasless anchor transaction...");
    const relayerResult = await sendGaslessTransaction(CONTRACT_ADDRESS, calldata);
    return {
      txHash: relayerResult.txHash,
      docHash,
      explorerUrl: relayerResult.explorerUrl,
    };
  } catch (relayerError: any) {
    console.warn("Gasless anchor failed, falling back to direct transaction:", relayerError);
    const tx = await contract.createDocument(docHash, cid, docType, expiry, ipTimestamp, getAmoyGasOverrides());
    const receipt = await tx.wait(1);
    return {
      txHash: receipt.hash,
      docHash,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
    };
  }
}

/**
 * Grant access to a user for a document.
 */
export async function grantDocumentAccess(
  docHash: string,
  userAddress: string,
  level: number = 1
): Promise<GrantResult> {
  const contract = await getContract();
  const calldata = contract.interface.encodeFunctionData("grantAccess", [
    docHash,
    userAddress,
    level
  ]);

  try {
    console.log("Attempting gasless grantAccess transaction...");
    const relayerResult = await sendGaslessTransaction(CONTRACT_ADDRESS, calldata);
    return {
      txHash: relayerResult.txHash,
      explorerUrl: relayerResult.explorerUrl,
    };
  } catch (relayerError: any) {
    console.warn("Gasless grantAccess failed, falling back to direct transaction:", relayerError);
    const tx = await contract.grantAccess(docHash, userAddress, level, getAmoyGasOverrides());
    const receipt = await tx.wait(1);
    return {
      txHash: receipt.hash,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
    };
  }
}

/**
 * Grant access to multiple users for a document in a single transaction.
 */
export async function batchGrantDocumentAccess(
  docHash: string,
  userAddresses: string[],
  levels: number[]
): Promise<GrantResult> {
  const contract = await getContract();
  const calldata = contract.interface.encodeFunctionData("batchGrantAccess", [
    docHash,
    userAddresses,
    levels
  ]);

  try {
    console.log("Attempting gasless batchGrantAccess transaction...");
    const relayerResult = await sendGaslessTransaction(CONTRACT_ADDRESS, calldata);
    return {
      txHash: relayerResult.txHash,
      explorerUrl: relayerResult.explorerUrl,
    };
  } catch (relayerError: any) {
    console.warn("Gasless batchGrantAccess failed, falling back to direct transaction:", relayerError);
    const tx = await contract.batchGrantAccess(docHash, userAddresses, levels, getAmoyGasOverrides());
    const receipt = await tx.wait(1);
    return {
      txHash: receipt.hash,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
    };
  }
}

/**
 * Revoke access for a user. Supports both overloaded functions:
 * - revokeAccess(bytes32,address)
 * - revokeAccess(bytes32,address,string)
 */
export async function revokeDocumentAccess(
  docHash: string,
  userAddress: string,
  newCid?: string
): Promise<GrantResult> {
  const contract = await getContract();
  
  // Resolve overload encode signature
  const calldata = newCid
    ? contract.interface.encodeFunctionData("revokeAccess(bytes32,address,string)", [docHash, userAddress, newCid])
    : contract.interface.encodeFunctionData("revokeAccess(bytes32,address)", [docHash, userAddress]);

  try {
    console.log("Attempting gasless revokeAccess transaction...");
    const relayerResult = await sendGaslessTransaction(CONTRACT_ADDRESS, calldata);
    return {
      txHash: relayerResult.txHash,
      explorerUrl: relayerResult.explorerUrl,
    };
  } catch (relayerError: any) {
    console.warn("Gasless revokeAccess failed, falling back to direct transaction:", relayerError);
    const tx = newCid
      ? await contract.revokeAccess(docHash, userAddress, newCid, getAmoyGasOverrides())
      : await contract.revokeAccess(docHash, userAddress, getAmoyGasOverrides());
    const receipt = await tx.wait(1);
    return {
      txHash: receipt.hash,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
    };
  }
}

/**
 * Revoke access for multiple users in a single transaction.
 * Supports both overloaded functions:
 * - batchRevokeAccess(bytes32,address[])
 * - batchRevokeAccess(bytes32,address[],string)
 */
export async function batchRevokeDocumentAccess(
  docHash: string,
  userAddresses: string[],
  newCid?: string
): Promise<GrantResult> {
  const contract = await getContract();
  
  // Resolve overload encode signature
  const calldata = newCid
    ? contract.interface.encodeFunctionData("batchRevokeAccess(bytes32,address[],string)", [docHash, userAddresses, newCid])
    : contract.interface.encodeFunctionData("batchRevokeAccess(bytes32,address[])", [docHash, userAddresses]);

  try {
    console.log("Attempting gasless batchRevokeAccess transaction...");
    const relayerResult = await sendGaslessTransaction(CONTRACT_ADDRESS, calldata);
    return {
      txHash: relayerResult.txHash,
      explorerUrl: relayerResult.explorerUrl,
    };
  } catch (relayerError: any) {
    console.warn("Gasless batchRevokeAccess failed, falling back to direct transaction:", relayerError);
    const tx = newCid
      ? await contract.batchRevokeAccess(docHash, userAddresses, newCid, getAmoyGasOverrides())
      : await contract.batchRevokeAccess(docHash, userAddresses, getAmoyGasOverrides());
    const receipt = await tx.wait(1);
    return {
      txHash: receipt.hash,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
    };
  }
}

/**
 * Log that the current user accessed a document.
 */
export async function logDocumentAccess(docHash: string): Promise<string> {
  const contract = await getContract();
  const calldata = contract.interface.encodeFunctionData("logAccess", [docHash]);

  try {
    console.log("Attempting gasless logAccess transaction...");
    const relayerResult = await sendGaslessTransaction(CONTRACT_ADDRESS, calldata);
    return relayerResult.txHash;
  } catch (relayerError: any) {
    console.warn("Gasless logAccess failed, falling back to direct transaction:", relayerError);
    const tx = await contract.logAccess(docHash, getAmoyGasOverrides());
    const receipt = await tx.wait(1);
    return receipt.hash;
  }
}

/* ── Contract Read Operations ──────────────────── */

export async function verifyDocument(docHash: string, cid: string): Promise<boolean> {
  try {
    const contract = await getReadContract();
    return await contract.verifyIntegrity(docHash, cid);
  } catch (err) {
    console.warn("verifyDocument failed:", err);
    return false;
  }
}

export async function getDocumentState(docHash: string) {
  try {
    const contract = await getReadContract();
    const result = await contract.getDocumentState(docHash);
    return {
      cid: result[0] as string,
      owner: result[1] as string,
      version: Number(result[2]),
      keyVersion: Number(result[3]),
      timestamp: Number(result[4]),
      docType: result[5] as string,
      expiry: Number(result[6]),
      ipTimestamp: result[7] as boolean,
    };
  } catch (err) {
    console.warn("getDocumentState failed:", err);
    return null;
  }
}

export async function getAccessLevel(docHash: string, userAddress: string): Promise<number> {
  try {
    const contract = await getReadContract();
    return Number(await contract.getAccessLevel(docHash, userAddress));
  } catch (err) {
    console.warn("getAccessLevel failed:", err);
    return 0;
  }
}

export async function hasAccess(docHash: string, userAddress: string): Promise<{ hasAccess: boolean; level: number }> {
  try {
    const contract = await getReadContract();
    const result = await contract.hasAccess(docHash, userAddress);
    return {
      hasAccess: result[0] as boolean,
      level: Number(result[1]),
    };
  } catch (err) {
    console.warn("hasAccess failed:", err);
    return { hasAccess: false, level: 0 };
  }
}

export async function getAccessLog(docHash: string): Promise<string[]> {
  try {
    const contract = await getReadContract();
    return await contract.getAccessLog(docHash);
  } catch (err) {
    console.warn("getAccessLog failed:", err);
    return [];
  }
}

export async function documentExists(docHash: string): Promise<boolean> {
  try {
    const contract = await getReadContract();
    return await contract.documentExists(docHash);
  } catch (err) {
    console.warn("documentExists failed:", err);
    return false;
  }
}

/* ── Utility ───────────────────────────────────── */

export function generateDocHash(fileName: string, cid: string): string {
  return keccak256(toUtf8Bytes(`${fileName}::${cid}`));
}

export function shortenAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function getExplorerUrl(txHash: string): string {
  return `https://amoy.polygonscan.com/tx/${txHash}`;
}
