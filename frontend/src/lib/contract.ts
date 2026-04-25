/* ─────────────────────────────────────────────────
   SecureDocChain — Contract ABI + Address + Network
   Deployed on Polygon Amoy Testnet
   ───────────────────────────────────────────────── */

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x7a66d8Ecc907DB6BC12a6F8Ea2FA3d1BD6C3EE0C";

export const AMOY_CHAIN_ID = 80002;

export const AMOY_NETWORK = {
  chainId: `0x${AMOY_CHAIN_ID.toString(16)}`,
  chainName: "Polygon Amoy Testnet",
  rpcUrls: ["https://rpc-amoy.polygon.technology"],
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
};

export const CONTRACT_ABI = [
  // ── createDocument ──────────────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_docHash", type: "bytes32" },
      { internalType: "string",  name: "_cid",     type: "string" },
      { internalType: "string",  name: "_docType",  type: "string" },
      { internalType: "uint256", name: "_expiry",   type: "uint256" },
      { internalType: "bool",    name: "_ipTimestamp", type: "bool" },
    ],
    name: "createDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ── updateDocument ──────────────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh",     type: "bytes32" },
      { internalType: "string",  name: "_newCid", type: "string" },
    ],
    name: "updateDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ── grantAccess ─────────────────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh",    type: "bytes32" },
      { internalType: "address", name: "_user",  type: "address" },
      { internalType: "uint8",   name: "_level", type: "uint8" },
    ],
    name: "grantAccess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ── batchGrantAccess ────────────────────────────
  {
    inputs: [
      { internalType: "bytes32",   name: "_dh",     type: "bytes32" },
      { internalType: "address[]", name: "_users",  type: "address[]" },
      { internalType: "uint8[]",   name: "_levels", type: "uint8[]" },
    ],
    name: "batchGrantAccess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ── revokeAccess ────────────────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh",      type: "bytes32" },
      { internalType: "address", name: "_user",    type: "address" },
      { internalType: "string",  name: "_newCid",  type: "string" },
    ],
    name: "revokeAccess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ── logAccess ───────────────────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh", type: "bytes32" },
    ],
    name: "logAccess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ── verifyIntegrity (view) ──────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh",  type: "bytes32" },
      { internalType: "string",  name: "_cid", type: "string" },
    ],
    name: "verifyIntegrity",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  // ── getDocumentState (view) ─────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh", type: "bytes32" },
    ],
    name: "getDocumentState",
    outputs: [
      { internalType: "string",  name: "cid",        type: "string" },
      { internalType: "address", name: "owner",       type: "address" },
      { internalType: "uint256", name: "version",     type: "uint256" },
      { internalType: "uint256", name: "keyVersion",  type: "uint256" },
      { internalType: "uint256", name: "timestamp",   type: "uint256" },
      { internalType: "string",  name: "docType",     type: "string" },
      { internalType: "uint256", name: "expiry",      type: "uint256" },
      { internalType: "bool",    name: "ipTimestamp",  type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },

  // ── getAccessLevel (view) ───────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh",   type: "bytes32" },
      { internalType: "address", name: "_user",  type: "address" },
    ],
    name: "getAccessLevel",
    outputs: [{ internalType: "uint8", name: "level", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },

  // ── getAccessLog (view) ─────────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh", type: "bytes32" },
    ],
    name: "getAccessLog",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },

  // ── documentExists (view) ──────────────────────
  {
    inputs: [
      { internalType: "bytes32", name: "_dh", type: "bytes32" },
    ],
    name: "documentExists",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },

  // ── pause / unpause ─────────────────────────────
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },

  // ── Events ──────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "bytes32", name: "docHash",    type: "bytes32" },
      { indexed: false, internalType: "string",  name: "cid",        type: "string" },
      { indexed: true,  internalType: "address", name: "owner",      type: "address" },
      { indexed: false, internalType: "string",  name: "docType",    type: "string" },
      { indexed: false, internalType: "bool",    name: "ipTimestamp", type: "bool" },
      { indexed: false, internalType: "uint256", name: "ts",         type: "uint256" },
    ],
    name: "DocumentCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "bytes32", name: "docHash",    type: "bytes32" },
      { indexed: false, internalType: "string",  name: "newCid",     type: "string" },
      { indexed: false, internalType: "uint256", name: "version",    type: "uint256" },
      { indexed: false, internalType: "uint256", name: "keyVersion", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "ts",         type: "uint256" },
    ],
    name: "DocumentUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "bytes32", name: "docHash", type: "bytes32" },
      { indexed: true,  internalType: "address", name: "grantee", type: "address" },
      { indexed: false, internalType: "uint8",   name: "level",   type: "uint8" },
      { indexed: false, internalType: "uint256", name: "ts",      type: "uint256" },
    ],
    name: "AccessGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "bytes32", name: "docHash",       type: "bytes32" },
      { indexed: true,  internalType: "address", name: "grantee",       type: "address" },
      { indexed: false, internalType: "uint256", name: "newKeyVersion", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "ts",            type: "uint256" },
    ],
    name: "AccessRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "bytes32", name: "docHash",  type: "bytes32" },
      { indexed: true,  internalType: "address", name: "accessor", type: "address" },
      { indexed: false, internalType: "uint256", name: "ts",       type: "uint256" },
    ],
    name: "DocumentAccessed",
    type: "event",
  },
] as const;
