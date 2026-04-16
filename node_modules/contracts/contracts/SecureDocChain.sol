// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SecureDocChain is Ownable {

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

    event DocumentCreated(bytes32 indexed docHash, string cid,
                          address indexed owner, string docType,
                          bool ipTimestamp, uint256 ts);
    event DocumentUpdated(bytes32 indexed docHash, string newCid,
                          uint256 version, uint256 keyVersion, uint256 ts);
    event AccessGranted(bytes32 indexed docHash, address indexed grantee,
                        uint8 level, uint256 ts);
    event AccessRevoked(bytes32 indexed docHash, address indexed grantee,
                        uint256 newKeyVersion, uint256 ts);
    event DocumentAccessed(bytes32 indexed docHash, address indexed accessor, uint256 ts);

    constructor() Ownable(msg.sender) {}

    function createDocument(
        bytes32 _docHash, string calldata _cid,
        string calldata _docType, uint256 _expiry, bool _ipTimestamp
    ) external {
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

    function grantAccess(bytes32 _dh, address _user, uint8 _level) external {
        require(documents[_dh].owner == msg.sender, "Not owner");
        require(_level >= 1 && _level <= 3, "Bad level");
        documents[_dh].accessLevel[_user] = _level;
        emit AccessGranted(_dh, _user, _level, block.timestamp);
    }

    function revokeAccess(bytes32 _dh, address _user, string calldata _newCid) external {
        require(documents[_dh].owner == msg.sender, "Not owner");
        Document storage d = documents[_dh];
        d.accessLevel[_user] = 0;
        d.ipfsCID    = _newCid;     // new CID after re-encryption
        d.version   += 1;
        d.keyVersion += 1;          // mandatory on revocation
        d.timestamp  = block.timestamp;
        emit AccessRevoked(_dh, _user, d.keyVersion, block.timestamp);
        emit DocumentUpdated(_dh, _newCid, d.version, d.keyVersion, block.timestamp);
    }

    function logAccess(bytes32 _dh) external {
        require(documents[_dh].accessLevel[msg.sender] >= 1, "Unauthorized");
        if (documents[_dh].expiry > 0) {
            require(block.timestamp <= documents[_dh].expiry, "Expired");
        }
        accessLog[_dh].push(msg.sender);
        emit DocumentAccessed(_dh, msg.sender, block.timestamp);
    }

    function verifyIntegrity(bytes32 _dh, string calldata _cid) external view returns (bool) {
        return keccak256(abi.encodePacked(documents[_dh].ipfsCID)) ==
               keccak256(abi.encodePacked(_cid));
    }

    function getDocumentState(bytes32 _dh) external view
        returns (string memory cid, uint256 version, uint256 keyVersion, uint256 expiry) {
        Document storage d = documents[_dh];
        return (d.ipfsCID, d.version, d.keyVersion, d.expiry);
    }
}
