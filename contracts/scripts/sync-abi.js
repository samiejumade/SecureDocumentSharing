const fs = require('fs');
const path = require('path');

// Resolve contract artifact paths
const registryArtifact = require(path.resolve(__dirname, '../artifacts/contracts/SecureDocChain.sol/SecureDocChain.json'));
const forwarderArtifact = require(path.resolve(__dirname, '../artifacts/contracts/SecureDocForwarder.sol/SecureDocForwarder.json'));

const registryAbi = JSON.stringify(registryArtifact.abi, null, 2);
const forwarderAbi = JSON.stringify(forwarderArtifact.abi, null, 2);

const contractTsPath = path.resolve(__dirname, '../../frontend/src/lib/contract.ts');

const output = `/* ─────────────────────────────────────────────────
   SecureDocChain — Contract ABI + Address + Network
   UUPS Upgradeable Proxy on Polygon Amoy Testnet
   ───────────────────────────────────────────────── */

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x7a66d8Ecc907DB6BC12a6F8Ea2FA3d1BD6C3EE0C";

export const FORWARDER_ADDRESS =
  process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "0x0000000000000000000000000000000000000000";

export const AMOY_CHAIN_ID = 80002;

export const AMOY_NETWORK = {
  chainId: \`0x\${AMOY_CHAIN_ID.toString(16)}\`,
  chainName: "Polygon Amoy Testnet",
  rpcUrls: [
    "https://polygon-amoy.drpc.org",
    "https://rpc-amoy.polygon.technology",
    "https://polygon-amoy-bor-rpc.publicnode.com"
  ],
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
};

export const CONTRACT_ABI = ${registryAbi} as const;

export const FORWARDER_ABI = ${forwarderAbi} as const;
`;

fs.writeFileSync(contractTsPath, output, 'utf8');
console.log('Updated frontend contract.ts with new Registry and Forwarder ABIs.');
