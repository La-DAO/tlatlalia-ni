// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {MainConsumerBase} from "../external/redstone/MainConsumerBase.sol";

contract RedstoneFacet is MainConsumerBase {
    function getLatestRedstonePrice() public view returns (uint256) {
        return getOracleNumericValueFromTxMsg(bytes32("ETH"));
    }
}
