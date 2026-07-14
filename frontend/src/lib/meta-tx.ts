import { getProvider, getReadForwarder } from "./web3";
import { FORWARDER_ADDRESS, AMOY_CHAIN_ID } from "./contract";

export interface MetaTxRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  deadline: number;
  data: string;
  signature: string;
}

/**
 * Builds and signs an EIP-712 meta-transaction, then relays it via the server endpoint.
 * Falls back to throwing an error if the relayer fails, allowing callers to catch and run directly.
 * 
 * @param toAddress Target contract address (SecureDocChain proxy)
 * @param calldata Abi-encoded call data to execute on the target contract
 */
export async function sendGaslessTransaction(
  toAddress: string,
  calldata: string
): Promise<{ txHash: string; explorerUrl: string }> {
  const provider = getProvider();
  const signer = await provider.getSigner();
  const fromAddress = await signer.getAddress();

  // 1. Get the current nonce for this address from the Forwarder contract
  const forwarder = await getReadForwarder();
  const nonce = await forwarder.nonces(fromAddress);

  // 2. Set deadline (1 hour from now)
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  // 3. Define the EIP-712 Domain matching OZ's ERC2771Forwarder
  const domain = {
    name: "SecureDocForwarder",
    version: "1",
    chainId: AMOY_CHAIN_ID,
    verifyingContract: FORWARDER_ADDRESS,
  };

  // 4. Define EIP-712 Types (omit EIP712Domain, as ethers automatically builds it)
  const types = {
    ForwardRequest: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint48" },
      { name: "data", type: "bytes" },
    ],
  };

  // 5. Build EIP-712 Value payload
  const value = {
    from: fromAddress,
    to: toAddress,
    value: "0",
    gas: "500000", // standard limit for sharing / anchoring operations
    nonce: nonce.toString(),
    deadline: deadline,
    data: calldata,
  };

  // 6. Sign the typed data using the browser wallet
  console.log("Prompting user to sign gasless meta-transaction...");
  const signature = await signer.signTypedData(domain, types, value);

  // 7. POST payload to Relayer API route
  const response = await fetch("/api/relayer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request: {
        ...value,
        signature,
      },
    }),
  });

  const responseData = await response.json();

  if (!response.ok || !responseData.success) {
    throw new Error(responseData.error || "Failed to relay meta-transaction");
  }

  return {
    txHash: responseData.txHash,
    explorerUrl: responseData.explorerUrl,
  };
}
