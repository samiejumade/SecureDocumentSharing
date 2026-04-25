import { NextRequest, NextResponse } from "next/server";
import { PinataSDK } from "pinata";

export async function POST(request: NextRequest) {
  try {
    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!jwt) {
      return NextResponse.json({ error: "Pinata JWT not configured" }, { status: 500 });
    }

    const pinata = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: "gateway.pinata.cloud",
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Pinata
    const upload = await pinata.upload.public.file(file);

    // Handle both SDK v1 (IpfsHash) and v2 (cid) response shapes
    const uploadResult = upload as Record<string, any>;
    const cid = uploadResult.cid || uploadResult.IpfsHash || "";

    return NextResponse.json({
      cid,
      fileName: fileName || file.name,
      size: file.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("IPFS Upload Error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
