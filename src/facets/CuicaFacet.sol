// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IAggregatorV3} from "../interfaces/chainlink/IAggregatorV3.sol";
import {AppStorage, RoundData, CuicaFacetStorage, OracleFacetStorage} from "../libraries/AppStorage.sol";
// import {RedstoneFacet} from "./RedstoneFacet.sol";
// import {PythFacet} from "./PythFacet.sol";
// import {ChainlinkFacet} from "./ChainlinkFacet.sol";

import {console} from "forge-std/console.sol";

contract CuicaFacet is IAggregatorV3, AppStorage {
    function decimals() external pure returns (uint8) {
        return 8;
    }

    function description() external pure returns (string memory) {
        return "MXN / USD";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function latestAnswer() external view returns (int256) {
        (, int256 answer,,,) = latestRoundData();
        return answer;
    }

    function latestRound() public view returns (uint80) {
        CuicaFacetStorage storage cs = accessCuicaStorage();
        return cs.lastRound;
    }

    function latestRoundData()
        public
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        uint80 lastRound = latestRound();
        CuicaFacetStorage storage cs = accessCuicaStorage();
        if (lastRound == 0) {
            return (0, 0, 0, 0, 0);
        } else {
            return (
                lastRound,
                cs.roundInfo[lastRound].answer,
                cs.roundInfo[lastRound].startedAt,
                cs.roundInfo[lastRound].updatedAt,
                lastRound
            );
        }
    }

    function aggregateAndPublishRound() external {
        OracleFacetStorage storage osr = accessOracleStorage(REDSTONE_STORAGE_POSITION);
        OracleFacetStorage storage osp = accessOracleStorage(PYTH_STORAGE_POSITION);
        OracleFacetStorage storage osc = accessOracleStorage(CHAINLINK_STORAGE_POSITION);

        int256 sum = osr.storedLatestPrice + osp.storedLatestPrice + osc.storedLatestPrice;
        uint256 average = uint256(sum) / 3;

        CuicaFacetStorage storage cs = accessCuicaStorage();

        uint80 thisRoundId = cs.lastRound + 1;
        cs.lastRound += 1;

        RoundData memory newRound = RoundData({
            roundId: thisRoundId,
            answer: int256(average),
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: thisRoundId
        });
        cs.roundInfo[thisRoundId] = newRound;
    }
}
