// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {MainDemoConsumerBase} from "@redstone-finance/evm-connector/contracts/data-services/MainDemoConsumerBase.sol";
import {AppStorage, OracleFacetStorage} from "../libraries/AppStorage.sol";

contract RedstoneFacet is AppStorage, MainDemoConsumerBase {
    /// events
    event RedstoneFacePriceStored(uint256 price, uint256 publisherTimestamp);

    /// custom errors
    error RedstoneFacet_timestampFromTooLongFuture();
    error RedstoneFacet_timestampTooOld();

    bytes32 private constant REDSTONE_TICKER = bytes32("MXN");

    uint8 private constant DECIMALS_REDSTONE = 8;

    uint256 private constant LIMI_TIMESTAMP_AHEAD_SECONDS = 5 minutes;
    uint256 private constant LIMIT_TIMESTAMP_DELAY_SECONDS = 5 minutes;

    function getPrice_Redstone() public view returns (int256) {
        OracleFacetStorage storage os = accessOracleStorage(REDSTONE_STORAGE_POSITION);
        return os.storedLatestPrice;
    }

    function getPriceLastUpdate_Redstone() public view returns (uint256) {
        OracleFacetStorage storage os = accessOracleStorage(REDSTONE_STORAGE_POSITION);
        return os.lastTimestamp;
    }

    function storePrice_Redstone() public {
        OracleFacetStorage storage os = accessOracleStorage(REDSTONE_STORAGE_POSITION);

        uint256 extractedPrice = getOracleNumericValueFromTxMsg(REDSTONE_TICKER);
        os.storedLatestPrice = int256(extractedPrice);
        os.lastTimestamp = block.timestamp;

        emit RedstoneFacePriceStored(extractedPrice, block.timestamp);
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
