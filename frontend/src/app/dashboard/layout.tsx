"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { WalletProvider } from "@/context/WalletContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ display: "flex", flex: 1 }}>
          <Sidebar />
          <main
            style={{
              flex: 1,
              padding: "32px 36px",
              maxWidth: "calc(100% - 260px)",
              overflowY: "auto",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </WalletProvider>
  );
}
