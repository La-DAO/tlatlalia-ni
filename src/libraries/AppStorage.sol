// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

struct OracleFacetStorage {
    int256 storedLatestPrice;
    uint256 lastTimestamp;
}

contract AppStorage {
    bytes32 constant REDSTONE_STORAGE_POSITION = keccak256("redstone.storage");
    bytes32 constant PYTH_STORAGE_POSITION = keccak256("pyth.storage");
    bytes32 constant CHAINLINK_STORAGE_POSITION = keccak256("chainlink.storage");

    function accessOracleStorage(bytes32 slot) internal pure returns (OracleFacetStorage storage os) {
        assembly {
            os.slot := slot
        }
    }
}
