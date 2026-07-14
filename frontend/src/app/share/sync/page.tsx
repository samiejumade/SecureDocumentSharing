"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle, RefreshCw, ArrowRight, ShieldCheck } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { 
  mergeCommentsLocally, 
  mergeSignaturesLocally, 
  mergeBindingsLocally, 
  type Comment, 
  type SignatureRecord 
} from "@/lib/comments";

function SyncContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"syncing" | "success" | "error">("syncing");
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState({ comments: 0, signatures: 0, bindings: 0 });

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMessage("No sync token found in the URL. Please verify the link.");
      return;
    }

    try {
      // Decode URL-safe base64 token
      const jsonStr = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(jsonStr);

      if (!payload.docHash) {
        throw new Error("Invalid sync token payload. Document reference missing.");
      }

      const incomingComments: Comment[] = payload.comments || [];
      const incomingSignatures: SignatureRecord[] = payload.signatures || [];
      const incomingBindings: Record<string, string> = payload.bindings || {};

      // Execute client-side merges
      mergeCommentsLocally(payload.docHash, incomingComments);
      mergeSignaturesLocally(payload.docHash, incomingSignatures);
      mergeBindingsLocally(incomingBindings);

      // Save count stats for visual reporting
      setStats({
        comments: incomingComments.length,
        signatures: incomingSignatures.length,
        bindings: Object.keys(incomingBindings).length,
      });

      // Add audit entry for local tracking
      try {
        const logsRaw = localStorage.getItem("sdc_audit_log");
        const logs = logsRaw ? JSON.parse(logsRaw) : [];
        logs.unshift({
          id: Math.random().toString(),
          docHash: payload.docHash,
          action: "Comments & Approvals Synced",
          actor: "Collaboration Link Sync",
          fileName: "Shared Document Workspace",
          timestamp: new Date().toISOString(),
          txHash: "Local Sync",
          category: "update"
        });
        localStorage.setItem("sdc_audit_log", JSON.stringify(logs));
        window.dispatchEvent(new CustomEvent("sdc:audit-changed"));
      } catch {}

      // Trigger change dispatch so open tabs reload immediately
      window.dispatchEvent(new CustomEvent("sdc:documents-changed"));

      setStatus("success");
    } catch (err: any) {
      console.error("Failed to execute sync token load:", err);
      setStatus("error");
      setErrorMessage(err?.message || "Corrupted sync token data.");
    }
  }, [searchParams]);

  return (
    <div style={{ maxWidth: 520, width: "100%", margin: "0 auto" }}>
      {status === "syncing" && (
        <GlassCard padding={48} hoverable={false}>
          <div style={{ textAlign: "center" }}>
            <RefreshCw size={48} className="animate-spin" style={{ color: "var(--accent-teal)", margin: "0 auto 24px", animation: "shield-spin 2s linear infinite" }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
              Synchronizing Collaboration Notes
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Importing comments, annotations, and approvals securely into your local browser workspace...
            </p>
          </div>
        </GlassCard>
      )}

      {status === "success" && (
        <GlassCard padding={48} hoverable={false}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(52, 211, 153, 0.08)",
              border: "2px solid var(--accent-emerald)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: "var(--accent-emerald)"
            }}>
              <ShieldCheck size={36} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: "var(--text-primary)" }}>
              Sync Complete!
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              Collaboration notes and verified approvals have been imported into your dashboard registry.
            </p>

            <div style={{ 
              background: "rgba(255,255,255,0.03)", 
              border: "1px solid var(--border-subtle)", 
              borderRadius: 12, 
              padding: "16px 20px", 
              marginBottom: 32,
              textAlign: "left"
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>
                Import Summary
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Comments & Annotations</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-teal)" }}>+{stats.comments}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>On-Chain Approvals</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>+{stats.signatures}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Verified Identity Bindings</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-indigo)" }}>+{stats.bindings}</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => router.push("/dashboard/documents")}
              style={{ width: "100%" }}
              icon={<ArrowRight size={16} />}
            >
              Go to Workspace Dashboard
            </Button>
          </div>
        </GlassCard>
      )}

      {status === "error" && (
        <GlassCard padding={48} hoverable={false}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(251, 113, 133, 0.08)",
              border: "2px solid var(--accent-red)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: "var(--accent-red)"
            }}>
              <AlertTriangle size={36} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
              Synchronization Failed
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.6 }}>
              {errorMessage}
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push("/dashboard/documents")}
              style={{ width: "100%" }}
            >
              Return to Dashboard
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

export default function SyncPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 120%, rgba(16, 185, 129, 0.06), rgba(10, 14, 26, 1))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    }}>
      <Suspense fallback={
        <GlassCard padding={48} hoverable={false}>
          <div style={{ textAlign: "center" }}>
            <RefreshCw size={48} className="animate-spin" style={{ color: "var(--accent-teal)", margin: "0 auto 24px" }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Loading sync portal...
            </h3>
          </div>
        </GlassCard>
      }>
        <SyncContent />
      </Suspense>
    </div>
  );
}
