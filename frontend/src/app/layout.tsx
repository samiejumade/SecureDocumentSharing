import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Web3Provider from "@/context/Web3Provider";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SecureDocChain | Blockchain-Powered Document Sharing",
  description:
    "Tamper-proof, encrypted document sharing for law firms, production houses, and startups — powered by Polygon and IPFS.",
  keywords: ["blockchain", "document sharing", "encryption", "IPFS", "Polygon", "secure"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        {/* Animated background orbs */}
        <div className="bg-orb bg-orb--blue" />
        <div className="bg-orb bg-orb--purple" />
        <div className="bg-orb bg-orb--pink" />

        {/* App shell */}
        <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
          <Web3Provider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </Web3Provider>
        </div>
      </body>
    </html>
  );
}
