/* ─────────────────────────────────────────────────
   SecureDocChain — Share API Route
   Sends a magic link email when a document is shared.
   
   Supports two email delivery backends:
   1. Gmail SMTP (using secure port 465 SSL, allowed on Vercel)
   2. Brevo HTTP API (as fallback/alternative)
   ───────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientEmail, documentName, accessLevel, token, senderAddress } = body;

    if (!recipientEmail || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const accessLabel =
      accessLevel === 3 ? "Full Access (Sign & Modify)"
      : accessLevel === 2 ? "Edit Access"
      : "View Only";

    const magicLink = `${req.nextUrl.origin}/share/${token}`;

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

    // ── BACKEND 1: Gmail SMTP (port 465 SSL, not blocked by Vercel) ──
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      console.log("[share/route] Found Gmail SMTP configuration. Trying send...");
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true, // SSL
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
          connectionTimeout: 8000,
          socketTimeout: 8000,
        });

        await transporter.verify();
        const info = await transporter.sendMail({
          from: `"SecureDocChain" <${gmailUser}>`,
          to: recipientEmail,
          subject: `📄 A document has been shared with you — ${documentName}`,
          html: htmlContent,
          text: textContent,
        });

        console.log("[share/route] Gmail SMTP send success. MessageId:", info.messageId);
        return NextResponse.json({
          success: true,
          provider: "gmail",
          messageId: info.messageId,
        });
      } catch (gmailErr: any) {
        console.error("[share/route] Gmail SMTP failed, will check if Brevo is available:", gmailErr.message);
      }
    }

    // ── BACKEND 2: Brevo HTTP REST API (Fallback) ──
    const brevoApiKey = process.env.BREVO_API_KEY;
    const fromEmail   = process.env.BREVO_FROM_EMAIL;
    const fromName    = process.env.BREVO_FROM_NAME || "SecureDocChain";

    if (brevoApiKey && fromEmail) {
      console.log("[share/route] Found Brevo API configuration. Trying send...");
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
      
      if (brevoResponse.ok) {
        console.log("[share/route] Brevo send success. MessageId:", brevoData.messageId);
        return NextResponse.json({
          success: true,
          provider: "brevo",
          messageId: brevoData.messageId,
        });
      } else {
        const errorMsg = brevoData?.message || `Brevo error (HTTP ${brevoResponse.status})`;
        console.error("[share/route] Brevo send failed:", errorMsg);
        return NextResponse.json(
          { success: false, error: `Email delivery failed: ${errorMsg}` },
          { status: 422 }
        );
      }
    }

    // Neither service is configured or working
    return NextResponse.json(
      { error: "No active email service found. Configure GMAIL_USER/GMAIL_APP_PASSWORD or activate your Brevo account." },
      { status: 500 }
    );

  } catch (e: any) {
    console.error("[share/route] Unexpected error:", e?.message, e?.stack);
    return NextResponse.json(
      { error: e?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
