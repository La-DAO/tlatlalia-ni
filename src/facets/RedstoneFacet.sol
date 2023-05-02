// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {MainConsumerBase} from "../external/redstone/MainConsumerBase.sol";

contract RedstoneFacet is MainConsumerBase {
    function pushRedstonePrice() external view returns (uint256) {
        uint256 mxnUsdPrice = getOracleNumericValueFromTxMsg(bytes32("MXN"));
        return mxnUsdPrice;
    }
}
