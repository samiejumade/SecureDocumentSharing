// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title SecureDocStorage
 * @notice Isolated storage base contract for the SecureDocChain registry.
 * @dev All state variables MUST be declared here — never in the logic contract.
 *      This guarantees that storage slot ordering remains identical across
 *      proxy upgrades, preventing storage collisions.
 *
 *      RULES FOR FUTURE UPGRADES:
 *      1. NEVER remove or reorder existing variables.
 *      2. ONLY append new variables BEFORE the __gap array.
 *      3. Decrease the __gap size by the number of new slots added.
 */
abstract contract SecureDocStorage is Initializable {

    /// @dev Core document struct stored per docHash.
    struct Document {
        string   ipfsCID;                        // Encrypted blob CID on IPFS
        address  owner;                          // Document creator
        uint256  version;                        // Increments on edit / key rotation
        uint256  keyVersion;                     // Increments strictly on revocation
        uint256  timestamp;                      // Last modification timestamp
        string   docType;                        // 'legal' | 'script' | 'business'
        uint256  expiry;                         // Unix timestamp, 0 = no expiry
        bool     ipTimestamp;                    // ScriptSafe IP proof flag
        mapping(address => uint8) accessLevel;   // 0=none, 1=view, 2=edit, 3=sign
    }

    /// @dev docHash => Document
    mapping(bytes32 => Document) internal documents;

    /// @dev docHash => list of addresses that accessed the document
    mapping(bytes32 => address[]) internal accessLog;

    address internal _trustedForwarder;

    /**
     * @dev Reserved storage slots for future state variable expansion.
     *      When adding a new variable, place it ABOVE this line and
     *      reduce the array size accordingly (e.g. uint256[48]).
     */
    uint256[49] private __gap;
}
