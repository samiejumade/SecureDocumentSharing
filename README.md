# 🔐 SecureDocChain

**SecureDocChain** is a cutting-edge decentralized application (dApp) designed for secure, immutable, and transparent document sharing. By leveraging the power of InterPlanetary File System (IPFS) via Pinata and EVM-compatible blockchain smart contracts, SecureDocChain ensures that your most sensitive files are tamper-proof and fully controlled by you.

---

## ✨ Key Features

- **Decentralized Storage:** Documents are uploaded to IPFS (via Pinata V2 SDK), ensuring there is no single central server that can be compromised or taken down.
- **Cryptographic Immutability:** Every uploaded file generates a unique Content Identifier (CID). The document is mathematically guaranteed to be tamper-proof.
- **Blockchain Verification:** The file's CID and ownership details are permanently recorded on-chain using a highly secure smart contract.
- **Modern User Experience:** Built with Next.js 14+, Tailwind CSS 4, and Framer Motion for a premium, extremely responsive, and clean user interface.
- **Granular Access Control:** Define exactly who can view and interact with your shared documents through trustless smart contract logic.

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Web3 Interaction:** [Ethers.js v6](https://docs.ethers.org/v6/)
- **IPFS Integration:** [Pinata SDK v2](https://www.pinata.cloud/)

### **Smart Contracts**
- **Environment:** [Hardhat](https://hardhat.org/)
- **Language:** Solidity
- **Libraries:** [OpenZeppelin Contracts](https://www.openzeppelin.com/contracts) (Security & Standards)

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- A Web3 Wallet (e.g., [MetaMask](https://metamask.io/)) installed in your browser.

### 1. Clone the Repository
```bash
git clone https://github.com/samiejumade/SecureDocumentSharing.git
cd SecureDocumentSharing
```

### 2. Configure Environment Variables
You will need to set up environment variables for both the **Frontend** and the **Contracts**.

**Frontend Configurations (`frontend/.env.local`):**
Create a `.env.local` file inside the `frontend` directory based on the provided `.env.example`.
```env
NEXT_PUBLIC_PINATA_JWT="your_pinata_jwt_token_here"
NEXT_PUBLIC_CONTRACT_ADDRESS="your_deployed_smart_contract_address"
```

**Contract Configurations (`contracts/.env`):**
Create an `.env` file inside the `contracts` directory.
```env
PRIVATE_KEY="your_wallet_private_key"
RPC_URL="your_blockchain_rpc_url"
```

### 3. Smart Contract Setup
Navigate to the `contracts` directory, install dependencies, and deploy the SecureDocChain smart contract.
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network <your_network>
```
*Note: Make sure to copy the deployed contract address and paste it into your frontend environment variables!*

### 4. Frontend Setup
Navigate to the `frontend` directory, install dependencies, and start the local development server.
```bash
cd ../frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:3000` to interact with SecureDocChain!

---

## ⚠️ Disclaimer
*This repository contains a Proof of Concept (PoC) architecture. It is built for demonstration purposes and the smart contracts have not yet undergone formal professional auditing. Do not store highly sensitive unencrypted information on public IPFS networks.*
