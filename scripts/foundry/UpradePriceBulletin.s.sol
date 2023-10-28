// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {PriceBulletin, RoundData, IERC20} from "../../src/PriceBulletin.sol";
import {ERC1967Proxy} from "../../src/libraries/openzeppelin/ERC1967Proxy.sol";

contract UpgradePriceBulletin is Script {
  address constant PROXY = 0xADA8C0eAbA7AD722f4B5555b216f8F11a81593D8;
  address constant PUBLISHER = 0x2a895CF57ef296d1C63FE082053238D99D749774;
  address constant DIAMOND = 0x8f78dc290e1701EC664909410661DC17E9c7b62b;

  /**
   * @dev Run using shell command:
   * $forge script --rpc-url $<RPC_CHAIN> --private-key $<PRIVATE_KEY> --slow --verify --etherscan-api-key $<etherscan_key> --broadcast scripts/foundry/DeployPriceBulletin
   */
  function run() public {
    vm.startBroadcast();
    address implementation = address(new PriceBulletin());
    console.log("Deployed implementation {PriceBulletin}:", implementation);
    address proxyBulletin = PROXY;
    console.log("Upgrading Proxy:", PROXY, "to latest {PriceBulletin}:", implementation);
    PriceBulletin(proxyBulletin).upgradeTo(implementation);
    PriceBulletin(proxyBulletin).setAuthorizedPublisher(PUBLISHER, true);
    PriceBulletin(proxyBulletin).setCuicaGnosis(DIAMOND);
    vm.stopBroadcast();
  }
}
