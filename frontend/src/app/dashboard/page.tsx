"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  Activity,
  TrendingUp,
  Shield,
  Clock,
  Upload,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import GlassCard from "@/components/ui/GlassCard";
import AuditTimeline from "@/components/documents/AuditTimeline";
import DocumentCard from "@/components/documents/DocumentCard";
const ShareModal = dynamic(() => import("@/components/documents/ShareModal"), { ssr: false });
import { useDocuments, useAuditLog } from "@/hooks/useDocuments";
import { useWallet } from "@/context/WalletContext";
import { VERTICAL_CONFIG } from "@/components/layout/Navbar";
import type { StoredDocument } from "@/lib/store";

export default function DashboardOverview() {
  const { documents } = useDocuments();
  const { entries } = useAuditLog();
  const { wallet, vertical, displayAddress } = useWallet();
  const [shareDoc, setShareDoc] = useState<StoredDocument | null>(null);

  const vConf = VERTICAL_CONFIG[vertical];

  const totalDocs = documents.length;
  const sharedDocs = documents.filter((d) => d.status === "shared").length;
  const auditCount = entries.length;

  const recentDocs = documents.slice(0, 3);
  const recentAudit = entries.slice(0, 5);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          Welcome back{wallet ? `, ${displayAddress}` : ""}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          Your{" "}
          <span style={{ color: vConf.color, fontWeight: 600 }}>{vConf.label}</span>{" "}
          workspace is secure and up to date.
        </p>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          {
            label: "Total Documents",
            value: totalDocs.toString(),
            icon: <FileText size={20} />,
            color: "var(--accent-teal)",
          },
          {
            label: "Shared Active",
            value: sharedDocs.toString(),
            icon: <Users size={20} />,
            color: "var(--accent-copper)",
          },
          {
            label: "Audit Events",
            value: auditCount.toString(),
            icon: <Activity size={20} />,
            color: "var(--accent-emerald)",
          },
          {
            label: "Integrity Score",
            value: "100%",
            icon: <TrendingUp size={20} />,
            color: "var(--accent-amber)",
          },
        ].map((s) => (
          <GlassCard key={s.label} padding={24}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${s.color} 10%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: s.color,
                }}
              >
                {s.icon}
              </div>
              <ArrowUpRight size={16} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28 }}>
        {/* Left — Recent Documents */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              <FileText size={18} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent-teal)" }} />
              Recent Documents
            </h2>
            <Link
              href="/dashboard/documents"
              style={{
                fontSize: 13,
                color: "var(--accent-teal)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              View All
              <ExternalLink size={12} />
            </Link>
          </div>

          {recentDocs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} onShare={setShareDoc} />
              ))}
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                borderRadius: 20,
                overflow: "hidden",
                background: "linear-gradient(135deg, rgba(34,211,238,0.04) 0%, rgba(139,92,246,0.06) 50%, rgba(232,168,124,0.04) 100%)",
                border: "1px solid rgba(34,211,238,0.1)",
                padding: "48px 36px",
              }}
            >
              {/* Decorative floating shapes */}
              <div style={{
                position: "absolute", top: -20, right: -20,
                width: 120, height: 120, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)",
              }} />
              <div style={{
                position: "absolute", bottom: -30, left: -30,
                width: 160, height: 160, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
              }} />

              <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                {/* Shield illustration */}
                <div style={{
                  width: 80, height: 80, margin: "0 auto 20px",
                  borderRadius: 20,
                  background: "linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(139,92,246,0.08) 100%)",
                  border: "1px solid rgba(34,211,238,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Shield size={36} color="var(--accent-teal)" style={{ opacity: 0.9 }} />
                </div>

                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                  Secure Your First Document
                </h3>
                <p style={{
                  fontSize: 14, color: "var(--text-secondary)",
                  maxWidth: 360, margin: "0 auto 28px", lineHeight: 1.6,
                }}>
                  Encrypt, anchor on blockchain, and share with granular access control — all in seconds.
                </p>

                {/* Feature pills */}
                <div style={{
                  display: "flex", justifyContent: "center", gap: 10,
                  flexWrap: "wrap", marginBottom: 28,
                }}>
                  {[
                    { icon: <Shield size={12} />, text: "AES-256 Encryption" },
                    { icon: <Activity size={12} />, text: "Blockchain Anchoring" },
                    { icon: <Users size={12} />, text: "Secure Sharing" },
                  ].map((f) => (
                    <div key={f.text} style={{
                      padding: "6px 14px", borderRadius: 20,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: 11, fontWeight: 500,
                      color: "var(--text-muted)",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{ color: "var(--accent-teal)" }}>{f.icon}</span>
                      {f.text}
                    </div>
                  ))}
                </div>

                <Link
                  href="/dashboard/documents"
                  className="btn-primary"
                  style={{
                    textDecoration: "none",
                    padding: "14px 36px",
                    fontSize: 14,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Upload size={16} />
                  Upload & Secure Document
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right — Recent Activity */}
        <div>
          <GlassCard hoverable={false} style={{ position: "sticky", top: 100 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>
                <Clock size={15} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent-teal)" }} />
                Recent Activity
              </h3>
            </div>

            {recentAudit.length > 0 ? (
              <AuditTimeline entries={recentAudit} />
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                <Shield size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p style={{ fontSize: 13 }}>No activity yet</p>
              </div>
            )}

            {entries.length > 5 && (
              <Link
                href="/dashboard/audit"
                className="nav-link"
                style={{
                  width: "100%",
                  textAlign: "center",
                  marginTop: 14,
                  display: "block",
                  textDecoration: "none",
                }}
              >
                View Full Audit Trail →
              </Link>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={!!shareDoc}
        onClose={() => setShareDoc(null)}
        document={shareDoc}
      />
    </div>
  );
}
