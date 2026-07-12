"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { formatFileSize } from "@/lib/store";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, selectedFile, onClear, disabled }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "txt", "png", "jpg", "jpeg"];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        alert(`Invalid file type. Allowed formats: ${ALLOWED_EXTENSIONS.join(", ").toUpperCase()}`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert("File size exceeds the 50MB limit for secure client-side encryption.");
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected, disabled]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (selectedFile) {
    return (
      <div className="fade-in" style={{ marginTop: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px",
            borderRadius: 14,
            background: "rgba(34, 211, 238, 0.06)",
            border: "1px solid rgba(34, 211, 238, 0.15)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(34, 211, 238, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-teal)",
              flexShrink: 0,
            }}
          >
            <FileText size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selectedFile.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {formatFileSize(selectedFile.size)} · {selectedFile.type || "Unknown type"}
            </div>
          </div>
          <button
            onClick={onClear}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(251, 113, 133, 0.1)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-red)",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`dropzone ${dragOver ? "drag-over" : ""}`}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInput}
        style={{ display: "none" }}
        accept=".pdf,.docx,.doc,.txt,.xlsx,.pptx,.png,.jpg,.jpeg,.zip"
      />
      <Upload size={36} color="var(--accent-teal)" style={{ marginBottom: 16 }} />
      <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>
        Drag & drop your document here
      </p>
      <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
        or click to browse · PDF, DOCX, TXT, XLSX up to 500 MB
      </p>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        {["AES-256 Encrypted", "IPFS Pinned", "Blockchain Anchored"].map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(34, 211, 238, 0.06)",
              color: "var(--accent-teal)",
              fontWeight: 500,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
