import { NextRequest, NextResponse } from "next/server";
import { PinataSDK } from "pinata";

export async function POST(request: NextRequest) {
  try {
    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!jwt || jwt === "your_pinata_jwt_token" || jwt.startsWith("your_")) {
      console.warn("Pinata JWT not configured. Using Mock IPFS Upload fallback for local development.");
      
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const fileName = formData.get("fileName") as string;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Generate a mock CID
      const mockCid = "Qm" + Array.from({ length: 44 }, () =>
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
          Math.floor(Math.random() * 62)
        )
      ).join("");

      // Simulate a small network delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      return NextResponse.json({
        cid: mockCid,
        fileName: fileName || file.name,
        size: file.size,
        timestamp: new Date().toISOString(),
        isMock: true,
      });
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
