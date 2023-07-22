// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {MainDemoConsumerBase} from "@redstone-finance/evm-connector/contracts/data-services/MainDemoConsumerBase.sol";
// import {SignatureLib} from "@redstone-finance/evm-connector/contracts/libs/SignatureLib.sol";
// import {BitmapLib} from "@redstone-finance/evm-connector/contracts/libs/BitmapLib.sol";
import {OracleFacetStorage} from "../libraries/AppStorage.sol";

// import {console} from "forge-std/console.sol";

contract RedstoneFacet is MainDemoConsumerBase {
    OracleFacetStorage internal _SRedstoneFacet;

    /// custom errors
    error RedstoneFacet_timestampFromTooLongFuture();
    error RedstoneFacet_timestampTooOld();

    bytes32 private constant REDSTONE_TICKER = bytes32("MXN");

    uint8 private constant DECIMALS_REDSTONE = 8;

    uint256 private constant LIMI_TIMESTAMP_AHEAD_SECONDS = 5 minutes;
    uint256 private constant LIMIT_TIMESTAMP_DELAY_SECONDS = 5 minutes;

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

    function validateTimestamp(uint256 receivedTimestampMilliseconds) public view override {
        // Getting data timestamp from future seems quite unlikely
        // But we've already spent too much time with different cases
        // Where block.timestamp was less than dataPackage.timestamp.
        // Some blockchains may case this problem as well.
        // That's why we add MAX_BLOCK_TIMESTAMP_DELAY
        // and allow data "from future" but with a small delay
        uint256 receivedTimestampSeconds = receivedTimestampMilliseconds / 1000;

        if (block.timestamp < receivedTimestampSeconds) {
            if ((receivedTimestampSeconds - block.timestamp) > LIMI_TIMESTAMP_AHEAD_SECONDS) {
                revert RedstoneFacet_timestampFromTooLongFuture();
            }
        } else if ((block.timestamp - receivedTimestampSeconds) > LIMIT_TIMESTAMP_DELAY_SECONDS) {
            revert RedstoneFacet_timestampTooOld();
        }
    }
}
