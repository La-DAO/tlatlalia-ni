// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test, console} from "forge-std/Test.sol";
import {PriceBulletin, RoundData, IERC20} from "../../src/PriceBulletin.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {ERC1967Proxy} from "../../src/libraries/openzeppelin/ERC1967Proxy.sol";

contract PriceBulletinUnitTests is Test {
  // PriceBulletin Expected events
  event BulletinUpdated(uint80 indexed rounId, int256 answer);
  event FailedBulletinUpdate(string err);
  event EarnedReward(address indexed owner, address indexed token, uint256 amount);
  event ClaimedReward(address indexed owner, address indexed token, uint256 amount);
  event SetAuthorizedPublisher(address publisher, bool status);
  event SetReward(address token, uint256 amount);

  uint256 constant OWNER_PK = 0xA;
  address public OWNER = vm.addr(OWNER_PK);

  uint256 constant PUBLISHER_PK = 0xB;
  address public PUBLISHER = vm.addr(PUBLISHER_PK);

  uint256 constant CHARLY_PK = 0xC;
  address public USER = vm.addr(CHARLY_PK);

  PriceBulletin public bulletin;

  RoundData public testRound = RoundData(40, 5820537, 1695414655, 1695414655, 40);

  MockERC20 public mockToken;
  address public rewardToken;
  uint256 public rewardAmount = 250e18;

  function setUp() public {
    vm.label(OWNER, "owner");
    vm.label(PUBLISHER, "publisher");

    mockToken = new MockERC20("MockToken", "MKT");
    rewardToken = address(mockToken);

    vm.startPrank(OWNER);
    address implementation = address(new PriceBulletin());
    bytes memory _data = abi.encodeWithSelector(
      PriceBulletin.initialize.selector, address(0x8f78dc290e1701EC664909410661DC17E9c7b62b)
    );
    address proxy = address(new ERC1967Proxy(implementation, _data));
    bulletin = PriceBulletin(proxy);
    bulletin.setAuthorizedPublisher(PUBLISHER, true);
    vm.stopPrank();
  }

  function test_ReturnDecimalValue() public {
    uint8 returnedDecimals = bulletin.decimals();
    assertEq(returnedDecimals, uint8(8));
  }

  function test_ReturnDescription() public {
    string memory returnedDescription = bulletin.description();
    string memory expectedDescription = "priceBulletin MXN / USD";
    bool equalStrings = equal_strings(returnedDescription, expectedDescription);
    assertEq(equalStrings, true);
  }

  function test_ReturnVersion() public {
    string memory returnedVersion = bulletin.version();
    string memory expectedVersion = "v1.0.0";
    bool equalStrings = equal_strings(returnedVersion, expectedVersion);
    assertEq(equalStrings, true);
  }

  function test_ReturnLatestRoundDataBeforeEstablished() public {
    (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
      bulletin.latestRoundData();
    assertEq(roundId, 0);
    assertEq(answer, 0);
    assertEq(startedAt, 0);
    assertEq(updatedAt, 0);
    assertEq(answeredInRound, 0);
  }

  function test_ReturnLatestAnswerBeforeEstablished() public {
    int256 answer = bulletin.latestAnswer();
    assertEq(answer, 0);
  }

  function test_ReturnLatestRoundBeforeEstablished() public {
    uint80 round = bulletin.latestRound();
    assertEq(round, 0);
  }

  function test_publisherSignAndUpdatesBulletin() public {
    test_ReturnLatestRoundDataBeforeEstablished();
    (uint8 v, bytes32 r, bytes32 s) = sign_round(testRound, PUBLISHER_PK);

    vm.expectEmit(true, false, false, true);
    emit BulletinUpdated(testRound.roundId, testRound.answer);
    publish_round(USER, testRound, v, r, s);

    (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
      bulletin.latestRoundData();
    assertEq(roundId, testRound.roundId);
    assertEq(answer, testRound.answer);
    assertEq(startedAt, testRound.startedAt);
    assertEq(updatedAt, testRound.updatedAt);
    assertEq(answeredInRound, testRound.answeredInRound);
  }

  function test_NonPublisherSignsAndAttemptsUpdatesBulletin() public {
    test_ReturnLatestRoundDataBeforeEstablished();
    (uint8 v, bytes32 r, bytes32 s) = sign_round(testRound, OWNER_PK);

    vm.expectEmit(true, false, false, true);
    emit FailedBulletinUpdate("Bad publisher!");
    publish_round(USER, testRound, v, r, s);

    (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
      bulletin.latestRoundData();
    assertEq(roundId, 0);
    assertEq(answer, 0);
    assertEq(startedAt, 0);
    assertEq(updatedAt, 0);
    assertEq(answeredInRound, 0);
  }

  function test_SameRoundIdAttemptsUpdatesBulletin(RoundData memory anotherRound) public {
    (uint8 v, bytes32 r, bytes32 s) = sign_round(testRound, PUBLISHER_PK);
    publish_round(USER, testRound, v, r, s);

    anotherRound.roundId = testRound.roundId;
    (v, r, s) = sign_round(anotherRound, PUBLISHER_PK);

    vm.expectEmit(true, false, false, true);
    emit FailedBulletinUpdate("Bad RoundId!");
    publish_round(USER, anotherRound, v, r, s);

    (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
      bulletin.latestRoundData();

    assertEq(roundId, testRound.roundId);
    assertEq(answer, testRound.answer);
    assertEq(startedAt, testRound.startedAt);
    assertEq(updatedAt, testRound.updatedAt);
    assertEq(answeredInRound, testRound.answeredInRound);
  }

  function test_updateBulletinNeverReverts(
    RoundData memory round,
    uint128 privateKey,
    address user
  )
    public
  {
    vm.assume(privateKey > 0);
    (uint8 v, bytes32 r, bytes32 s) = sign_round(round, privateKey);
    publish_round(user, round, v, r, s);
  }

  function test_setReward(address token, uint128 amount) public {
    if (token == address(0) || amount == 0) {
      vm.expectRevert();
      set_reward(token, amount);
    } else {
      vm.expectEmit(true, true, false, true);
      emit SetReward(token, uint256(amount));
      set_reward(token, amount);
    }
  }

  function testFail_setRewardNotOwner(address notAnOwner) public {
    vm.assume(notAnOwner != OWNER);

    vm.prank(notAnOwner);
    bulletin.setReward(IERC20(rewardToken), rewardAmount);
  }

  function test_UpdatesBulletinWithRewardLog() public {
    set_reward(rewardToken, rewardAmount);
    (uint8 v, bytes32 r, bytes32 s) = sign_round(testRound, PUBLISHER_PK);

    bytes memory callData = abi.encode(testRound, v, r, s);
    vm.expectEmit(true, true, false, true);
    emit EarnedReward(USER, rewardToken, rewardAmount);
    vm.prank(USER);
    bulletin.updateBulletinWithRewardLog(callData);

    uint256 accumulatedRewards = bulletin.getRewards(USER, rewardToken);
    assertEq(accumulatedRewards, rewardAmount);
  }

  function test_UpdatesBulletinWithRewardLogButNoReward() public {
    (uint8 v, bytes32 r, bytes32 s) = sign_round(testRound, PUBLISHER_PK);

    bytes memory callData = abi.encode(testRound, v, r, s);
    vm.expectRevert(
      PriceBulletin.PriceBulletin__checkRewardTokenAndAmount_noRewardTokenOrAmount.selector
    );
    vm.prank(USER);
    bulletin.updateBulletinWithRewardLog(callData);

    uint256 accumulatedRewards = bulletin.getRewards(USER, rewardToken);
    assertEq(accumulatedRewards, 0);
  }

  function test_UpdateBulletinWithRewardLogWrongCalldata(
    RoundData memory round,
    uint128 randoPK
  )
    public
  {
    vm.assume(randoPK > 0 && randoPK != PUBLISHER_PK);
    set_reward(rewardToken, rewardAmount);
    (uint8 v, bytes32 r, bytes32 s) = sign_round(round, randoPK);
    bytes memory callData = abi.encode(round, v, r, s);
    vm.prank(USER);
    bulletin.updateBulletinWithRewardLog(callData);
    uint256 accumulatedRewards = bulletin.getRewards(USER, rewardToken);
    assertEq(accumulatedRewards, 0);
  }

  function test_UpdateBulletinWithRewardClaim() public {
    set_reward(rewardToken, rewardAmount);
    load_reward(rewardToken, rewardAmount);

    assertEq(IERC20(rewardToken).balanceOf(USER), 0);

    (uint8 v, bytes32 r, bytes32 s) = sign_round(testRound, PUBLISHER_PK);

    bytes memory callData = abi.encode(testRound, v, r, s);
    vm.expectEmit(true, true, false, true);
    emit ClaimedReward(USER, rewardToken, rewardAmount);
    vm.prank(USER);
    bulletin.updateBulletinWithRewardClaim(callData, USER);

    uint256 accumulatedRewards = bulletin.getRewards(USER, rewardToken);
    assertEq(accumulatedRewards, 0);
    assertEq(IERC20(rewardToken).balanceOf(USER), rewardAmount);
  }

  function test_UpdateBulletinWithRewardClaimButNoRewardsSet() public {
    (uint8 v, bytes32 r, bytes32 s) = sign_round(testRound, PUBLISHER_PK);

    bytes memory callData = abi.encode(testRound, v, r, s);
    vm.expectRevert(
      PriceBulletin.PriceBulletin__checkRewardTokenAndAmount_noRewardTokenOrAmount.selector
    );
    vm.prank(USER);
    bulletin.updateBulletinWithRewardClaim(callData, USER);

    uint256 accumulatedRewards = bulletin.getRewards(USER, rewardToken);
    assertEq(accumulatedRewards, 0);
  }

  function test_UpdateBulletinWithRewardClaimButNoRewardsAvaiable() public {
    set_reward(rewardToken, rewardAmount);

    (uint8 v, bytes32 r, bytes32 s) = sign_round(testRound, PUBLISHER_PK);

    bytes memory callData = abi.encode(testRound, v, r, s);
    vm.expectRevert(PriceBulletin.PriceBulletin__distributeReward_notEnoughRewardBalance.selector);
    vm.prank(USER);
    bulletin.updateBulletinWithRewardClaim(callData, USER);

    uint256 accumulatedRewards = bulletin.getRewards(USER, rewardToken);
    assertEq(accumulatedRewards, 0);
  }

  function test_claimRewards(address receiver, uint8 updates, uint8 claims) public {
    vm.assume(receiver != address(bulletin) && claims > 0);
    uint256 updates_ = bound(updates, 0, 10);
    uint256 claims_ = bound(claims, 1, 10);

    set_reward(rewardToken, rewardAmount);
    load_reward(rewardToken, updates_ * rewardAmount);

    RoundData memory loopingRound = testRound;
    bytes memory callData;

    for (uint80 i = 0; i < updates_; i++) {
      loopingRound.roundId += i;
      (uint8 v, bytes32 r, bytes32 s) = sign_round(loopingRound, PUBLISHER_PK);
      callData = abi.encode(loopingRound, v, r, s);
      vm.prank(USER);
      bulletin.updateBulletinWithRewardLog(callData);
    }

    if (receiver == address(0)) {
      vm.expectRevert(PriceBulletin.PriceBulletin__invalidInput.selector);
      vm.prank(USER);
      bulletin.claimRewards(receiver, IERC20(rewardToken), claims_ * rewardAmount);
    } else if (updates_ == 0 || updates_ < claims_) {
      vm.expectRevert(
        PriceBulletin.PriceBulletin__distributeReward_notEnoughPendingRewards.selector
      );
      vm.prank(USER);
      bulletin.claimRewards(receiver, IERC20(rewardToken), claims_ * rewardAmount);
    } else {
      vm.prank(USER);
      bulletin.claimRewards(receiver, IERC20(rewardToken), claims_ * rewardAmount);
      assertEq(
        IERC20(rewardToken).balanceOf(address(bulletin)), (updates_ - claims_) * rewardAmount
      );
      assertEq(IERC20(rewardToken).balanceOf(receiver), claims_ * rewardAmount);
    }
  }

  /// Util functions

  function equal_strings(string memory str1, string memory str2) internal pure returns (bool) {
    return keccak256(abi.encodePacked(str1)) == keccak256(abi.encodePacked(str2));
  }

  function sign_round(
    RoundData memory round,
    uint256 publisherPK
  )
    internal
    view
    returns (uint8 v, bytes32 r, bytes32 s)
  {
    bytes32 structHash = bulletin.getStructHashRoundData(round);
    bytes32 digest = bulletin.getHashTypedDataV4Digest(structHash);
    (v, r, s) = vm.sign(publisherPK, digest);
  }

  function publish_round(
    address caller,
    RoundData memory round,
    uint8 v,
    bytes32 r,
    bytes32 s
  )
    internal
  {
    bytes memory callData = abi.encode(round, v, r, s);
    vm.prank(caller);
    bulletin.updateBulletin(callData);
  }

  function set_reward(address token, uint256 reward) internal {
    vm.prank(OWNER);
    bulletin.setReward(IERC20(token), reward);
  }

  function load_reward(address token, uint256 amount) internal {
    uint256 prevBal = IERC20(token).balanceOf(address(bulletin));
    MockERC20(token).mint(address(bulletin), amount);
    assertEq(IERC20(token).balanceOf(address(bulletin)), prevBal + amount);
  }
}
