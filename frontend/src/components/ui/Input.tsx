"use client";

import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, style, ...props }, ref) => {
    return (
      <div style={{ marginBottom: 16 }}>
        {label && (
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: "relative" }}>
          {icon && (
            <div
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className="input-field"
            style={{
              paddingLeft: icon ? 44 : 18,
              borderColor: error ? "var(--accent-red)" : undefined,
              ...style,
            }}
            {...props}
          />
        </div>
        {error && (
          <p style={{ fontSize: 12, color: "var(--accent-red)", marginTop: 6 }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
