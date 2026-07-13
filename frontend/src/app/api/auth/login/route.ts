/* ─────────────────────────────────────────────────
   SecureDocChain — Login Magic Link API
   Sends a magic link email via MailerSend for
   passwordless authentication.
   ───────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, type } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (type !== "notification" && !token) {
      return NextResponse.json({ error: "Token is required for magic link mode" }, { status: 400 });
    }

    if (!process.env.MAILERSEND_API_KEY || !process.env.MAILERSEND_FROM_EMAIL) {
      return NextResponse.json(
        { error: "MailerSend not configured" },
        { status: 500 }
      );
    }

    const sentFrom = new Sender(process.env.MAILERSEND_FROM_EMAIL, "SecureDocChain");
    const recipients = [new Recipient(email)];

    const isNotification = type === "notification";
    const magicLink = token ? `${req.nextUrl.origin}/auth/verify/${token}` : "";
    const subject = isNotification ? "SecureDocChain Sign-In Notification" : "Your SecureDocChain Sign-In Link";

    const htmlBody = isNotification ? `
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
              <p style="margin:6px 0 0;font-size:13px;color:#8b9ec7;">Sign-In Notification</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                Hello! This email confirms that you successfully signed in to <strong style="color:#22d3ee;">SecureDocChain</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#8b9ec7;line-height:1.6;">
                Your session is now active. No further action is required from your side.
              </p>

              <!-- Security Note -->
              <p style="margin:28px 0 0;padding:14px 16px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.08);border-radius:12px;font-size:12px;color:#ef4444;line-height:1.7;">
                &#9888; If you did not perform this login, please secure your account immediately or notify our team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a5a7a;">
                SecureDocChain &middot; Blockchain-Powered Document Security
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
` : `
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
              <p style="margin:6px 0 0;font-size:13px;color:#8b9ec7;">Secure Sign-In</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                Hi there! Click the button below to securely sign in to <strong style="color:#22d3ee;">SecureDocChain</strong>.
              </p>
              <p style="margin:0 0 28px;font-size:13px;color:#8b9ec7;line-height:1.6;">
                This link expires in 15 minutes and can only be used once.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display:inline-block;padding:16px 56px;background:linear-gradient(135deg,#22d3ee,#818cf8);color:#0a0e1a;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px;letter-spacing:0.3px;">
                      Sign In to SecureDocChain
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <p style="margin:28px 0 0;padding:14px 16px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.08);border-radius:12px;font-size:12px;color:#8b9ec7;line-height:1.7;">
                &#128274; If you did not request this email, you can safely ignore it. Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:11px;color:#4a5a7a;">
                SecureDocChain &middot; Blockchain-Powered Document Security
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

    const textBody = isNotification ?
      `Sign-in to SecureDocChain successful\n\nThis email confirms that you signed in to SecureDocChain.\n\nIf you did not perform this login, please secure your account immediately.`
      : `Sign in to SecureDocChain\n\nClick this link to sign in: ${magicLink}\n\nThis link expires in 15 minutes.\n\nIf you did not request this email, you can safely ignore it.`;

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(htmlBody)
      .setText(textBody);

    const response = await mailerSend.email.send(emailParams);

    return NextResponse.json({
      success: true,
      statusCode: response.statusCode,
    });
  } catch (e: any) {
    console.error("Auth login API error:", e);
    return NextResponse.json(
      { error: e?.body?.message || e?.message || "Failed to send login email" },
      { status: 500 }
    );
  }
}
