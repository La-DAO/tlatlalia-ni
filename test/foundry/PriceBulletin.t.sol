// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {Test, console} from "forge-std/Test.sol";
import {PriceBulletin, RoundData} from "../../src/PriceBulletin.sol";
import {ERC1967Proxy} from "../../src/libraries/openzeppelin/ERC1967Proxy.sol";

contract PriceBulletinUnitTests is Test {
  uint256 constant ALICE_PK = 0xA;
  address public OWNER = vm.addr(ALICE_PK);

  uint256 constant BOB_PK = 0xB;
  address public PUBLISHER = vm.addr(BOB_PK);

  PriceBulletin public bulletin;

  RoundData public fakeRound = RoundData(40, 5820537, 1695414655, 1695414655, 40);

  function setUp() public {
    vm.label(OWNER, "owner");
    vm.label(PUBLISHER, "publisher");

    vm.startPrank(OWNER);
    address implementation = address(new PriceBulletin());
    bytes memory _data = abi.encodeWithSelector(PriceBulletin.initialize.selector);
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
}
