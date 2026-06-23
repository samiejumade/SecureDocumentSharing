/* ─────────────────────────────────────────────────
   SecureDocChain — Share API Route
   Sends a magic link email via Brevo (HTTP REST API)
   No custom domain needed. Works on Vercel serverless.

   SETUP:
   1. Sign up free at brevo.com
   2. Go to: brevo.com → SMTP & API → API Keys → Generate
   3. Go to: brevo.com → Senders & IP → Add a Sender
      (any email, e.g. your Gmail — verify via link)
   4. Add to Vercel env vars:
        BREVO_API_KEY=xkeysib-...
        BREVO_FROM_EMAIL=your_verified@email.com
        BREVO_FROM_NAME=SecureDocChain
   ───────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientEmail, documentName, accessLevel, token, senderAddress } = body;

    if (!recipientEmail || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    const fromEmail   = process.env.BREVO_FROM_EMAIL;
    const fromName    = process.env.BREVO_FROM_NAME || "SecureDocChain";

    if (!brevoApiKey || !fromEmail) {
      console.error("[share/route] Brevo credentials missing:", {
        hasKey:   !!brevoApiKey,
        hasEmail: !!fromEmail,
      });
      return NextResponse.json(
        { error: "Email service not configured. Add BREVO_API_KEY and BREVO_FROM_EMAIL to environment variables." },
        { status: 500 }
      );
    }

    const accessLabel =
      accessLevel === 3 ? "Full Access (Sign & Modify)"
      : accessLevel === 2 ? "Edit Access"
      : "View Only";

    const magicLink = `${req.nextUrl.origin}/share/${token}`;

    console.log("[share/route] Sending via Brevo HTTP API");
    console.log("[share/route] From:", fromEmail, "→ To:", recipientEmail);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0d1b2e;border:1px solid rgba(99,102,241,0.15);border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:40px 36px 24px;text-align:center;">
              <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#22d3ee,#818cf8);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:28px;">&#128737;</span>
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#e2e8f0;">SecureDocChain</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#8b9ec7;">Blockchain-Powered Document Sharing</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                A document has been securely shared with you through <strong style="color:#22d3ee;">SecureDocChain</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.12);border-radius:14px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#4a5a7a;">Document</p>
                    <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#e2e8f0;">&#128196; ${documentName}</p>
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#4a5a7a;">Access Level</p>
                    <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#22d3ee;">${accessLabel}</p>
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#4a5a7a;">Shared By</p>
                    <p style="margin:0;font-size:13px;font-family:monospace;color:#8b9ec7;">${senderAddress || "Anonymous"}</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#22d3ee,#818cf8);color:#0a0e1a;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px;letter-spacing:0.3px;">
                      Open Secure Document
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;color:#4a5a7a;word-break:break-all;line-height:1.6;">
                Or copy this link:<br/>
                <a href="${magicLink}" style="color:#22d3ee;">${magicLink}</a>
              </p>
              <p style="margin:20px 0 0;padding:14px 16px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.08);border-radius:12px;font-size:12px;color:#8b9ec7;line-height:1.7;">
                &#128274; This document is end-to-end encrypted. Your access is logged immutably on the Polygon blockchain. No wallet required to view.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a5a7a;">
                Sent via SecureDocChain &middot; Powered by Polygon &amp; IPFS
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `A document "${documentName}" has been shared with you on SecureDocChain.\n\nAccess Level: ${accessLabel}\nShared By: ${senderAddress || "Anonymous"}\n\nOpen your secure document: ${magicLink}\n\nThis document is end-to-end encrypted and your access is logged on the Polygon blockchain.`;

    // ── Brevo REST API call (pure HTTP, no SMTP, works on Vercel) ──
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept":       "application/json",
        "api-key":      brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender:  { name: fromName, email: fromEmail },
        to:      [{ email: recipientEmail }],
        subject: `📄 A document has been shared with you — ${documentName}`,
        htmlContent,
        textContent,
      }),
    });

    const brevoData = await brevoResponse.json().catch(() => ({}));
    console.log("[share/route] Brevo response status:", brevoResponse.status);
    console.log("[share/route] Brevo response body:", JSON.stringify(brevoData));

    if (!brevoResponse.ok) {
      const errorMsg = (brevoData as any)?.message || `Brevo error (HTTP ${brevoResponse.status})`;
      console.error("[share/route] Brevo rejected the request:", errorMsg);
      return NextResponse.json(
        { success: false, error: `Email delivery failed: ${errorMsg}` },
        { status: 422 }
      );
    }

    console.log("[share/route] Email sent successfully. MessageId:", (brevoData as any)?.messageId);

    return NextResponse.json({
      success: true,
      messageId: (brevoData as any)?.messageId,
    });

  } catch (e: any) {
    console.error("[share/route] Unexpected error:", e?.message, e?.stack);
    return NextResponse.json(
      { error: e?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
