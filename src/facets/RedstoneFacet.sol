// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {MainConsumerBase} from "../external/redstone/MainConsumerBase.sol";
import {OracleFacetStorage} from "../libraries/AppStorage.sol";

contract RedstoneFacet is MainConsumerBase {
    OracleFacetStorage internal _SRedstoneFacet;

    bytes32 private constant REDSTONE_TICKER = bytes32("MXN");

    uint8 private constant DECIMALS_REDSTONE = 8;

    function getPrice_Redstone() public view returns (int256) {
        return _SRedstoneFacet.storedLatestPrice;
    }

    function getPriceLastUpdate_Redstone() public view returns (uint256) {
        return _SRedstoneFacet.lastTimestamp;
    }

    function storePrice_Redstone() public {
        _SRedstoneFacet.storedLatestPrice = int256(getOracleNumericValueFromTxMsg(REDSTONE_TICKER));
        _SRedstoneFacet.lastTimestamp = block.timestamp;
    }
}
