// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {MainConsumerBase} from "../external/redstone/MainConsumerBase.sol";

struct RedstoneFacetStorage {
    int256 storedLatestPrice;
    uint256 decimals;
    uint256 lastTimestamp;
}

contract RedstoneFacet is MainConsumerBase {
    bytes32 private constant REDSTONE_TICKER = bytes32("MXN");

    RedstoneFacetStorage internal _SRedstoneFacet;

    constructor() {
        _SRedstoneFacet.decimals = 8;
    }

    function get_MXNUSD_Price_Redstone() public view returns (int256) {
        return _SRedstoneFacet.storedLatestPrice;
    }

    function store_MXNUSD_Price_Redstone() public {
        _SRedstoneFacet.storedLatestPrice = int256(getOracleNumericValueFromTxMsg(REDSTONE_TICKER));
        _SRedstoneFacet.lastTimestamp = block.timestamp;
    }
}
