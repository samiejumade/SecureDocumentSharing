/* ─────────────────────────────────────────────────
   Temporary debug endpoint — DELETE after fixing email
   Hit this URL in your browser to see the exact error:
   https://your-app.vercel.app/api/debug-email
   ───────────────────────────────────────────────── */
import { NextResponse } from "next/server";

export async function GET() {
  const brevoApiKey   = process.env.BREVO_API_KEY;
  const fromEmail     = process.env.BREVO_FROM_EMAIL;
  const fromName      = process.env.BREVO_FROM_NAME;

  // 1. Check env vars are present
  const envCheck = {
    BREVO_API_KEY:    brevoApiKey ? `present (starts with: ${brevoApiKey.substring(0, 15)}...)` : "❌ MISSING",
    BREVO_FROM_EMAIL: fromEmail   || "❌ MISSING",
    BREVO_FROM_NAME:  fromName    || "❌ MISSING",
  };

  if (!brevoApiKey || !fromEmail) {
    return NextResponse.json({
      status: "error",
      problem: "Environment variables are missing on Vercel",
      envCheck,
      fix: "Go to Vercel → Settings → Environment Variables and add BREVO_API_KEY and BREVO_FROM_EMAIL",
    });
  }

  // 2. Test API key by calling Brevo account endpoint
  let accountCheck: any = {};
  try {
    const accountRes = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": brevoApiKey, "accept": "application/json" }
    });
    const accountData = await accountRes.json().catch(() => ({}));
    accountCheck = {
      httpStatus: accountRes.status,
      ok: accountRes.ok,
      email: (accountData as any).email,
      plan: (accountData as any).plan?.[0]?.type,
    };
  } catch (e: any) {
    accountCheck = { error: e.message };
  }

  // 3. Check verified senders
  let sendersCheck: any = {};
  try {
    const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
      headers: { "api-key": brevoApiKey, "accept": "application/json" }
    });
    const sendersData = await sendersRes.json().catch(() => ({}));
    sendersCheck = {
      httpStatus: sendersRes.status,
      senders: (sendersData as any).senders?.map((s: any) => ({
        email: s.email,
        active: s.active,
      })),
    };
  } catch (e: any) {
    sendersCheck = { error: e.message };
  }

  // 4. Try sending a test email to the from address itself
  let sendTest: any = {};
  try {
    const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key":      brevoApiKey,
        "content-type": "application/json",
        "accept":       "application/json",
      },
      body: JSON.stringify({
        sender:      { name: fromName || "SecureDocChain", email: fromEmail },
        to:          [{ email: fromEmail }],
        subject:     "SecureDocChain — Email Debug Test",
        textContent: "If you receive this email, Brevo is working correctly on Vercel.",
      }),
    });
    const emailData = await emailRes.json().catch(() => ({}));
    sendTest = {
      httpStatus: emailRes.status,
      ok: emailRes.ok,
      response: emailData,
    };
  } catch (e: any) {
    sendTest = { error: e.message };
  }

  return NextResponse.json({
    status: sendTest.ok ? "✅ All good — email sent!" : "❌ Email failed",
    envCheck,
    accountCheck,
    sendersCheck,
    sendTest,
  }, { status: 200 });
}
