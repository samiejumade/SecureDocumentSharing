// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SecureDocChain
 * @notice Blockchain-anchored secure document sharing with tiered access control.
 * @dev Deployed on Polygon Amoy testnet. Documents are encrypted client-side,
 *      pushed to IPFS, and only the CID + permissions live on-chain.
 */
contract SecureDocChain is Ownable, Pausable {

    struct Document {
        string   ipfsCID;         // Encrypted blob CID on IPFS
        address  owner;
        uint256  version;         // Increments on edit or key rotation
        uint256  keyVersion;      // Increments strictly on revocation
        uint256  timestamp;
        string   docType;         // 'legal' | 'script' | 'business'
        uint256  expiry;          // 0 = no expiry
        bool     ipTimestamp;     // ScriptSafe IP proof flag
        mapping(address => uint8) accessLevel; // 0=none,1=view,2=edit,3=sign
    }

    mapping(bytes32 => Document)  public documents;
    mapping(bytes32 => address[]) public accessLog;

    // ── Events ──────────────────────────────────────
    event DocumentCreated(
        bytes32 indexed docHash, string cid,
        address indexed owner, string docType,
        bool ipTimestamp, uint256 ts
    );
    event DocumentUpdated(
        bytes32 indexed docHash, string newCid,
        uint256 version, uint256 keyVersion, uint256 ts
    );
    event AccessGranted(
        bytes32 indexed docHash, address indexed grantee,
        uint8 level, uint256 ts
    );
    event AccessRevoked(
        bytes32 indexed docHash, address indexed grantee,
        uint256 newKeyVersion, uint256 ts
    );
    event DocumentAccessed(
        bytes32 indexed docHash, address indexed accessor, uint256 ts
    );

    constructor() Ownable(msg.sender) {}

    // ── Document Management ─────────────────────────

    /**
     * @notice Register a new encrypted document on-chain.
     * @param _docHash  Unique document identifier (keccak256 of CID + owner + timestamp)
     * @param _cid      IPFS CID of the encrypted document blob
     * @param _docType  Vertical category: 'legal', 'script', or 'business'
     * @param _expiry   Unix timestamp for link expiry (0 = no expiry)
     * @param _ipTimestamp  Whether to flag this as an IP timestamp proof
     */
    function createDocument(
        bytes32 _docHash, string calldata _cid,
        string calldata _docType, uint256 _expiry, bool _ipTimestamp
    ) external whenNotPaused {
        require(documents[_docHash].owner == address(0), "Already exists");
        Document storage d = documents[_docHash];
        d.ipfsCID      = _cid;
        d.owner        = msg.sender;
        d.version      = 1;
        d.keyVersion   = 1;
        d.timestamp    = block.timestamp;
        d.docType      = _docType;
        d.expiry       = _expiry;
        d.ipTimestamp  = _ipTimestamp;
        d.accessLevel[msg.sender] = 3;
        emit DocumentCreated(_docHash, _cid, msg.sender, _docType, _ipTimestamp, block.timestamp);
    }

    /**
     * @notice Update the IPFS CID of an existing document (e.g. new version).
     * @param _dh      Document hash
     * @param _newCid  New IPFS CID after re-encryption
     */
    function updateDocument(bytes32 _dh, string calldata _newCid) external whenNotPaused {
        require(documents[_dh].owner == msg.sender, "Not owner");
        Document storage d = documents[_dh];
        d.ipfsCID    = _newCid;
        d.version   += 1;
        d.timestamp  = block.timestamp;
        emit DocumentUpdated(_dh, _newCid, d.version, d.keyVersion, block.timestamp);
    }

    // ── Access Control ──────────────────────────────

    /**
     * @notice Grant access to a single user with a specified access level.
     * @param _dh     Document hash
     * @param _user   Recipient wallet address
     * @param _level  Access level: 1=view, 2=edit, 3=sign
     */
    function grantAccess(bytes32 _dh, address _user, uint8 _level) external whenNotPaused {
        require(documents[_dh].owner == msg.sender, "Not owner");
        require(_level >= 1 && _level <= 3, "Bad level");
        documents[_dh].accessLevel[_user] = _level;
        emit AccessGranted(_dh, _user, _level, block.timestamp);
    }

    /**
     * @notice Grant access to multiple users in a single transaction.
     * @param _dh      Document hash
     * @param _users   Array of recipient wallet addresses
     * @param _levels  Array of access levels (must match _users length)
     */
    function batchGrantAccess(
        bytes32 _dh, address[] calldata _users, uint8[] calldata _levels
    ) external whenNotPaused {
        require(documents[_dh].owner == msg.sender, "Not owner");
        require(_users.length == _levels.length, "Length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            require(_levels[i] >= 1 && _levels[i] <= 3, "Bad level");
            documents[_dh].accessLevel[_users[i]] = _levels[i];
            emit AccessGranted(_dh, _users[i], _levels[i], block.timestamp);
        }
    }

    /**
     * @notice Revoke access for a user and re-encrypt the document.
     * @dev Increments keyVersion to invalidate old wrapped keys.
     * @param _dh      Document hash
     * @param _user    User whose access is being revoked
     * @param _newCid  New IPFS CID after re-encryption with new key
     */
    function revokeAccess(bytes32 _dh, address _user, string calldata _newCid) external whenNotPaused {
        require(documents[_dh].owner == msg.sender, "Not owner");
        Document storage d = documents[_dh];
        d.accessLevel[_user] = 0;
        d.ipfsCID    = _newCid;
        d.version   += 1;
        d.keyVersion += 1;
        d.timestamp  = block.timestamp;
        emit AccessRevoked(_dh, _user, d.keyVersion, block.timestamp);
        emit DocumentUpdated(_dh, _newCid, d.version, d.keyVersion, block.timestamp);
    }

    /**
     * @notice Revoke access for a user without changing the IPFS CID.
     * @param _dh      Document hash
     * @param _user    User whose access is being revoked
     */
    function revokeAccess(bytes32 _dh, address _user) external whenNotPaused {
        require(documents[_dh].owner == msg.sender, "Not owner");
        Document storage d = documents[_dh];
        d.accessLevel[_user] = 0;
        d.version   += 1;
        d.keyVersion += 1;
        d.timestamp  = block.timestamp;
        emit AccessRevoked(_dh, _user, d.keyVersion, block.timestamp);
        emit DocumentUpdated(_dh, d.ipfsCID, d.version, d.keyVersion, block.timestamp);
    }

    // ── Access Logging ──────────────────────────────

    /**
     * @notice Log that the caller accessed the document. Checks expiry.
     * @param _dh Document hash
     */
    function logAccess(bytes32 _dh) external whenNotPaused {
        require(documents[_dh].accessLevel[msg.sender] >= 1, "Unauthorized");
        if (documents[_dh].expiry > 0) {
            require(block.timestamp <= documents[_dh].expiry, "Expired");
        }
        accessLog[_dh].push(msg.sender);
        emit DocumentAccessed(_dh, msg.sender, block.timestamp);
    }

    // ── View Functions ──────────────────────────────

    /**
     * @notice Verify document integrity by comparing on-chain CID with provided CID.
     */
    function verifyIntegrity(bytes32 _dh, string calldata _cid) external view returns (bool) {
        return keccak256(abi.encodePacked(documents[_dh].ipfsCID)) ==
               keccak256(abi.encodePacked(_cid));
    }

    /**
     * @notice Get the current state of a document.
     */
    function getDocumentState(bytes32 _dh) external view
        returns (
            string memory cid, address owner, uint256 version,
            uint256 keyVersion, uint256 timestamp, string memory docType,
            uint256 expiry, bool ipTimestamp
        )
    {
        Document storage d = documents[_dh];
        return (d.ipfsCID, d.owner, d.version, d.keyVersion, d.timestamp, d.docType, d.expiry, d.ipTimestamp);
    }

    /**
     * @notice Check a user's access level for a document.
     * @return level 0=none, 1=view, 2=edit, 3=sign
     */
    function getAccessLevel(bytes32 _dh, address _user) public view returns (uint8 level) {
        return documents[_dh].accessLevel[_user];
    }

    /**
     * @notice Check if a user has access and return their access level.
     */
    function hasAccess(bytes32 _dh, address _user) external view returns (bool, uint8) {
        uint8 level = getAccessLevel(_dh, _user);
        if (documents[_dh].expiry > 0 && block.timestamp > documents[_dh].expiry) {
            return (false, 0);
        }
        return (level > 0, level);
    }

    /**
     * @notice Get the full access log for a document.
     */
    function getAccessLog(bytes32 _dh) external view returns (address[] memory) {
        return accessLog[_dh];
    }

    /**
     * @notice Check if a document exists on-chain.
     */
    function documentExists(bytes32 _dh) external view returns (bool) {
        return documents[_dh].owner != address(0);
    }

    // ── Admin ────────────────────────────────────────

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
