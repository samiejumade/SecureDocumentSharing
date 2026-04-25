"use client";

import { type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  padding?: number;
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlassCard({
  children,
  padding = 24,
  hoverable = true,
  onClick,
  className = "",
  style,
}: GlassCardProps) {
  return (
    <div
      className={`glass-card ${hoverable ? "" : "glass-card--static"} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        padding,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
