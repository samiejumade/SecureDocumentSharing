/* ─────────────────────────────────────────────────
   SecureDocChain — Sync Notification API Route
   Notifies the document owner when a recipient adds comments or signs.
   ───────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerEmail, recipientEmail, documentName, syncLink, commentsCount, hasSigned } = body;

    if (!ownerEmail || !syncLink || !documentName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const recipientLabel = recipientEmail || "A collaborator";
    const signatureStatus = hasSigned ? "Approved & Digitally Signed" : "Viewed / Commented Only";

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
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0d1b2e;border:1px solid rgba(34,211,238,0.15);border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:40px 36px 24px;text-align:center;">
              <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#22d3ee,#818cf8);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:24px;color:#0a0e1a;">💬</span>
              </div>
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#e2e8f0;">Collaboration Notes Ready</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#8b9ec7;">SecureDocChain Synchronization Hub</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 20px;font-size:14px;color:#e2e8f0;line-height:1.7;">
                <strong>${recipientLabel}</strong> has added collaboration comments or approvals to your document.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(34,211,238,0.02);border:1px solid rgba(34,211,238,0.12);border-radius:14px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#4a5a7a;">Document</p>
                    <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#e2e8f0;">📄 ${documentName}</p>
                    
                    <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#4a5a7a;">Comments Added</p>
                    <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#22d3ee;">${commentsCount || 0} note(s)</p>
                    
                    <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#4a5a7a;">Approval Status</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#34d399;">${signatureStatus}</p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${syncLink}" style="display:inline-block;padding:15px 44px;background:linear-gradient(135deg,#22d3ee,#818cf8);color:#0a0e1a;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
                      Sync &amp; Load Comments
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:20px 0 0;padding:12px 14px;background:rgba(34,211,238,0.02);border:1px solid rgba(34,211,238,0.08);border-radius:10px;font-size:11px;color:#8b9ec7;line-height:1.6;">
                🛡️ Clicking the button above imports the collaborator's annotations and signature directly into your browser's workspace.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a5a7a;">
                Sent via SecureDocChain &middot; Decentralized Workspace Security
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `Collaboration Updates on: ${documentName}\n\n${recipientLabel} has updated the document.\n\nComments: ${commentsCount}\nApproval: ${signatureStatus}\n\nSync updates: ${syncLink}`;

    // ── GMAIL SMTP ──
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: { user: gmailUser, pass: gmailPass },
          connectionTimeout: 8000,
          socketTimeout: 8000,
        });

        await transporter.sendMail({
          from: `"SecureDocChain" <${gmailUser}>`,
          to: ownerEmail,
          subject: `💬 Collaboration Updates on: ${documentName}`,
          html: htmlContent,
          text: textContent,
        });

        return NextResponse.json({ success: true, provider: "gmail" });
      } catch (gmailErr: any) {
        console.error("[sync-notify] Gmail SMTP failed, falling back to Brevo:", gmailErr.message);
      }
    }

    // ── BREVO ──
    const brevoApiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL;
    const fromName = process.env.BREVO_FROM_NAME || "SecureDocChain";

    if (brevoApiKey && fromEmail) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: ownerEmail }],
          subject: `💬 Collaboration Updates on: ${documentName}`,
          htmlContent,
          textContent,
        }),
      });

      if (res.ok) {
        return NextResponse.json({ success: true, provider: "brevo" });
      }
    }

    return NextResponse.json({ error: "No email delivery provider configured or active." }, { status: 500 });
  } catch (err: any) {
    console.error("[sync-notify] Internal Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
