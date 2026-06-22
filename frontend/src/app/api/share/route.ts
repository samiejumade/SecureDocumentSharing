/* ─────────────────────────────────────────────────
   SecureDocChain — Share API Route
   Sends a magic link email via Resend when a
   document is shared with another user.

   RESEND FREE TIER NOTE:
   Without a verified custom domain, emails can only
   be sent to the Resend account owner's email.
   Add a verified domain in resend.com/domains and
   set RESEND_FROM_EMAIL=noreply@yourdomain.com
   ───────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientEmail, documentName, accessLevel, token, senderAddress } = body;

    if (!recipientEmail || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.RESEND_KEY) {
      return NextResponse.json({ error: "RESEND_KEY not configured" }, { status: 500 });
    }

    const accessLabel =
      accessLevel === 3
        ? "Full Access (Sign & Modify)"
        : accessLevel === 2
          ? "Edit Access"
          : "View Only";

    const magicLink = `${req.nextUrl.origin}/share/${token}`;

    // Resend sender — defaults to onboarding@resend.dev for free tier
    const fromEmail = process.env.RESEND_FROM_EMAIL || "SecureDocChain <onboarding@resend.dev>";

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
          <!-- Header -->
          <tr>
            <td style="padding:40px 36px 24px;text-align:center;">
              <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#22d3ee,#818cf8);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:28px;">&#128737;</span>
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#e2e8f0;">SecureDocChain</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#8b9ec7;">Blockchain-Powered Document Sharing</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                A document has been securely shared with you through <strong style="color:#22d3ee;">SecureDocChain</strong>.
              </p>

              <!-- Document Card -->
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

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#22d3ee,#818cf8);color:#0a0e1a;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px;letter-spacing:0.3px;">
                      Open Secure Document
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <p style="margin:28px 0 0;padding:14px 16px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.08);border-radius:12px;font-size:12px;color:#8b9ec7;line-height:1.7;">
                &#128274; This document is end-to-end encrypted. Your access is logged immutably on the Polygon blockchain. No wallet required to view.
              </p>
            </td>
          </tr>

          <!-- Footer -->
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
</html>
    `;

    const textContent = `A document "${documentName}" has been shared with you on SecureDocChain.\n\nAccess Level: ${accessLabel}\nShared By: ${senderAddress || "Anonymous"}\n\nOpen your secure document: ${magicLink}\n\nThis document is end-to-end encrypted and your access is logged on the Polygon blockchain.`;

    console.log("[share/route] Sending email via Resend to:", recipientEmail);
    console.log("[share/route] From address:", fromEmail);
    console.log("[share/route] RESEND_KEY present:", !!process.env.RESEND_KEY);

    const response = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: `📄 A document has been shared with you — ${documentName}`,
      html: htmlContent,
      text: textContent,
    });

    // Log full Resend response for debugging
    console.log("[share/route] Resend raw response:", JSON.stringify(response));

    if (response.error) {
      // Surface the exact Resend error so the client UI can show it
      const resendError = response.error as any;
      const errorMessage =
        resendError?.message ||
        resendError?.name ||
        "Resend rejected the email";

      console.error("[share/route] Resend error object:", JSON.stringify(resendError));

      // Friendly message for the most common free-tier restriction
      const isSandboxRestriction =
        errorMessage.toLowerCase().includes("verify") ||
        errorMessage.toLowerCase().includes("domain") ||
        errorMessage.toLowerCase().includes("testing") ||
        resendError?.name === "validation_error";

      return NextResponse.json(
        {
          success: false,
          error: isSandboxRestriction
            ? `Email restricted: Resend free tier only allows sending to the account owner's email. Add a verified domain at resend.com/domains to send to any address. Magic link: ${magicLink}`
            : `Resend error: ${errorMessage}`,
          magicLink,
        },
        { status: 422 }
      );
    }

    console.log("[share/route] Email sent successfully. ID:", response.data?.id);

    return NextResponse.json({
      success: true,
      id: response.data?.id,
    });
  } catch (e: any) {
    console.error("[share/route] Unexpected exception:", e?.message, e?.stack);
    return NextResponse.json(
      { error: e?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
