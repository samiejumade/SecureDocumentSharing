"use client";

import { Shield, CheckCircle, ExternalLink } from "lucide-react";

export type FlowStep = "idle" | "encrypting" | "uploading" | "anchoring" | "done";

interface SecurityFlowProps {
  state: FlowStep;
  cid?: string;
  txHash?: string;
  error?: string;
}

export default function SecurityFlow({ state, cid, txHash, error }: SecurityFlowProps) {
  if (state === "idle") return null;

  // In-progress states
  if (state !== "done") {
    return (
      <div className="fade-in" style={{ padding: "20px 0" }}>
        {/* Spinning shield */}
        <div className="shield-container" style={{ marginBottom: 28 }}>
          <div className="shield-ring shield-ring--outer" />
          <div className="shield-ring shield-ring--inner" />
          <Shield size={32} color="var(--accent-teal)" />
        </div>

        <p
          style={{
            textAlign: "center",
            fontWeight: 600,
            fontSize: 16,
            marginBottom: 24,
            color: "var(--text-primary)",
          }}
        >
          Securing your document...
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <StepRow
            num={1}
            label="AES-256-GCM Client-Side Encryption"
            detail="Encrypting file bytes in your browser"
            state={state === "encrypting" ? "active" : "done"}
          />
          <StepRow
            num={2}
            label="Pinning Encrypted Blob to IPFS"
            detail="Uploading to Pinata decentralized storage"
            state={
              state === "uploading"
                ? "active"
                : state === "encrypting"
                ? "pending"
                : "done"
            }
          />
          <StepRow
            num={3}
            label="Anchoring Hash on Polygon Blockchain"
            detail="Creating immutable on-chain record"
            state={state === "anchoring" ? "active" : "pending"}
          />
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(251,113,133,0.08)",
              border: "1px solid rgba(251,113,133,0.2)",
              fontSize: 13,
              color: "var(--accent-red)",
            }}
          >
            ⚠ {error}
          </div>
        )}
      </div>
    );
  }

  // Done state
  return (
    <div className="fade-in" style={{ padding: "20px 0", textAlign: "center" }}>
      <div className="success-circle" style={{ marginBottom: 20 }}>
        <CheckCircle size={32} color="var(--accent-emerald)" />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        Document Securely Anchored
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
        Your document is now tamper-proof on the Polygon blockchain and pinned to IPFS.
      </p>

      {/* CID */}
      {cid && (
        <InfoBlock
          label="IPFS CID (Pinata)"
          value={cid}
          color="var(--accent-teal)"
          bgColor="rgba(34,211,238,0.06)"
          borderColor="rgba(34,211,238,0.15)"
        />
      )}

      {/* Tx Hash */}
      {txHash && (
        <>
          <InfoBlock
            label="Transaction Hash (Polygon Amoy)"
            value={txHash}
            color="var(--accent-emerald)"
            bgColor="rgba(52,211,153,0.06)"
            borderColor="rgba(52,211,153,0.15)"
          />
          <a
            href={`https://amoy.polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--accent-teal)",
              textDecoration: "none",
              marginBottom: 8,
            }}
          >
            <ExternalLink size={13} />
            View on Polygonscan
          </a>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ─── */

function StepRow({
  num,
  label,
  detail,
  state,
}: {
  num: number;
  label: string;
  detail: string;
  state: "active" | "done" | "pending";
}) {
  return (
    <div className={`step-item step-item--${state}`}>
      <div className={`step-dot step-dot--${state}`}>
        {state === "done" ? <CheckCircle size={16} /> : num}
      </div>
      <div>
        <div style={{ fontSize: 14 }}>{label}</div>
        {state === "active" && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{detail}</div>
        )}
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  color,
  bgColor,
  borderColor,
}: {
  label: string;
  value: string;
  color: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: 14,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        marginBottom: 12,
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 1,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontFamily: "monospace",
          color,
          wordBreak: "break-all",
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
