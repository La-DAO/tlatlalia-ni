// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {RedstoneConsumerNumericBase} from
    "@redstone-finance/evm-connector/contracts/core/RedstoneConsumerNumericBase.sol";

contract MainConsumerBase is RedstoneConsumerNumericBase {
    function getUniqueSignersThreshold() public view virtual override returns (uint8) {
        return 1;
    }

    function getAuthorisedSignerIndex(address signerAddress) public view virtual override returns (uint8) {
        if (signerAddress == 0x0C39486f770B26F5527BBBf942726537986Cd7eb) {
            return 0;
        } else {
            revert SignerNotAuthorised(signerAddress);
        }
    }
}
