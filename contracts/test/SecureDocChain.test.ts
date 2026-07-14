import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("SecureDocChain UUPS Upgradeable & Gasless Registry", function () {
  let secureDocChain: any;
  let forwarder: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // 1. Deploy the Forwarder
    const SecureDocForwarder = await ethers.getContractFactory("SecureDocForwarder");
    forwarder = await SecureDocForwarder.deploy();
    await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();

    // 2. Deploy SecureDocChain UUPS Proxy
    const SecureDocChain = await ethers.getContractFactory("SecureDocChain");
    secureDocChain = await upgrades.deployProxy(
      SecureDocChain,
      [owner.address, forwarderAddress],
      { kind: "uups" }
    );
    await secureDocChain.waitForDeployment();
  });

  it("Should initialize correctly", async function () {
    expect(await secureDocChain.owner()).to.equal(owner.address);
    expect(await secureDocChain.isTrustedForwarder(await forwarder.getAddress())).to.be.true;
  });

  it("Should create documents and set access level for owner", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("doc1"));
    await secureDocChain.connect(user1).createDocument(
      docHash,
      "ipfs_cid_1",
      "legal",
      0,
      false
    );
    expect(await secureDocChain.documentExists(docHash)).to.be.true;
    
    const state = await secureDocChain.getDocumentState(docHash);
    expect(state.cid).to.equal("ipfs_cid_1");
    expect(state.owner).to.equal(user1.address);
    expect(await secureDocChain.getAccessLevel(docHash, user1.address)).to.equal(3);
  });

  it("Should batch grant access", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("doc2"));
    await secureDocChain.connect(user1).createDocument(docHash, "cid2", "business", 0, false);
    
    await secureDocChain.connect(user1).batchGrantAccess(
      docHash,
      [user2.address, user3.address],
      [1, 2]
    );

    expect(await secureDocChain.getAccessLevel(docHash, user2.address)).to.equal(1);
    expect(await secureDocChain.getAccessLevel(docHash, user3.address)).to.equal(2);
  });

  it("Should batch revoke access with new CID", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("doc3"));
    await secureDocChain.connect(user1).createDocument(docHash, "cid3", "business", 0, false);
    await secureDocChain.connect(user1).batchGrantAccess(docHash, [user2.address, user3.address], [1, 2]);

    await secureDocChain.connect(user1)["batchRevokeAccess(bytes32,address[],string)"](docHash, [user2.address, user3.address], "new_cid3");

    expect(await secureDocChain.getAccessLevel(docHash, user2.address)).to.equal(0);
    expect(await secureDocChain.getAccessLevel(docHash, user3.address)).to.equal(0);
    
    const state = await secureDocChain.getDocumentState(docHash);
    expect(state.cid).to.equal("new_cid3");
    expect(state.keyVersion).to.equal(2);
  });

  it("Should upgrade the contract logic correctly via UUPS proxy", async function () {
    const SecureDocChainV2 = await ethers.getContractFactory("SecureDocChain");
    const upgraded = await upgrades.upgradeProxy(await secureDocChain.getAddress(), SecureDocChainV2, {
      kind: "uups",
    });
    expect(await upgraded.owner()).to.equal(owner.address);
  });

  it("Should execute gasless meta-transaction via forwarder", async function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("meta_doc"));
    const cid = "meta_cid";
    
    // Encode createDocument call data for user1
    const callData = secureDocChain.interface.encodeFunctionData("createDocument", [
      docHash,
      cid,
      "legal",
      0,
      false
    ]);

    const forwarderAddress = await forwarder.getAddress();
    const contractAddress = await secureDocChain.getAddress();
    const nonce = await forwarder.nonces(user1.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Build typed signature
    const domain = {
      name: "SecureDocForwarder",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: forwarderAddress,
    };

    const types = {
      ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint48" },
        { name: "data", type: "bytes" },
      ],
    };

    const value = {
      from: user1.address,
      to: contractAddress,
      value: 0,
      gas: 500000,
      nonce: nonce,
      deadline: deadline,
      data: callData,
    };

    const signature = await user1.signTypedData(domain, types, value);

    const request = {
      ...value,
      signature: signature
    };

    // Execute via forwarder (called by owner, simulating the relayer paying the gas fee)
    const tx = await forwarder.connect(owner).execute(request);
    await tx.wait();

    // Verify document was registered successfully on behalf of user1 (not owner)
    expect(await secureDocChain.documentExists(docHash)).to.be.true;
    const state = await secureDocChain.getDocumentState(docHash);
    expect(state.owner).to.equal(user1.address);
  });
});
