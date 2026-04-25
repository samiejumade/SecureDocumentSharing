"use client";

import { useState } from "react";
import { Clock, Download, Filter } from "lucide-react";
import AuditTimeline from "@/components/documents/AuditTimeline";
import { useAuditLog } from "@/hooks/useDocuments";

const FILTERS = [
  { key: "all",    label: "All Events" },
  { key: "anchor", label: "Anchored" },
  { key: "access", label: "Access" },
  { key: "view",   label: "Viewed" },
  { key: "revoke", label: "Revoked" },
  { key: "verify", label: "Verified" },
];

export default function AuditPage() {
  const { entries } = useAuditLog();
  const [filter, setFilter] = useState("all");

  const filteredCount =
    filter === "all"
      ? entries.length
      : entries.filter((e) => e.category === filter).length;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
            <Clock size={24} style={{ verticalAlign: "middle", marginRight: 10, color: "var(--accent-teal)" }} />
            Immutable Audit Trail
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Every action is permanently recorded on the Polygon blockchain. Nothing can be hidden or altered.
          </p>
        </div>
        <button
          className="btn-secondary"
          style={{ padding: "10px 18px", fontSize: 13, flexShrink: 0 }}
        >
          <Download size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Export Report
        </button>
      </div>

      {/* Filter Chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              border: "1px solid",
              transition: "all 0.2s ease",
              background: filter === f.key ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.03)",
              borderColor: filter === f.key ? "rgba(34,211,238,0.25)" : "var(--border-subtle)",
              color: filter === f.key ? "var(--accent-teal)" : "var(--text-secondary)",
            }}
          >
            {f.label}
            {f.key === "all" && entries.length > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: "rgba(34,211,238,0.12)",
                  color: "var(--accent-teal)",
                }}
              >
                {entries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Showing {filteredCount} event{filteredCount !== 1 ? "s" : ""}
      </div>

      {/* Timeline */}
      <AuditTimeline entries={entries} filter={filter} />
    </div>
  );
}
