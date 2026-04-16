import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const SecureDocChain = await ethers.getContractFactory("SecureDocChain");
  const secureDocChain = await SecureDocChain.deploy();

  await secureDocChain.waitForDeployment();

  const address = await secureDocChain.getAddress();
  console.log("SecureDocChain deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
