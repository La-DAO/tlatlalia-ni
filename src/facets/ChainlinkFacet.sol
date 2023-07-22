// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IAggregatorV3} from "../interfaces/chainlink/IAggregatorV3.sol";
import {OracleFacetStorage} from "../libraries/AppStorage.sol";

contract ChainlinkFacet {
    OracleFacetStorage internal _SChainlinkFacet;

    /// events
    event ChainlinkFacePriceStored(uint256 price, uint256 publisherTimestamp);

    /// custom errors
    error ChainlinkFacet_lessThanOrZeroAnswer();
    error ChainlinkComputedFeed_noRoundId();
    error ChainlinkComputedFeed_noValidUpdateAt();
    error ChainlinkComputedFeed_staleFeed();

    uint8 private constant DECIMALS_CHAINLINK = 8;

    ///@dev Chainlink network 'usd/mxn' contract on gnosis chain.
    // https://docs.chain.link/data-feeds/price-feeds/addresses?network=gnosis-chain
    IAggregatorV3 private constant CHAINLINK = IAggregatorV3(0xe9cea51a7b1b9B32E057ff62762a2066dA933cD2);

    uint256 private constant CHAINLINK_TIMEOUT = 86400 seconds;

    function getPrice_Chainlink() public view returns (int256) {
        return _SChainlinkFacet.storedLatestPrice;
    }

    function getPriceLastUpdate_Chainlink() public view returns (uint256) {
        return _SChainlinkFacet.lastTimestamp;
    }

    function storePrice_Chainlink() public {
        (, int256 answer,, uint256 updatedAt, uint80 answeredInRound) = CHAINLINK.latestRoundData();

        if (answer <= 0) revert ChainlinkFacet_lessThanOrZeroAnswer();
        if (answeredInRound <= 0) revert ChainlinkComputedFeed_noRoundId();
        if (updatedAt > block.timestamp || updatedAt == 0) revert ChainlinkComputedFeed_noValidUpdateAt();
        if (block.timestamp - updatedAt > CHAINLINK_TIMEOUT) revert ChainlinkComputedFeed_staleFeed();

        _SChainlinkFacet.storedLatestPrice = answer;
        _SChainlinkFacet.lastTimestamp = updatedAt;

        emit ChainlinkFacePriceStored(uint256(answer), updatedAt);
    }
}
