"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDocuments,
  getAuditEntries,
  type StoredDocument,
  type AuditEntry,
} from "@/lib/store";

/**
 * Hook to reactively read documents from localStorage.
 * Initializes empty to avoid SSR hydration mismatches,
 * then immediately loads data from localStorage in useEffect.
 */
export function useDocuments() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setDocuments(getDocuments());
  }, []);

  useEffect(() => {
    // Read from localStorage immediately on mount
    refresh();
    setMounted(true);

    // Same-tab document changes
    const handleCustom = () => refresh();
    window.addEventListener("sdc:documents-changed", handleCustom);

    // Cross-tab storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sdc_documents" || e.key === null) refresh();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("sdc:documents-changed", handleCustom);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh]);

  return { documents, refresh, mounted };
}

/**
 * Hook to reactively read audit entries from localStorage.
 */
export function useAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setEntries(getAuditEntries());
  }, []);

  useEffect(() => {
    refresh();
    setMounted(true);

    const handleCustom = () => refresh();
    window.addEventListener("sdc:audit-changed", handleCustom);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sdc_audit" || e.key === null) refresh();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("sdc:audit-changed", handleCustom);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh]);

  return { entries, refresh, mounted };
}
