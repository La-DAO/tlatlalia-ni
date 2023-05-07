// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {RedstoneConsumerNumericBase} from
    "redstone-finance/evm-connector/contracts/core/RedstoneConsumerNumericBase.sol";

contract MainConsumerBase is RedstoneConsumerNumericBase {
    uint256 constant MAX_DATA_TIMESTAMP_DELAY_IN_SECONDS = 3 * 60;
    uint256 constant MAX_DATA_TIMESTAMP_AHEAD_IN_SECONDS = 3 * 60;

    constructor() {
        uniqueSignersThreshold = 3;
    }

    function getAuthorisedSignerIndex(address _signerAddress) public pure override returns (uint256) {
        if (_signerAddress == 0x926E370fD53c23f8B71ad2B3217b227E41A92b12) {
            return 0;
        } else if (_signerAddress == 0x0C39486f770B26F5527BBBf942726537986Cd7eb) {
            return 1;
        } else if (_signerAddress == 0xf786a909D559F5Dee2dc6706d8e5A81728a39aE9) {
            return 2;
        } else {
            revert("Signer is not authorised");
        }
    }

    function isTimestampValid(uint256 _receivedTimestamp) public view override returns (bool) {
        require(
            (block.timestamp + MAX_DATA_TIMESTAMP_AHEAD_IN_SECONDS) > _receivedTimestamp,
            "Data with future timestamps is not allowed"
        );

        return block.timestamp < _receivedTimestamp
            || block.timestamp - _receivedTimestamp < MAX_DATA_TIMESTAMP_DELAY_IN_SECONDS;
    }
}
