import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const brevoApiKey   = process.env.BREVO_API_KEY;
  const fromEmail     = process.env.BREVO_FROM_EMAIL;
  const fromName      = process.env.BREVO_FROM_NAME;

  const gmailUser     = process.env.GMAIL_USER;
  const gmailPass     = process.env.GMAIL_APP_PASSWORD;

  const envCheck = {
    BREVO_API_KEY:    brevoApiKey ? `present (starts with: ${brevoApiKey.substring(0, 15)}...)` : "❌ MISSING",
    BREVO_FROM_EMAIL: fromEmail   || "❌ MISSING",
    BREVO_FROM_NAME:  fromName    || "❌ MISSING",
    GMAIL_USER:       gmailUser   || "❌ MISSING",
    GMAIL_APP_PASSWORD: gmailPass ? `present (length: ${gmailPass.length})` : "❌ MISSING",
  };

  let brevoCheck: any = {};
  if (brevoApiKey && fromEmail) {
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
          subject:     "SecureDocChain — Brevo Debug Test",
          textContent: "Test email from Brevo.",
        }),
      });
      const emailData = await emailRes.json().catch(() => ({}));
      brevoCheck = {
        httpStatus: emailRes.status,
        ok: emailRes.ok,
        response: emailData,
      };
    } catch (e: any) {
      brevoCheck = { error: e.message };
    }
  } else {
    brevoCheck = { status: "skipped (missing env vars)" };
  }

  let gmailCheck: any = {};
  if (gmailUser && gmailPass) {
    try {
      // Create Gmail transporter with explicit port 465 (SSL) which is NOT blocked by Vercel
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // SSL
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        connectionTimeout: 8000, // 8s timeout
        socketTimeout: 8000,
      });

      // Verify connection
      await transporter.verify();
      
      // Try sending a test email to yourself
      const info = await transporter.sendMail({
        from: `"SecureDocChain" <${gmailUser}>`,
        to: gmailUser,
        subject: "SecureDocChain — Gmail SMTP Debug Test",
        text: "If you receive this email, Gmail SMTP port 465 is working correctly on Vercel!",
      });

      gmailCheck = {
        verified: true,
        sent: true,
        messageId: info.messageId,
      };
    } catch (e: any) {
      gmailCheck = {
        verified: false,
        sent: false,
        error: e.message,
        code: e.code,
      };
    }
  } else {
    gmailCheck = { status: "skipped (missing env vars)" };
  }

  return NextResponse.json({
    envCheck,
    brevoCheck,
    gmailCheck,
    conclusion: {
      useBrevo: brevoCheck.ok ? "SUCCESS" : "FAILED",
      useGmail: gmailCheck.sent ? "SUCCESS" : "FAILED",
    }
  });
}
