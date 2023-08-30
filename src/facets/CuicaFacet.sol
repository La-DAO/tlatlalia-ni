// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IAggregatorV3} from "../interfaces/chainlink/IAggregatorV3.sol";
import {
  AppStorage, RoundData, CuicaFacetStorage, OracleFacetStorage
} from "../libraries/AppStorage.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IConnext} from "../interfaces/connext/IConnext.sol";
import {BulletinSigning} from "../BulletinSigning.sol";

contract CuicaFacet is IAggregatorV3, BulletinSigning, AppStorage {
  /// Events
  event RoundPublished(uint80 roundId, int256 answer);
  event SetConnext(address newConnext);

  /// Custom Errors
  error CuicaFacet__setters_invalidInput();
  error CuicaFacet_aggregateAndPublishRound_notWithinTimeLimit();
  error CuicaFacet__tlatlaliaNi_wrongSizeArrays();

  uint256 internal constant WORKING_TIME_GAP_LIMIT = 5 minutes;

  function decimals() external pure returns (uint8) {
    return 8;
  }

  function description() external pure returns (string memory) {
    return "MXN / USD";
  }

  function version() external pure returns (string memory) {
    return VERSION;
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
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
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

  function connext() public view returns(address) {
    CuicaFacetStorage storage cs = accessCuicaStorage();
    return cs.connext;
  }

  /**
   * @notice After storing oracle data aggregate by averaging and publish new round.
   * 
   * Requirements:
   * - All oracles must have been updated within `WORKING_TIME_GAP_LIMIT`.
   */
  function aggregateAndPublishRound() external {
    OracleFacetStorage storage osr = accessOracleStorage(REDSTONE_STORAGE_POSITION);
    OracleFacetStorage storage osp = accessOracleStorage(PYTH_STORAGE_POSITION);
    OracleFacetStorage storage osc = accessOracleStorage(CHAINLINK_STORAGE_POSITION);

    uint256 timestampLimit = block.timestamp - WORKING_TIME_GAP_LIMIT;
    if (
      osr.workingTimestamp < timestampLimit || osp.workingTimestamp < timestampLimit
        || osc.workingTimestamp < timestampLimit
    ) {
      revert CuicaFacet_aggregateAndPublishRound_notWithinTimeLimit();
    }

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
    
    emit RoundPublished(thisRoundId, int256(average));
  }

  /**
   * @notice Sing the price to domain bulletins.
   * 
   * @param domain according to ~tlatlalia-ni/scripts/utilsConnext.js
   * @param destination contract address of {PriceBulletin.sol}
   * @param cost per connext: see References
   * 
   * @dev References:
   * - https://docs.connext.network/developers/reference/sdk/sdkbase#estimaterelayerfee
   * - connextSdkBase.estimateRelayerFee(params); 
   *   In where `params`:
   *   const params = {
   *        originDomain: "6648936",
   *        destinationDomain: "1869640809",
   *    };
   */
  function tlatlaliaNi(
    uint32 domain,
    address destination,
    uint256 cost,
    uint8 v,
    bytes32 r,
    bytes32 s
  )
    external
    payable
    returns (bool, bytes memory)
  {
    CuicaFacetStorage storage cs = accessCuicaStorage();
    RoundData memory lastRound = cs.roundInfo[cs.lastRound];

    bytes memory bulletinSignatureData = abi.encode(lastRound, v, r, s);

    IConnext(cs.connext).xcall{value: cost}(
      // _destination: Domain ID of the destination chain
      domain,
      // _to: address of the target contract
      destination,
      // _asset: address of the token contract
      address(0),
      // _delegate: address that can revert or forceLocal on destination
      destination,
      // _amount: amount of tokens to transfer
      0,
      // _slippage: can be anything between 0-10000 becaus
      // the maximum amount of slippage the user will accept in BPS, 30 == 0.3%
      0,
      // _callData: the encoded calldata to send
      bulletinSignatureData
    );

    return (true, bulletinSignatureData);
  }

  function setConnext(address connext_) external {
    if (connext_ == address(0)) {
      revert CuicaFacet__setters_invalidInput();
    }
    LibDiamond.enforceIsContractOwner();

    CuicaFacetStorage storage cs = accessCuicaStorage();
    cs.connext = connext_;

    emit SetConnext(connext_);
  }

  /**
   * @notice Returns the struct hash for `latestRoundData`.
   */
  function getStructHashLastRoundData() public view returns (bytes32) {
    CuicaFacetStorage storage cs = accessCuicaStorage();
    uint80 lastRoundId = cs.lastRound;
    RoundData memory lastRound = cs.roundInfo[lastRoundId];
    return getStructHashRoundData(lastRound);
  }

  /**
   * @dev Returns the domainSeparator for "CuicaFacet", reading chain Id from blockchain.
   */
  function _getDomainSeparator() internal view override returns (bytes32) {
    return keccak256(
      abi.encode(
        TYPEHASH, NAMEHASH, VERSIONHASH, address(this), keccak256(abi.encode(block.chainid))
      )
    );
  }
}
