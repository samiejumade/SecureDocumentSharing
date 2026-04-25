import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    memoryBasedWorkersCount: true,
  },
  webpack: (config) => {
    // Wagmi connectors use dynamic imports for optional wallet SDKs.
    // These are caught with try/catch in the source, so we tell webpack
    // to treat them as empty modules rather than failing the build.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // Node.js builtins not available in browser
      fs: false,
      net: false,
      tls: false,
      encoding: false,
      "pino-pretty": false,
      // Optional wagmi connector peer dependencies
      accounts: false,
      porto: false,
      "porto/internal": false,
      "@metamask/connect-evm": false,
      "@walletconnect/ethereum-provider": false,
      "@coinbase/wallet-sdk": false,
    };
    return config;
  },
};

export default nextConfig;
