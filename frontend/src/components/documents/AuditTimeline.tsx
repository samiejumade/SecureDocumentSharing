"use client";

import { Shield, Users, Eye, Lock, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import type { AuditEntry } from "@/lib/store";

interface AuditTimelineProps {
  entries: AuditEntry[];
  filter?: string;
}

const ICON_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  anchor: { icon: <Shield size={18} />, color: "#22d3ee" },
  access: { icon: <Users size={18} />, color: "#a78bfa" },
  view:   { icon: <Eye size={18} />,   color: "#34d399" },
  revoke: { icon: <AlertTriangle size={18} />, color: "#f87171" },
  verify: { icon: <CheckCircle size={18} />, color: "#818cf8" },
  update: { icon: <FileText size={18} />, color: "#fbbf24" },
};

export default function AuditTimeline({ entries, filter }: AuditTimelineProps) {
  const filtered =
    !filter || filter === "all"
      ? entries
      : entries.filter((e) => e.category === filter);

  if (filtered.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
        <Lock size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 15 }}>No audit events yet</p>
        <p style={{ fontSize: 13, marginTop: 6 }}>
          Upload and share a document to see the immutable trail.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {filtered.map((entry, i) => {
        const iconConf = ICON_MAP[entry.category] || ICON_MAP.anchor;
        const date = new Date(entry.timestamp);
        const timeAgo = getTimeAgo(date);
        const formattedDate = date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        return (
          <div
            key={entry.id || i}
            className="activity-item"
            style={{ padding: 20, animationDelay: `${i * 0.04}s` }}
          >
            <div
              className="activity-icon"
              style={{
                background: `${iconConf.color}15`,
                color: iconConf.color,
              }}
            >
              {iconConf.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                {entry.action}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {entry.actor}{" "}
                <span style={{ color: "var(--text-muted)" }}>· {entry.fileName}</span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                {timeAgo}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "'Fira Code', monospace",
                  color: "var(--accent-teal)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "rgba(34,211,238,0.08)",
                }}
                title={formattedDate}
              >
                tx: {entry.txHash.slice(0, 6)}...{entry.txHash.slice(-4)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? "s" : ""} ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
