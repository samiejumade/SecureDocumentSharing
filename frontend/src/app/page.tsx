"use client";

import { Shield, Lock, Globe, Hash, Zap, ChevronRight, Scale, Film, Briefcase, CheckCircle, ArrowRight, FileText, Users, Activity } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Vertical = "legal" | "script" | "vault";

const VERTICALS: { key: Vertical; label: string; desc: string; icon: React.ReactNode; color: string; features: string[] }[] = [
  {
    key: "legal",
    label: "LegalVault",
    desc: "Law Firms & Legal Teams",
    icon: <Scale size={22} />,
    color: "#22d3ee",
    features: ["Matter Rooms", "Privilege Wall", "Digital Seal", "E-Discovery Export"],
  },
  {
    key: "script",
    label: "ScriptSafe",
    desc: "Production Houses & Screenwriters",
    icon: <Film size={22} />,
    color: "#a78bfa",
    features: ["IP Timestamp Proof", "Watermarked Viewer", "Draft Progression", "Royalty Splits"],
  },
  {
    key: "vault",
    label: "VaultDesk",
    desc: "Startups & Business Teams",
    icon: <Briefcase size={22} />,
    color: "#c084fc",
    features: ["Deal Rooms", "NDA Vault", "Link Expiry", "Open-Tracking Analytics"],
  },
];

const STATS = [
  { value: "256-bit", label: "AES Encryption", icon: <Lock size={18} /> },
  { value: "< 2s", label: "Revocation Time", icon: <Zap size={18} /> },
  { value: "100%", label: "Tamper Detection", icon: <Shield size={18} /> },
  { value: "∞", label: "Audit History", icon: <Activity size={18} /> },
];

const STEPS = [
  { num: "01", title: "Upload & Encrypt", desc: "Your document is encrypted with AES-256-GCM right in your browser. Raw bytes never leave unencrypted.", icon: <Lock size={24} /> },
  { num: "02", title: "Pin to IPFS", desc: "The encrypted blob is pinned to decentralized IPFS storage via Pinata. No single point of failure.", icon: <Globe size={24} /> },
  { num: "03", title: "Anchor on Blockchain", desc: "A tamper-proof hash is anchored on the Polygon blockchain. Every action is immutable.", icon: <Hash size={24} /> },
  { num: "04", title: "Share Securely", desc: "Recipients get a magic link. Access is granted on-chain. Revoke anytime, and it is instant.", icon: <Users size={24} /> },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ── Hero ─── */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "90vh",
          textAlign: "center",
          padding: "60px 20px",
        }}
      >
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="SecureDocChain Logo"
          width={72}
          height={72}
          style={{
            borderRadius: 20,
            marginBottom: 36,
            boxShadow: "0 0 60px -10px rgba(34, 211, 238, 0.4)",
          }}
        />

        <h1
          className="gradient-text"
          style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, marginBottom: 20 }}
        >
          SecureDocChain
        </h1>

        <p
          style={{
            fontSize: 20,
            color: "var(--text-secondary)",
            maxWidth: 600,
            lineHeight: 1.6,
            marginBottom: 40,
          }}
        >
          Tamper-proof document sharing powered by{" "}
          <strong style={{ color: "var(--text-primary)" }}>AES-256 encryption</strong>,{" "}
          <strong style={{ color: "var(--text-primary)" }}>decentralized IPFS storage</strong>, and{" "}
          <strong style={{ color: "var(--text-primary)" }}>Polygon blockchain anchoring</strong>.
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 48,
          }}
        >
          {[
            { icon: <Lock size={14} />, label: "Client-Side Encryption" },
            { icon: <Globe size={14} />, label: "Decentralized Storage" },
            { icon: <Hash size={14} />, label: "Immutable Audit Trail" },
            { icon: <Zap size={14} />, label: "Instant Revocation" },
          ].map((pill) => (
            <div
              key={pill.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-subtle)",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              {pill.icon}
              {pill.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 14 }}>
          <Link
            href="/login"
            className="btn-primary"
            style={{
              fontSize: 16,
              padding: "16px 44px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Get Started
            <ChevronRight size={18} />
          </Link>
          <a
            href="#how-it-works"
            className="btn-secondary"
            style={{
              fontSize: 16,
              padding: "16px 36px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            How It Works
          </a>
        </div>
      </section>

      {/* ── Stats Bar ─── */}
      <section style={{ padding: "40px 20px", borderTop: "1px solid var(--border-subtle)" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
          }}
        >
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ color: "var(--accent-teal)", marginBottom: 8, display: "flex", justifyContent: "center" }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─── */}
      <section id="how-it-works" style={{ padding: "80px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            How It <span className="gradient-text">Works</span>
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: 16,
              marginBottom: 56,
              maxWidth: 550,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Four steps to tamper-proof document sharing. No blockchain knowledge required.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 20,
            }}
          >
            {STEPS.map((step, i) => (
              <div key={step.num} className="glass-card" style={{ padding: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "rgba(34,211,238,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-teal)",
                    }}
                  >
                    {step.icon}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-teal)", letterSpacing: 1 }}>
                    STEP {step.num}
                  </div>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Verticals ─── */}
      <section style={{ padding: "80px 20px", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, textAlign: "center", marginBottom: 12 }}>
            Built for <span className="gradient-text">Every Industry</span>
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: 16,
              marginBottom: 56,
              maxWidth: 550,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            One platform, three specialized workspaces tailored to your industry.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {VERTICALS.map((v) => (
              <div
                key={v.key}
                className="glass-card"
                style={{ padding: 32, textAlign: "center" }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: `${v.color}12`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    color: v.color,
                  }}
                >
                  {v.icon}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{v.label}</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                  {v.desc}
                </p>
                <div style={{ textAlign: "left" }}>
                  {v.features.map((f) => (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 0",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      <CheckCircle size={14} color={v.color} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─── */}
      <section style={{ padding: "80px 20px" }}>
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            textAlign: "center",
            padding: "60px 40px",
            borderRadius: 28,
            background: "var(--gradient-hero-subtle)",
            border: "1px solid rgba(34,211,238,0.15)",
          }}
        >
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
            Ready to Secure Your Documents?
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 16,
              marginBottom: 32,
              maxWidth: 450,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Join teams that trust blockchain-backed security for their most sensitive documents.
          </p>
          <Link
            href="/login"
            className="btn-primary"
            style={{
              fontSize: 16,
              padding: "16px 48px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Start Securing Documents
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─── */}
      <footer
        style={{
          padding: "32px 20px",
          borderTop: "1px solid var(--border-subtle)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--gradient-hero)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={14} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>SecureDocChain</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 500, margin: "0 auto" }}>
          Powered by Polygon Blockchain · Encrypted with AES-256-GCM · Stored on IPFS
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
          © {new Date().getFullYear()} SecureDocChain. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
