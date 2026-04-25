"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  style,
  ...props
}: ButtonProps) {
  const baseClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
      ? "btn-danger"
      : variant === "ghost"
      ? "btn-ghost"
      : "btn-secondary";

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: "8px 16px", fontSize: 13 },
    md: { padding: "12px 24px", fontSize: 14 },
    lg: { padding: "16px 36px", fontSize: 16 },
  };

  return (
    <button
      className={`${baseClass} ${className}`}
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: disabled || loading ? 0.6 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <div
          style={{
            width: 16,
            height: 16,
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "currentColor",
            borderRadius: "50%",
            animation: "shield-spin 0.8s linear infinite",
          }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
