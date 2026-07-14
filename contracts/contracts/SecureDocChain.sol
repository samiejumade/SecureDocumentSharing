// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./SecureDocStorage.sol";

/**
 * @title SecureDocChain
 * @notice UUPS-upgradeable document sharing registry with tiered access control and ERC-2771 Gasless Transaction support.
 * @dev All state lives in SecureDocStorage. This contract contains ONLY logic
 *      and events. No state variables may be declared here.
 *
 *      Deployed behind an ERC-1967 proxy. Upgrades are authorised by the
 *      contract owner via _authorizeUpgrade().
 */
contract SecureDocChain is
    SecureDocStorage,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    // ── Events ──────────────────────────────────────

    event DocumentCreated(
        bytes32 indexed docHash,
        string cid,
        address indexed owner,
        string docType,
        bool ipTimestamp,
        uint256 ts
    );
    event DocumentUpdated(
        bytes32 indexed docHash,
        string newCid,
        uint256 version,
        uint256 keyVersion,
        uint256 ts
    );
    event AccessGranted(
        bytes32 indexed docHash,
        address indexed grantee,
        uint8 level,
        uint256 ts
    );
    event AccessRevoked(
        bytes32 indexed docHash,
        address indexed grantee,
        uint256 newKeyVersion,
        uint256 ts
    );
    event DocumentAccessed(
        bytes32 indexed docHash,
        address indexed accessor,
        uint256 ts
    );

    // ── Constructor (disables initializers on implementation) ────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ── Initializer (called once via proxy) ─────────

    /**
     * @notice Initialise proxy state. Replaces the constructor for proxied contracts.
     * @param initialOwner The address that becomes the contract owner.
     * @param forwarder The trusted forwarder address for ERC-2771 gasless meta-transactions.
     */
    function initialize(address initialOwner, address forwarder) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        _trustedForwarder = forwarder;
    }

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
        bytes32 _docHash,
        string calldata _cid,
        string calldata _docType,
        uint256 _expiry,
        bool _ipTimestamp
    ) external whenNotPaused {
        require(documents[_docHash].owner == address(0), "Already exists");
        Document storage d = documents[_docHash];
        d.ipfsCID     = _cid;
        d.owner       = _msgSender();
        d.version     = 1;
        d.keyVersion  = 1;
        d.timestamp   = block.timestamp;
        d.docType     = _docType;
        d.expiry      = _expiry;
        d.ipTimestamp  = _ipTimestamp;
        d.accessLevel[_msgSender()] = 3;
        emit DocumentCreated(
            _docHash, _cid, _msgSender(), _docType, _ipTimestamp, block.timestamp
        );
    }

    /**
     * @notice Update the IPFS CID of an existing document (e.g. new version).
     * @param _dh      Document hash
     * @param _newCid  New IPFS CID after re-encryption
     */
    function updateDocument(
        bytes32 _dh,
        string calldata _newCid
    ) external whenNotPaused {
        require(documents[_dh].owner == _msgSender(), "Not owner");
        Document storage d = documents[_dh];
        d.ipfsCID   = _newCid;
        d.version  += 1;
        d.timestamp = block.timestamp;
        emit DocumentUpdated(
            _dh, _newCid, d.version, d.keyVersion, block.timestamp
        );
    }

    // ── Access Control ──────────────────────────────

    /**
     * @notice Grant access to a single user with a specified access level.
     * @param _dh     Document hash
     * @param _user   Recipient wallet address
     * @param _level  Access level: 1=view, 2=edit, 3=sign
     */
    function grantAccess(
        bytes32 _dh,
        address _user,
        uint8 _level
    ) external whenNotPaused {
        require(documents[_dh].owner == _msgSender(), "Not owner");
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
        bytes32 _dh,
        address[] calldata _users,
        uint8[] calldata _levels
    ) external whenNotPaused {
        require(documents[_dh].owner == _msgSender(), "Not owner");
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
    function revokeAccess(
        bytes32 _dh,
        address _user,
        string calldata _newCid
    ) external whenNotPaused {
        require(documents[_dh].owner == _msgSender(), "Not owner");
        Document storage d = documents[_dh];
        d.accessLevel[_user] = 0;
        d.ipfsCID    = _newCid;
        d.version   += 1;
        d.keyVersion += 1;
        d.timestamp  = block.timestamp;
        emit AccessRevoked(_dh, _user, d.keyVersion, block.timestamp);
        emit DocumentUpdated(
            _dh, _newCid, d.version, d.keyVersion, block.timestamp
        );
    }

    /**
     * @notice Revoke access for a user without changing the IPFS CID.
     * @param _dh   Document hash
     * @param _user User whose access is being revoked
     */
    function revokeAccess(bytes32 _dh, address _user) external whenNotPaused {
        require(documents[_dh].owner == _msgSender(), "Not owner");
        Document storage d = documents[_dh];
        d.accessLevel[_user] = 0;
        d.version   += 1;
        d.keyVersion += 1;
        d.timestamp  = block.timestamp;
        emit AccessRevoked(_dh, _user, d.keyVersion, block.timestamp);
        emit DocumentUpdated(
            _dh, d.ipfsCID, d.version, d.keyVersion, block.timestamp
        );
    }

    /**
     * @notice Revoke access for multiple users in a single transaction and update the CID.
     * @param _dh      Document hash
     * @param _users   Array of addresses to revoke access from
     * @param _newCid  New IPFS CID after re-encryption
     */
    function batchRevokeAccess(
        bytes32 _dh,
        address[] calldata _users,
        string calldata _newCid
    ) external whenNotPaused {
        require(documents[_dh].owner == _msgSender(), "Not owner");
        Document storage d = documents[_dh];
        for (uint256 i = 0; i < _users.length; i++) {
            d.accessLevel[_users[i]] = 0;
            emit AccessRevoked(_dh, _users[i], d.keyVersion + 1, block.timestamp);
        }
        d.ipfsCID    = _newCid;
        d.version   += 1;
        d.keyVersion += 1;
        d.timestamp  = block.timestamp;
        emit DocumentUpdated(
            _dh, _newCid, d.version, d.keyVersion, block.timestamp
        );
    }

    /**
     * @notice Revoke access for multiple users in a single transaction without changing the CID.
     * @param _dh      Document hash
     * @param _users   Array of addresses to revoke access from
     */
    function batchRevokeAccess(
        bytes32 _dh,
        address[] calldata _users
    ) external whenNotPaused {
        require(documents[_dh].owner == _msgSender(), "Not owner");
        Document storage d = documents[_dh];
        for (uint256 i = 0; i < _users.length; i++) {
            d.accessLevel[_users[i]] = 0;
            emit AccessRevoked(_dh, _users[i], d.keyVersion + 1, block.timestamp);
        }
        d.version   += 1;
        d.keyVersion += 1;
        d.timestamp  = block.timestamp;
        emit DocumentUpdated(
            _dh, d.ipfsCID, d.version, d.keyVersion, block.timestamp
        );
    }

    // ── Access Logging ──────────────────────────────

    /**
     * @notice Log that the caller accessed the document. Checks expiry.
     * @param _dh Document hash
     */
    function logAccess(bytes32 _dh) external whenNotPaused {
        require(
            documents[_dh].accessLevel[_msgSender()] >= 1,
            "Unauthorized"
        );
        if (documents[_dh].expiry > 0) {
            require(block.timestamp <= documents[_dh].expiry, "Expired");
        }
        accessLog[_dh].push(_msgSender());
        emit DocumentAccessed(_dh, _msgSender(), block.timestamp);
    }

    // ── View Functions ──────────────────────────────

    /**
     * @notice Verify document integrity by comparing on-chain CID with provided CID.
     */
    function verifyIntegrity(
        bytes32 _dh,
        string calldata _cid
    ) external view returns (bool) {
        return
            keccak256(abi.encodePacked(documents[_dh].ipfsCID)) ==
            keccak256(abi.encodePacked(_cid));
    }

    /**
     * @notice Get the current state of a document.
     */
    function getDocumentState(
        bytes32 _dh
    )
        external
        view
        returns (
            string memory cid,
            address owner,
            uint256 version,
            uint256 keyVersion,
            uint256 timestamp,
            string memory docType,
            uint256 expiry,
            bool ipTimestamp
        )
    {
        Document storage d = documents[_dh];
        return (
            d.ipfsCID,
            d.owner,
            d.version,
            d.keyVersion,
            d.timestamp,
            d.docType,
            d.expiry,
            d.ipTimestamp
        );
    }

    /**
     * @notice Check a user's access level for a document.
     * @return level 0=none, 1=view, 2=edit, 3=sign
     */
    function getAccessLevel(
        bytes32 _dh,
        address _user
    ) public view returns (uint8 level) {
        return documents[_dh].accessLevel[_user];
    }

    /**
     * @notice Check if a user has access and return their access level.
     */
    function hasAccess(
        bytes32 _dh,
        address _user
    ) external view returns (bool, uint8) {
        uint8 level = getAccessLevel(_dh, _user);
        if (
            documents[_dh].expiry > 0 &&
            block.timestamp > documents[_dh].expiry
        ) {
            return (false, 0);
        }
        return (level > 0, level);
    }

    /**
     * @notice Get the full access log for a document.
     */
    function getAccessLog(
        bytes32 _dh
    ) external view returns (address[] memory) {
        return accessLog[_dh];
    }

    /**
     * @notice Check if a document exists on-chain.
     */
    function documentExists(bytes32 _dh) external view returns (bool) {
        return documents[_dh].owner != address(0);
    }

    // ── Admin ────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ── ERC-2771 Context & Meta-transactions ────────

    /**
     * @notice Check if the address is the trusted forwarder.
     */
    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _trustedForwarder;
    }

    /**
     * @notice Update the trusted forwarder address.
     */
    function setTrustedForwarder(address forwarder) external onlyOwner {
        _trustedForwarder = forwarder;
    }

    function _msgSender() internal view override returns (address sender) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            // The authorizer address is appended at the end of the calldata
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    function _msgData() internal view override returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }

    // ── UUPS Upgrade Authorization ──────────────────

    /**
     * @dev Only the contract owner can authorise implementation upgrades.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
