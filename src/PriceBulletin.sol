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
  event EarnedReward(address indexed owner, address indexed token, uint256 amount);
  event ClaimedReward(address indexed owner, address indexed token, uint256 amount);
  event SetAuthorizedPublisher(address publisher, bool status);
  event SetReward(address token, uint256 amount);

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

  ///@notice Maps `user`  => `reward token` => `amount` of pending rewards
  mapping(address => mapping(IERC20 => uint256)) public rewards;

  IERC20 public rewardToken;
  
  uint256 public rewardAmount;

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

  /**
   * @notice Updates the price bulletin with latest round and sets `_recordedRoundInfo`.
   * The most gas efficient to update price bulletin with no log or claim for rewards.
   *
   * @param callData encoded RounData with v,r,s signature values
   *
   * @dev Function restricts using the same or old RoundData.
   */
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

  /**
   * @notice Sets the active `rewardToken` and `rewardAmount` for updating
   * this {PriceBulletin} contract.
   *
   * @param token of reward
   * @param amount of reward
   *
   * @dev Requirements:
   * - Must emit a `SetReward` event
   * - Must revert if token or amount are zero
   * - Must be restricted to `onlyOwner`
   */
  function setReward(IERC20 token, uint256 amount) public onlyOwner {
    _checkRewardTokenAndAmount(token, amount);
    rewardToken = token;
    rewardAmount = amount;
    emit SetReward(address(token), amount);
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
   * @dev Logs earned rewards.
   *
   * @param user earning rewards
   * @param token of rewards
   * @param amount of rewards
   *
   * Requirements:
   * - Must emit a `EarnedReward` event
   * - Must revert if user, token or amount are zero
   * - Must update `rewards` state
   */
  function _logEarnedReward(address user, IERC20 token, uint256 amount) internal {
    _checkRewardTokenAndAmount(token, amount);
    rewards[user][token] += amount;
    emit EarnedReward(user, address(token), amount);
  }

  /**
   * @dev Distributes a claim for rewards.
   *
   * @param user owning the rewards
   * @param receiver of the claimed rewards
   * @param token of reward
   * @param amount of reward
   *
   * Requirements:
   * - Must emit a `ClaimedRewards` event
   * - Must revert if receiver, token or amount are zero.
   * - Must revert if `amount` is greater than corresponding `rewards` state
   * - Must update `rewards` state before sending tokens.
   * - Must use "Safe" transfer method.
   */
  function _distributeReward(address user, address receiver, IERC20 token, uint256 amount) internal {
    _checkRewardTokenAndAmount(token, amount);

    uint256 pendingRewards = rewards[user][token];

    if (pendingRewards < amount) {
      revert PriceBulletin__distributeReward_notEnoughPendingRewards();
    }

    rewards[user][token] = pendingRewards - amount;

    if (token.balanceOf(address(this)) < amount) {
      revert PriceBulletin__distributeReward_notEnoughRewardBalance();
    }

    token.safeTransfer(receiver, amount);

    emit ClaimedReward(user, address(token), amount);
  }

  /**
   * @dev Reverts if inputs are zero.
   *
   * @param token to check
   * @param amount to check
   */
  function _checkRewardTokenAndAmount(IERC20 token, uint256 amount) private pure {
    if (address(token) == address(0) || amount == 0) {
      revert PriceBulletin__checkRewardTokenAndAmount_noRewardTokenOrAmount();
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
