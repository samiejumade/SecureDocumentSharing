"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDocuments,
  getAuditEntries,
  type StoredDocument,
  type AuditEntry,
} from "@/lib/store";

import { useWallet } from "@/context/WalletContext";
import { getAccessLevel } from "@/lib/web3";

/**
 * Hook to reactively read documents from localStorage.
 * Initializes empty to avoid SSR hydration mismatches,
 * then immediately loads data from localStorage in useEffect.
 */
export function useDocuments() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [mounted, setMounted] = useState(false);
  const { wallet } = useWallet();

  const refresh = useCallback(() => {
    const allDocs = getDocuments();
    if (!wallet) {
      setDocuments(allDocs);
      return;
    }
    const filtered = allDocs.filter((d) => {
      const isOwner = d.ownerAddress.toLowerCase() === wallet.address.toLowerCase() && !d.recipientAddress;
      const isRecipient = d.recipientAddress?.toLowerCase() === wallet.address.toLowerCase();
      return isOwner || (isRecipient && d.status !== "revoked");
    });
    setDocuments(filtered);
  }, [wallet]);

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

  // Background verification of shared documents on-chain
  useEffect(() => {
    if (!wallet || documents.length === 0) return;

    const verifyOnChainPermissions = async () => {
      let updated = false;
      const verifiedDocs = await Promise.all(
        documents.map(async (doc) => {
          // If it's a shared document where I am the recipient
          if (
            doc.status === "shared" &&
            doc.ownerAddress.toLowerCase() !== wallet.address.toLowerCase()
          ) {
            try {
              const level = await getAccessLevel(doc.docHash, wallet.address);
              if (level === 0) {
                updated = true;
                return { ...doc, status: "revoked" as const };
              } else if (level !== doc.accessLevel) {
                updated = true;
                return { ...doc, accessLevel: level };
              }
            } catch (err) {
              // Ignore network errors to avoid false revocation triggers
            }
          }
          return doc;
        })
      );

      if (updated) {
        localStorage.setItem("sdc_documents", JSON.stringify(verifiedDocs));
        window.dispatchEvent(new CustomEvent("sdc:documents-changed"));
        refresh();
      }
    };

    verifyOnChainPermissions();
  }, [wallet, documents, refresh]);

  return { documents, refresh, mounted };
}

/**
 * Hook to reactively read audit entries from localStorage.
 */
export function useAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const { wallet } = useWallet();

  const refresh = useCallback(() => {
    const allEntries = getAuditEntries();
    if (!wallet) {
      setEntries(allEntries);
      return;
    }
    const myDocs = getDocuments().filter((d) => {
      const isOwner = d.ownerAddress.toLowerCase() === wallet.address.toLowerCase() && !d.recipientAddress;
      const isRecipient = d.recipientAddress?.toLowerCase() === wallet.address.toLowerCase();
      return isOwner || (isRecipient && d.status !== "revoked");
    });
    const myDocHashes = new Set(myDocs.map((d) => d.docHash.toLowerCase()));

    const filtered = allEntries.filter((entry) => {
      const isActor = entry.actor.toLowerCase() === wallet.address.toLowerCase();
      const isRelatedToMyDoc = myDocHashes.has(entry.docHash.toLowerCase());
      return isActor || isRelatedToMyDoc;
    });
    setEntries(filtered);
  }, [wallet]);

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
