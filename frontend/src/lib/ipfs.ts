/* ─────────────────────────────────────────────────
   SecureDocChain — IPFS Upload via Next.js API Route
   Uploads encrypted blobs to Pinata through a server-side
   API route so the JWT is never exposed to the client.
   ───────────────────────────────────────────────── */

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";

export interface UploadResult {
  cid: string;
  gatewayUrl: string;
}

/**
 * Upload an encrypted blob to IPFS via the /api/upload route.
 * The blob is sent as FormData — the API route forwards it to Pinata.
 */
export async function uploadToIPFS(
  encryptedBlob: Blob,
  fileName: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", encryptedBlob, `${fileName}.encrypted`);
  formData.append("fileName", fileName);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`IPFS upload failed: ${errBody}`);
  }

  const data = await res.json();
  return {
    cid: data.cid,
    gatewayUrl: `${GATEWAY_URL}/${data.cid}`,
  };
}

/**
 * Fetch an encrypted file from IPFS via the gateway.
 */
export async function fetchFromIPFS(cid: string): Promise<ArrayBuffer> {
  const url = `${GATEWAY_URL}/${cid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch from IPFS: ${res.statusText}`);
  return res.arrayBuffer();
}
