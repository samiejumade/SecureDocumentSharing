// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title SecureDocForwarder
 * @notice Standard ERC-2771 forwarder contract for managing gasless meta-transactions.
 */
contract SecureDocForwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("SecureDocForwarder") {}
}
