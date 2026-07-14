import { ethers, upgrades } from "hardhat";

/**
 * Upgrade script for SecureDocChain UUPS proxy.
 *
 * Usage:
 *   PROXY_ADDRESS=0x... npx hardhat run scripts/upgrade.ts --network amoy
 *
 * The script reads PROXY_ADDRESS from the environment, deploys a new
 * implementation, and upgrades the proxy to point at it.
 */
async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("Set PROXY_ADDRESS env variable before running upgrade");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Upgrading proxy with the account:", deployer.address);

  const SecureDocChainV2 = await ethers.getContractFactory("SecureDocChain");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, SecureDocChainV2, {
    kind: "uups",
  });

  await upgraded.waitForDeployment();

  const newImplAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress
  );

  console.log("──────────────────────────────────────────");
  console.log("Proxy address (unchanged):", proxyAddress);
  console.log("New implementation:       ", newImplAddress);
  console.log("──────────────────────────────────────────");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
