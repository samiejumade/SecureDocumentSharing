import { NextRequest, NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import { FORWARDER_ADDRESS, FORWARDER_ABI, AMOY_NETWORK } from "@/lib/contract";

// Simple in-memory rate limiting to prevent spam
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;   // Max 10 requests per minute

function isRateLimited(address: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(address.toLowerCase()) || [];
  
  // Filter out timestamps older than the window
  const activeTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  activeTimestamps.push(now);
  rateLimitMap.set(address.toLowerCase(), activeTimestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { request } = body; // ForwardRequestData matching OpenZeppelin's struct

    if (!request || !request.from || !request.to || !request.data || !request.signature) {
      return NextResponse.json({ error: "Missing required ForwardRequest fields" }, { status: 400 });
    }

    // 1. Check rate limiting
    if (isRateLimited(request.from)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    // 2. Load Relayer configuration
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      console.error("RELAYER_PRIVATE_KEY is not configured on the server.");
      return NextResponse.json({ error: "Relayer is currently misconfigured." }, { status: 500 });
    }

    // 3. Connect to Polygon Amoy provider
    const rpcUrls = AMOY_NETWORK.rpcUrls;
    let provider: JsonRpcProvider | null = null;
    let lastError: any = null;

    for (const url of rpcUrls) {
      try {
        provider = new JsonRpcProvider(url);
        // Try getting network to verify link is active
        await provider.getNetwork();
        break;
      } catch (err) {
        lastError = err;
        provider = null;
      }
    }

    if (!provider) {
      console.error("All Amoy RPC endpoints failed:", lastError);
      return NextResponse.json({ error: "Blockchain RPC node is currently unreachable." }, { status: 503 });
    }

    // 4. Create wallet from private key and connect to provider
    const relayerWallet = new Wallet(relayerKey, provider);
    const relayerBalance = await provider.getBalance(relayerWallet.address);

    if (relayerBalance === BigInt(0)) {
      console.error(`Relayer wallet ${relayerWallet.address} has no MATIC balance.`);
      return NextResponse.json({ error: "Relayer wallet is out of gas funds." }, { status: 500 });
    }

    // 5. Connect to the Forwarder contract
    const forwarder = new Contract(FORWARDER_ADDRESS, FORWARDER_ABI, relayerWallet);

    // 6. Verify request validity on-chain prior to broadcasting (to save gas on reverts)
    try {
      const isValid = await forwarder.verify(request);
      if (!isValid) {
        return NextResponse.json({ error: "On-chain verification failed. Signature or parameters are invalid." }, { status: 400 });
      }
    } catch (err: any) {
      console.error("Verification call failed:", err);
      return NextResponse.json({ error: `On-chain verification reverted: ${err.message}` }, { status: 400 });
    }

    // 7. Submit transaction to forwarder.execute()
    console.log(`Relaying tx for ${request.from} to ${request.to}...`);
    try {
      // Polygon Amoy needs a higher gas price overrides for fast mining
      const feeData = await provider.getFeeData();
      // Enforce minimum 25 gwei maxPriorityFeePerGas for Amoy
      const minPriorityFee = BigInt("25000000000");
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minPriorityFee 
        ? feeData.maxPriorityFeePerGas 
        : minPriorityFee;
      
      const maxFeePerGas = feeData.maxFeePerGas && feeData.maxFeePerGas > maxPriorityFeePerGas
        ? feeData.maxFeePerGas + BigInt("10000000000") // extra buffer
        : maxPriorityFeePerGas + BigInt("10000000000");

      const tx = await forwarder.execute(request, {
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasLimit: 500000 // Safe gas limit for registry operations
      });

      console.log(`Transaction sent: ${tx.hash}`);

      return NextResponse.json({
        success: true,
        txHash: tx.hash,
        explorerUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`
      });

    } catch (txErr: any) {
      console.error("Transaction relaying execution failed:", txErr);
      return NextResponse.json({ error: `Execution reverted on-chain: ${txErr.message}` }, { status: 500 });
    }

  } catch (globalErr: any) {
    console.error("Unhandled error in relayer route:", globalErr);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
