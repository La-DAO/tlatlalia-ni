// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IPriceBulletin} from "./interfaces/IPriceBulletin.sol";
import {ECDSA, BulletinSigning} from "./BulletinSigning.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {RoundData} from "./libraries/AppStorage.sol";

contract PriceBulletin is IPriceBulletin, UUPSUpgradeable, OwnableUpgradeable, BulletinSigning {
  /// Events
  event BulletinUpdated(uint80 rounId, int256 answer);
  event FailedBulletingUpdate(string err);
  event SetAuthorizedPublisher(address publisher, bool status);

  /// Errors
  error PriceBulletin__setter_invalidInput();
  error PriceBulletin__setter_noChange();

  bytes32 private constant CUICA_DOMAIN = keccak256(
    abi.encode(
      TYPEHASH,
      NAMEHASH,
      VERSIONHASH,
      address(0x8f78dc290e1701EC664909410661DC17E9c7b62b),
      keccak256(abi.encode(0x64))
    )
  );

  RoundData private _recordedRoundInfo;

  mapping(address => bool) public authorizedPublishers;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize() external initializer {
    __Ownable_init();
  }

  function decimals() external pure returns (uint8) {
    return 8;
  }

  function description() external pure returns (string memory) {
    return "priceBulletin MXN / USD";
  }

  function version() external pure returns (string memory) {
    return VERSION;
  }

  function latestAnswer() external view returns (int256) {
    (, int256 answer,,,) = latestRoundData();
    return answer;
  }

  function latestRound() public view returns (uint80) {
    return _recordedRoundInfo.roundId;
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

    if (lastRound == 0) {
      return (0, 0, 0, 0, 0);
    } else {
      return (
        lastRound,
        _recordedRoundInfo.answer,
        _recordedRoundInfo.startedAt,
        _recordedRoundInfo.updatedAt,
        lastRound
      );
    }
  }

  function xReceive(
    bytes32 transferId,
    uint256,
    address,
    address,
    uint32,
    bytes memory callData
  )
    external
    returns (bytes memory)
  {
    updateBulletin(callData);
    return abi.encode(transferId);
  }

  function updateBulletin(bytes memory callData) public returns (bool success) {
    (RoundData memory round, uint8 v, bytes32 r, bytes32 s) =
      abi.decode(callData, (RoundData, uint8, bytes32, bytes32));

    (bool valid, string memory err) = _checkValidBulletinUpdateData(round, v, r, s);

    if (valid) {
      success = true;
      emit BulletinUpdated(round.roundId, round.answer);
    } else {
      emit FailedBulletingUpdate(err);
    }
  }

  function setAuthorizedPublisher(address publisher, bool set) external onlyOwner {
    if (publisher == address(0)) {
      revert PriceBulletin__setter_invalidInput();
    }
    if (authorizedPublishers[publisher] == set) {
      revert PriceBulletin__setter_noChange();
    }

    authorizedPublishers[publisher] = set;

    emit SetAuthorizedPublisher(publisher, set);
  }

  function _checkValidBulletinUpdateData(
    RoundData memory round,
    uint8 v,
    bytes32 r,
    bytes32 s
  )
    internal
    returns (bool valid, string memory err)
  {
    uint80 currentRoundId = _recordedRoundInfo.roundId;
    uint80 newRoundId = round.roundId;

    bytes32 structHash = getStructHashRoundData(round);
    address presumedSigner = _getSigner(structHash, v, r, s);

    if (currentRoundId >= newRoundId) {
      valid = false;
      err = "Bad RoundId!";
    } else if (!authorizedPublishers[presumedSigner]) {
      valid = false;
      err = "Bad publisher!";
    } else {
      _recordedRoundInfo = round;
      valid = true;
      err = "";
    }
  }

  /**
   * @dev Returns the signer of the`structHash`.
   *
   * @param structHash of data
   * @param v signature value
   * @param r signautre value
   * @param s signature value
   */
  function _getSigner(
    bytes32 structHash,
    uint8 v,
    bytes32 r,
    bytes32 s
  )
    internal
    view
    returns (address presumedSigner)
  {
    bytes32 digest = getHashTypedDataV4Digest(structHash);
    presumedSigner = ECDSA.recover(digest, v, r, s);
  }

  function _getDomainSeparator() internal pure override returns (bytes32) {
    return CUICA_DOMAIN;
  }

  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
