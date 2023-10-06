// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {PriceBulletin, RoundData, IERC20} from "../../src/PriceBulletin.sol";
import {ERC1967Proxy} from "../../src/libraries/openzeppelin/ERC1967Proxy.sol";

contract DeployPriceBulletin is Script {
  address constant PUBLISHER = 0x2a895CF57ef296d1C63FE082053238D99D749774;

  /**
   * @dev Run using shell command:
   * $forge script --rpc-url $<RPC_CHAIN> --private-key $<PRIVATE_KEY> --slow --verify --etherscan-api-key $<etherscan_key> --broadcast scripts/foundry/DeployPriceBulletin
   */
  function run() public {
    vm.startBroadcast();
    address implementation = address(new PriceBulletin());
    console.log("Deployed implementation {PriceBulletin}:", implementation);
    bytes memory data_ = abi.encodeWithSelector(PriceBulletin.initialize.selector);
    bytes memory contructorArgs = abi.encode(implementation, data_);
    console.log("Proxy constructor arguments:");
    console.logBytes(contructorArgs);
    address proxyBulletin = address(new ERC1967Proxy(implementation, data_));
    console.log("Proxy for {PriceBulletin} deployed:", proxyBulletin);
    PriceBulletin(proxyBulletin).setAuthorizedPublisher(PUBLISHER, true);
    vm.stopBroadcast();
  }
}
