# 🔐 SecureDocChain

**Blockchain-Powered Secure Document Sharing Platform**

SecureDocChain is a production-ready decentralized application (dApp) for encrypting, anchoring, sharing, and managing sensitive documents on the blockchain. Documents are encrypted client-side with AES-256-GCM, stored on IPFS via Pinata, and anchored immutably on the Polygon Amoy testnet — with granular access control, revocable sharing, and a full audit trail.

![Polygon Amoy](https://img.shields.io/badge/Network-Polygon%20Amoy-blueviolet)
![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black)
![Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Key Features

### 🔑 Authentication
- **Magic Link Login** — Passwordless email authentication via MailerSend
- **Multi-Wallet Login** — Connect any EVM wallet (MetaMask, Coinbase Wallet, WalletConnect, Trust Wallet, Rainbow) through Reown AppKit
- **Session Management** — Persistent auth sessions with token-based verification

### 📄 Document Security
- **AES-256-GCM Encryption** — Client-side encryption before upload; keys never leave the browser
- **IPFS Storage** — Encrypted documents stored on Pinata's IPFS gateway
- **Blockchain Anchoring** — Document hash + CID recorded immutably on Polygon Amoy via smart contract
- **Integrity Verification** — One-click on-chain verification of document authenticity

### 🤝 Sharing & Access Control
- **Granular Permissions** — Three access levels: View Only, Edit, Full Access (Edit & Sign)
- **Magic Link Sharing** — Recipients receive a secure email with a magic link to access the document
- **IPFS Download & Decryption** — Recipients can download and decrypt the document directly in-browser
- **Access Revocation** — Owner can revoke access at any time; revoked links are immediately blocked server-side
- **Digital Signatures** — Full-access recipients can apply digital signatures to documents

### 📊 Audit & Monitoring
- **Immutable Audit Trail** — Every anchor, share, access, and revoke event is logged
- **Blockchain Explorer Links** — Direct links to Polygonscan for every transaction
- **Dashboard Analytics** — Real-time document count, sharing stats, and security metrics

### 🔒 Transaction Integrity
- **No Fake Successes** — If a blockchain transaction fails or is rejected in the wallet, the UI clearly shows the failure. No mock data is generated.
- **Error Transparency** — IPFS upload failures and chain errors are shown to the user with actionable messages

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org/) | App Router, API routes, SSR |
| [React 19](https://react.dev/) | UI framework |
| [Ethers.js v6](https://docs.ethers.org/v6/) | Smart contract interactions |
| [wagmi v3](https://wagmi.sh/) | React hooks for Ethereum |
| [Reown AppKit](https://reown.com/) | Multi-wallet modal (WalletConnect protocol) |
| [viem](https://viem.sh/) | TypeScript Ethereum utility library |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Lucide React](https://lucide.dev/) | Icon system |
| [MailerSend SDK](https://www.mailersend.com/) | Transactional emails (magic links & sharing notifications) |
| [Pinata SDK v2](https://www.pinata.cloud/) | IPFS file upload & pinning |

### Smart Contracts
| Technology | Purpose |
|---|---|
| [Solidity ^0.8](https://soliditylang.org/) | Contract language |
| [Hardhat](https://hardhat.org/) | Development & deployment framework |
| [OpenZeppelin](https://www.openzeppelin.com/) | Security primitives (Pausable, AccessControl) |
| [Polygon Amoy Testnet](https://amoy.polygonscan.com/) | Deployment network |

### Encryption
| Algorithm | Usage |
|---|---|
| AES-256-GCM | Document encryption (client-side, Web Crypto API) |
| keccak256 | Document hash generation for on-chain anchoring |

---

## 📁 Project Structure

```
SecureDocumentSharing/
├── contracts/                    # Solidity smart contracts
│   ├── contracts/                # Contract source files
│   ├── scripts/                  # Deployment scripts
│   └── hardhat.config.ts
│
├── frontend/                     # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── access/verify/   # Access revocation registry API
│   │   │   │   ├── auth/login/      # Magic link authentication API
│   │   │   │   ├── share/           # Document sharing & email API
│   │   │   │   └── upload/          # IPFS upload proxy API
│   │   │   ├── auth/verify/         # Magic link verification page
│   │   │   ├── dashboard/
│   │   │   │   ├── documents/       # Document management page
│   │   │   │   ├── audit/           # Audit trail page
│   │   │   │   └── settings/        # User settings page
│   │   │   ├── login/               # Authentication page
│   │   │   └── share/[token]/       # Recipient document view page
│   │   │
│   │   ├── components/
│   │   │   ├── documents/           # DocumentCard, ShareModal, ManageAccessModal,
│   │   │   │                        # SecurityFlow, UploadZone, WalletGuide
│   │   │   ├── layout/              # Navbar, Sidebar
│   │   │   └── ui/                  # GlassCard, Button, Badge, Modal
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.tsx       # Email/session auth state
│   │   │   ├── WalletContext.tsx     # Wallet connection state (wagmi)
│   │   │   └── Web3Provider.tsx      # wagmi + AppKit provider
│   │   │
│   │   ├── hooks/
│   │   │   └── useDocuments.ts       # Document store hook
│   │   │
│   │   └── lib/
│   │       ├── auth.ts              # Token generation & session management
│   │       ├── contract.ts          # ABI + contract address + Amoy config
│   │       ├── crypto.ts            # AES-256-GCM encrypt/decrypt
│   │       ├── ipfs.ts              # IPFS upload/fetch via Pinata
│   │       ├── store.ts             # Local document & audit storage
│   │       ├── wagmi.ts             # Wagmi adapter + Reown config
│   │       └── web3.ts              # Contract interactions (anchor, grant, revoke)
│   │
│   ├── .env.local                   # Environment variables
│   ├── next.config.ts               # Webpack config for wagmi compat
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Git](https://git-scm.com/)
- A crypto wallet ([MetaMask](https://metamask.io/), [Coinbase Wallet](https://www.coinbase.com/wallet), or any WalletConnect-compatible wallet)
- Polygon Amoy testnet added to your wallet ([details below](#polygon-amoy-network))
- Test MATIC from a [faucet](https://faucet.polygon.technology/)

### 1. Clone the Repository
```bash
git clone https://github.com/samiejumade/SecureDocumentSharing.git
cd SecureDocumentSharing
```

### 2. Smart Contract Setup
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network amoy
```
Copy the deployed contract address for the next step.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables
Create `frontend/.env.local`:
```env
# IPFS (Pinata)
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
NEXT_PUBLIC_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

# Smart Contract
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address

# Email Service (MailerSend)
MAILERSEND_API_KEY=your_mailersend_api_key
MAILERSEND_FROM_EMAIL=noreply@your-trial-domain.mlsender.net

# Multi-Wallet (Reown AppKit)
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_PINATA_JWT` | [Pinata Dashboard](https://app.pinata.cloud/) → API Keys |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | From step 2 (contract deployment) |
| `MAILERSEND_API_KEY` | [MailerSend Dashboard](https://app.mailersend.com/) → Integration → API Tokens |
| `MAILERSEND_FROM_EMAIL` | MailerSend → Domains → your trial domain |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | [Reown Cloud](https://cloud.reown.com/) → Create Project |

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** First load takes ~30 seconds as webpack compiles the wagmi/AppKit modules. Subsequent loads are fast (<100ms).

---

## 🌐 Polygon Amoy Network

Add this network to your wallet to interact with SecureDocChain:

| Parameter | Value |
|---|---|
| **Network Name** | Polygon Amoy Testnet |
| **Chain ID** | 80002 |
| **RPC URL** | `https://rpc-amoy.polygon.technology` |
| **Currency Symbol** | MATIC |
| **Block Explorer** | `https://amoy.polygonscan.com` |

### Faucets (Free Test MATIC)
- [Polygon Faucet](https://faucet.polygon.technology/) — Official
- [Alchemy Faucet](https://www.alchemy.com/faucets/polygon-amoy) — Alternative

---

## 🔄 User Flows

### Document Owner Flow
```
Login (Email or Wallet) → Upload Document → Client-Side AES-256-GCM Encryption
→ Upload to IPFS (Pinata) → Anchor Hash on Polygon → Share with Recipients
→ Manage Access → Revoke if Needed
```

### Recipient Flow
```
Receive Email with Magic Link → Click Link → Access Verified (server-side check)
→ Download & Decrypt Document → Annotate / Sign (if permitted)
```

### Revocation Flow
```
Owner clicks Revoke → On-chain revokeAccess() → Server-side revocation registered
→ Recipient's magic link now shows "Access Revoked" → Download blocked
```

---

## 🔐 Security Architecture

| Layer | Implementation |
|---|---|
| **Encryption** | AES-256-GCM via Web Crypto API (keys generated client-side, never sent to server) |
| **Storage** | Encrypted blobs on IPFS (Pinata); plaintext never touches a server |
| **Integrity** | keccak256 document hash anchored on-chain; verifiable at any time |
| **Access Control** | Smart contract `grantAccess` / `revokeAccess` with 3 permission levels |
| **Revocation** | On-chain + server-side revocation registry; magic links checked before download |
| **Authentication** | Time-limited magic links (15 min) for email; EIP-1193 for wallet |
| **Wallet Support** | Reown AppKit (WalletConnect v2 protocol) — any EVM wallet |

---

## 📜 Smart Contract Functions

| Function | Type | Description |
|---|---|---|
| `createDocument` | Write | Anchor a document hash + CID on-chain |
| `updateDocument` | Write | Update CID for a new version |
| `grantAccess` | Write | Grant view/edit/sign access to a user |
| `batchGrantAccess` | Write | Grant access to multiple users at once |
| `revokeAccess` | Write | Revoke access and increment key version |
| `logAccess` | Write | Record that a user accessed a document |
| `verifyIntegrity` | Read | Verify document CID matches on-chain record |
| `getDocumentState` | Read | Get full document metadata |
| `getAccessLevel` | Read | Check a user's permission level |
| `getAccessLog` | Read | Get all addresses that accessed a document |
| `documentExists` | Read | Check if a document is anchored |
| `pause` / `unpause` | Write | Emergency circuit breaker (admin only) |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

This application uses the **Polygon Amoy Testnet** for demonstration and development purposes. The smart contracts have not undergone formal professional auditing. For production deployment on mainnet, ensure:
- Smart contracts are professionally audited
- Environment variables and API keys are properly secured
- Session management is upgraded to httpOnly cookies / JWTs
- IPFS pinning is configured for persistence
- Rate limiting is applied to all API routes

---

<p align="center">
  Built with 🛡️ by <a href="https://github.com/samiejumade">Samir Jumade</a>
</p>
