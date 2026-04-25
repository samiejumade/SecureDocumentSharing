"use client";

import { Shield } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="fade-in" style={{ padding: "0" }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            width: 220,
            height: 28,
            borderRadius: 8,
            background: "rgba(99,102,241,0.06)",
            marginBottom: 10,
          }}
        />
        <div
          style={{
            width: 340,
            height: 16,
            borderRadius: 6,
            background: "rgba(99,102,241,0.04)",
          }}
        />
      </div>

      {/* Stats skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass-card"
            style={{
              padding: 24,
              animation: `fadeIn 0.4s ease ${i * 0.08}s both`,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(99,102,241,0.06)",
                marginBottom: 14,
              }}
            />
            <div
              style={{
                width: 48,
                height: 32,
                borderRadius: 6,
                background: "rgba(99,102,241,0.06)",
                marginBottom: 6,
              }}
            />
            <div
              style={{
                width: 90,
                height: 14,
                borderRadius: 4,
                background: "rgba(99,102,241,0.04)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 28,
        }}
      >
        <div
          className="glass-card"
          style={{ padding: 28, minHeight: 200 }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 160,
              gap: 12,
              opacity: 0.5,
            }}
          >
            <Shield
              size={28}
              color="var(--accent-teal)"
              style={{ opacity: 0.4 }}
            />
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Loading…
            </div>
          </div>
        </div>
        <div
          className="glass-card"
          style={{ padding: 28, minHeight: 200 }}
        >
          <div
            style={{
              width: 120,
              height: 18,
              borderRadius: 6,
              background: "rgba(99,102,241,0.06)",
              marginBottom: 20,
            }}
          />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 10,
                background: "rgba(99,102,241,0.03)",
                marginBottom: 10,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
