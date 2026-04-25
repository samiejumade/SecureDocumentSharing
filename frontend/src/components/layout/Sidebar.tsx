"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Clock,
  Settings,
  Upload,
  Shield,
  LogOut,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";

const NAV_ITEMS = [
  { href: "/dashboard",           label: "Overview",     icon: <LayoutDashboard size={18} /> },
  { href: "/dashboard/documents", label: "Documents",    icon: <FileText size={18} /> },
  { href: "/dashboard/audit",     label: "Audit Trail",  icon: <Clock size={18} /> },
  { href: "/dashboard/settings",  label: "Settings",     icon: <Settings size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { disconnect } = useWallet();

  return (
    <aside
      style={{
        width: 260,
        minHeight: "calc(100vh - 69px)",
        borderRight: "1px solid var(--border-subtle)",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        background: "rgba(10, 14, 26, 0.5)",
        flexShrink: 0,
      }}
    >
      {/* Upload Button */}
      <Link
        href="/dashboard/documents"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "14px 20px",
          borderRadius: 14,
          background: "var(--gradient-btn)",
          color: "#0a0e1a",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
          marginBottom: 28,
          transition: "all 0.3s ease",
          boxShadow: "0 4px 20px -4px rgba(34, 211, 238, 0.3)",
        }}
      >
        <Upload size={16} />
        Secure Document
      </Link>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--accent-teal)" : "var(--text-secondary)",
                background: isActive ? "rgba(34, 211, 238, 0.06)" : "transparent",
                border: `1px solid ${isActive ? "rgba(34, 211, 238, 0.12)" : "transparent"}`,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ color: isActive ? "var(--accent-teal)" : "var(--text-muted)" }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
        {/* Security badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(34, 211, 238, 0.04)",
            border: "1px solid rgba(34, 211, 238, 0.08)",
            marginBottom: 12,
          }}
        >
          <Shield size={16} color="var(--accent-teal)" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-teal)" }}>
              End-to-End Encrypted
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              AES-256-GCM · Client-Side
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={disconnect}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 12,
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 13,
            transition: "all 0.2s ease",
          }}
        >
          <LogOut size={16} />
          Disconnect
        </button>
      </div>
    </aside>
  );
}
