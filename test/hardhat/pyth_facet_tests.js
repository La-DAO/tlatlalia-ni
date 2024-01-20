/* global describe it before ethers */

const {
  getSelectors,
  FacetCutAction,
} = require("../../scripts/hardhat/libraries/diamond.js");
const { deployDiamond } = require("../../scripts/hardhat/deployDiamond.js");
const { expect, assert } = require("chai");
const { EvmPriceServiceConnection } = require("@pythnetwork/pyth-evm-js");
const { ethers } = require("hardhat");

const DEBUG = false;

// https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/ethereum/sdk/js#price-service-endpoints
const connection = new EvmPriceServiceConnection(
  "https://xc-mainnet.pyth.network"
);

describe("PythTests", async function () {
  let diamondAddress;
  let diamondCutFacet;
  let diamondLoupeFacet;
  let addresses = [];

  before(async function () {
    diamondAddress = await deployDiamond();
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddress
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddress
    );
    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddress
    );

    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address);
    }
  });

  it("Should add PythFacet facet functions", async () => {
    const PythFacet = await ethers.getContractFactory("PythFacet");
    const pythFacet = await PythFacet.deploy();
    await pythFacet.deployed();
    addresses.push(pythFacet.address);

    const selectors = getSelectors(pythFacet);

    let tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: pythFacet.address,
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.constants.AddressZero,
      "0x",
      { gasLimit: 800000 }
    );
    let receipt = await tx.wait();

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }

    result = await diamondLoupeFacet.facetFunctionSelectors(pythFacet.address);
    assert.sameMembers(result, selectors);
  });

  it("Should test function call", async () => {
    const pythFacet = await ethers.getContractAt("PythFacet", diamondAddress);
    const pyth = await ethers.getContractAt(
      "IPyth",
      "0x2880aB155794e7179c9eE2e38200202908C17B43"
    );

    const priceIds = [
      // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#pyth-evm-mainnet
      "0xe13b1c1ffb32f34e1be9545583f01ef385fde7f42ee66049d30570dc866b77ca", // MXN/USD price id mainnet
    ];

    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);
    const updateFee = await pyth.getUpdateFee(priceUpdateData);
    await pythFacet.storePrice_Pyth(priceUpdateData, { value: updateFee });
    const storedPrice = await pythFacet.getPrice_Pyth();

    const refResponse = (await connection.getLatestPriceFeeds(priceIds))[0];
    const referencePrice = Math.trunc(
      10 ** (8 + refResponse.price.expo * -1) / refResponse.price.price
    );

    expect(storedPrice.toString()).to.eq(referencePrice.toString());

    if (DEBUG) {
      console.log("updateFee", updateFee.toString());
      console.log("storedPrice", storedPrice.toString());
      console.log("referencePrice", referencePrice.toString()); // Price { conf: '1234', expo: -8, price: '12345678' }
    }
  });
});
