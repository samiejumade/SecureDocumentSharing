"use client";

interface BadgeProps {
  label: string;
  color?: string;
  size?: "sm" | "md";
}

export default function Badge({ label, color = "var(--accent-teal)", size = "sm" }: BadgeProps) {
  return (
    <span
      className="stat-badge"
      style={{
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        fontSize: size === "sm" ? 11 : 12,
        padding: size === "sm" ? "3px 8px" : "4px 12px",
      }}
    >
      {label}
    </span>
  );
}
