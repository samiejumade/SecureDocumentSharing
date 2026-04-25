"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shield, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { decodeLoginToken, setSession, generateAuthToken } from "@/lib/auth";

export default function VerifyMagicLinkPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No token provided.");
      return;
    }

    // Decode and validate the token
    const payload = decodeLoginToken(token);

    if (!payload) {
      setStatus("error");
      setErrorMsg("This magic link has expired or is invalid. Please request a new one.");
      return;
    }

    // Token is valid — create session
    setEmail(payload.email);
    setSession({
      email: payload.email,
      loginMethod: "email",
      authenticatedAt: new Date().toISOString(),
      sessionToken: generateAuthToken(),
    });

    // Also store the email for the app to use
    localStorage.setItem("sdc_user_email", payload.email);

    setStatus("success");

    // Redirect to dashboard after a brief pause
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 2000);

    return () => clearTimeout(timer);
  }, [token, router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--gradient-hero)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 0 40px -8px rgba(34, 211, 238, 0.3)",
            }}
          >
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>SecureDocChain</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Magic Link Verification</p>
        </div>

        {/* Verifying */}
        {status === "verifying" && (
          <GlassCard padding={48} hoverable={false}>
            <div style={{ textAlign: "center" }}>
              <div className="shield-container" style={{ marginBottom: 24 }}>
                <div className="shield-ring shield-ring--outer" />
                <div className="shield-ring shield-ring--inner" />
                <Loader2
                  size={28}
                  color="var(--accent-teal)"
                  style={{ animation: "shield-spin 1s linear infinite" }}
                />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                Verifying Magic Link
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Please wait while we authenticate your session...
              </p>
            </div>
          </GlassCard>
        )}

        {/* Success */}
        {status === "success" && (
          <GlassCard padding={48} hoverable={false}>
            <div className="fade-in" style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(52,211,153,0.08)",
                  border: "2px solid var(--accent-emerald)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <CheckCircle size={32} color="var(--accent-emerald)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                Welcome Back!
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6 }}>
                Successfully authenticated as
              </p>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--accent-teal)",
                  marginBottom: 20,
                }}
              >
                {email}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Redirecting to your dashboard...
              </p>
            </div>
          </GlassCard>
        )}

        {/* Error */}
        {status === "error" && (
          <GlassCard padding={48} hoverable={false}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(251,113,133,0.08)",
                  border: "2px solid var(--accent-red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <AlertTriangle size={28} color="var(--accent-red)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Link Expired or Invalid
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
                {errorMsg}
              </p>
              <a
                href="/login"
                className="btn-primary"
                style={{
                  display: "inline-block",
                  textDecoration: "none",
                  padding: "14px 32px",
                  fontSize: 14,
                }}
              >
                Request New Magic Link
              </a>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
