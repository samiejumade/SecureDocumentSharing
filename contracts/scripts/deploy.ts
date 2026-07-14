import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // 1. Deploy the Forwarder Contract
  console.log("Deploying SecureDocForwarder...");
  const SecureDocForwarder = await ethers.getContractFactory("SecureDocForwarder");
  const forwarder = await SecureDocForwarder.deploy();
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log("SecureDocForwarder deployed to:", forwarderAddress);

  // 2. Deploy SecureDocChain UUPS proxy
  console.log("Deploying SecureDocChain implementation and UUPS proxy...");
  const SecureDocChain = await ethers.getContractFactory("SecureDocChain");

  // Pass initialOwner and forwarderAddress to initialize()
  const proxy = await upgrades.deployProxy(
    SecureDocChain,
    [deployer.address, forwarderAddress],
    { kind: "uups" }
  );

  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress
  );

  console.log("──────────────────────────────────────────");
  console.log("Forwarder address:      ", forwarderAddress);
  console.log("Proxy address:          ", proxyAddress);
  console.log("Implementation address: ", implAddress);
  console.log("Owner:                  ", deployer.address);
  console.log("──────────────────────────────────────────");
  console.log(
    "\nUpdate your frontend/.env.local:\n" +
      `  NEXT_PUBLIC_CONTRACT_ADDRESS=${proxyAddress}\n` +
      `  NEXT_PUBLIC_FORWARDER_ADDRESS=${forwarderAddress}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
