// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IPyth, PythStructs} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {AppStorage, OracleFacetStorage} from "../libraries/AppStorage.sol";

contract PythFacet is AppStorage {
  // events
  event PythFacePriceStored(uint256 price, uint256 publisherTimestamp);

  /// custom errors
  error PythFacet_notEnoughFee();
  error PythFacet_priceIsNegative();

  uint8 private constant DECIMALS_PYTH = 8;

  ///@dev Pyth network contract on gnosis chain.
  IPyth private constant PYTH = IPyth(0x2880aB155794e7179c9eE2e38200202908C17B43);
  ///@dev Pyth network PriceId FX.USD/MXN.
  bytes32 private constant PYTH_TICKER =
    0xe13b1c1ffb32f34e1be9545583f01ef385fde7f42ee66049d30570dc866b77ca;

  int256 private constant NEGATIVE_ONE = -1;

  function getPrice_Pyth() public view returns (int256) {
    return accessOracleStorage(PYTH_STORAGE_POSITION).storedLatestPrice;
  }

  function getPriceLastUpdate_Pyth() public view returns (uint256) {
    return accessOracleStorage(PYTH_STORAGE_POSITION).lastTimestamp;
  }

  function getPythUpdateFee(bytes[] calldata priceUpdateData) public view returns (uint256 fee) {
    return PYTH.getUpdateFee(priceUpdateData);
  }

  function storePrice_Pyth(bytes[] calldata priceUpdateData) public payable {
    uint256 fee = getPythUpdateFee(priceUpdateData);

    if (fee < msg.value) revert PythFacet_notEnoughFee();

    PYTH.updatePriceFeeds{value: msg.value}(priceUpdateData);
    PythStructs.Price memory structPrice = PYTH.getPriceUnsafe(PYTH_TICKER);

    // Confirm price is not negative
    if (structPrice.price < 0) revert PythFacet_priceIsNegative();

    /**
     * Since Pyth returns price in mxn as the currency asset we invert.
     */
    uint256 convertPrice = _invertPrice(
      uint256(int256(structPrice.price)), uint256(int256(NEGATIVE_ONE * structPrice.expo))
    );

    OracleFacetStorage storage os = accessOracleStorage(PYTH_STORAGE_POSITION);

    os.storedLatestPrice = int256(convertPrice);
    os.lastTimestamp = uint256(structPrice.publishTime);
    os.workingTimestamp = block.timestamp;

    emit PythFacePriceStored(convertPrice, uint256(structPrice.publishTime));
  }

  function _invertPrice(uint256 givenPrice, uint256 givenDecimals) private pure returns (uint256) {
    return 10 ** (DECIMALS_PYTH + givenDecimals) / givenPrice;
  }
}
