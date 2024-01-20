/* global describe it before ethers */
const {
  getSelectors,
  FacetCutAction,
} = require("../../scripts/hardhat/libraries/diamond.js");
const { deployDiamond } = require("../../scripts/hardhat/deployDiamond.js");
const { expect, assert } = require("chai");
const { WrapperBuilder } = require("@redstone-finance/evm-connector");
const { EvmPriceServiceConnection } = require("@pythnetwork/pyth-evm-js");
const { ethers } = require("hardhat");

const redstone = require("redstone-api");

const DEBUG = false;

// https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/ethereum/sdk/js#price-service-endpoints
const connection = new EvmPriceServiceConnection(
  "https://xc-mainnet.pyth.network"
);

const CONNEXT_GNOSIS = "0x5bB83e95f63217CDa6aE3D181BA580Ef377D2109";

describe("CuicaFacet", async function () {
  let accounts;
  let diamondAddress;
  let diamondCutFacet;
  let diamondLoupeFacet;
  let cuicaFacet;
  let redstoneFacet;
  let pythFacet;
  let chainlinkFacet;
  let priceBulletin;
  let addresses = [];

  before(async function () {
    accounts = await ethers.getSigners();
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

    /// Setup RedstoneFacet in Diamond

    const RedstoneFacet = await ethers.getContractFactory("RedstoneFacet");
    redstoneFacet = await RedstoneFacet.deploy();
    await redstoneFacet.deployed();
    addresses.push(redstoneFacet.address);

    let selectors = getSelectors(redstoneFacet);

    let tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: redstoneFacet.address,
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

    redstoneFacet = await ethers.getContractAt("RedstoneFacet", diamondAddress);

    /// Setup PythFacet in Diamond

    const PythFacet = await ethers.getContractFactory("PythFacet");
    pythFacet = await PythFacet.deploy();
    await pythFacet.deployed();
    addresses.push(pythFacet.address);

    selectors = getSelectors(pythFacet);

    tx = await diamondCutFacet.diamondCut(
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
    receipt = await tx.wait();

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
    pythFacet = await ethers.getContractAt("PythFacet", diamondAddress);

    /// Setup ChainlinkFacet in Diamond

    const ChainlinkFacet = await ethers.getContractFactory("ChainlinkFacet");
    chainlinkFacet = await ChainlinkFacet.deploy();
    await chainlinkFacet.deployed();
    addresses.push(chainlinkFacet.address);

    selectors = getSelectors(chainlinkFacet);

    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: chainlinkFacet.address,
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.constants.AddressZero,
      "0x",
      { gasLimit: 800000 }
    );
    receipt = await tx.wait();

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
    chainlinkFacet = await ethers.getContractAt(
      "ChainlinkFacet",
      diamondAddress
    );

    /// Call and store RedstoneFacet price

    const w_redstoneFacet = WrapperBuilder.wrap(redstoneFacet).usingDataService(
      {
        dataServiceId: "redstone-main-demo",
        uniqueSignersCount: 1,
        dataFeeds: ["MXN"],
      },
      ["https://d33trozg86ya9x.cloudfront.net"]
    );

    tx = await w_redstoneFacet.storePrice_Redstone();
    await tx.wait();

    /// Call and store PythFacet price

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

    tx = await pythFacet.storePrice_Pyth(priceUpdateData, { value: updateFee });
    await tx.wait();

    /// Call and store chainlinkFacet price

    tx = await chainlinkFacet.storePrice_Chainlink();
    await tx.wait();

    /// Deploy PriceBulletin
    const PriceBulletin = await ethers.getContractFactory("PriceBulletin");
    priceBulletin = await PriceBulletin.deploy();
  });

  it("Should add Cuica facet functions", async () => {
    const CuicaFacet = await ethers.getContractFactory("CuicaFacet");
    cuicaFacet = await CuicaFacet.deploy();
    await cuicaFacet.deployed();
    addresses.push(cuicaFacet.address);

    const selectors = getSelectors(cuicaFacet);

    const tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: cuicaFacet.address,
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.constants.AddressZero,
      "0x",
      { gasLimit: 800000 }
    );
    const receipt = await tx.wait();

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }

    const result = await diamondLoupeFacet.facetFunctionSelectors(
      cuicaFacet.address
    );
    assert.sameMembers(result, selectors);

    cuicaFacet = await ethers.getContractAt("CuicaFacet", diamondAddress);
  });

  it("Should check there is a Redstone price", async () => {
    const storedPrice = await redstoneFacet.getPrice_Redstone();
    const referenceFloatPrice = (await redstone.getPrice("MXN")).value.toFixed(
      8
    );
    const referencePrice = ethers.utils.parseUnits(
      referenceFloatPrice.toString(),
      8
    );
    expect(storedPrice).to.be.gt(ethers.BigNumber.from("0"));
    if (DEBUG) {
      console.log("storedPrice", storedPrice.toString());
      console.log("referencePrice", referencePrice.toString());
    }
  });

  it("Should check there is a Pyth price", async () => {
    const storedPrice = await pythFacet.getPrice_Pyth();
    const priceIds = [
      // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#pyth-evm-mainnet
      "0xe13b1c1ffb32f34e1be9545583f01ef385fde7f42ee66049d30570dc866b77ca", // MXN/USD price id mainnet
    ];
    const refResponse = (await connection.getLatestPriceFeeds(priceIds))[0];
    const referencePrice = Math.trunc(
      10 ** (8 + refResponse.price.expo * -1) / refResponse.price.price
    );
    expect(storedPrice).to.be.gt(ethers.BigNumber.from("0"));
    if (DEBUG) {
      console.log("storedPrice", storedPrice.toString());
      console.log("referencePrice", referencePrice.toString());
    }
  });

  it("Should check there is a Chainlink price", async () => {
    const chainlink = await ethers.getContractAt(
      "IAggregatorV3",
      "0xe9cea51a7b1b9B32E057ff62762a2066dA933cD2"
    );
    const storedPrice = await chainlinkFacet.getPrice_Chainlink();
    const referencePrice = await chainlink.latestRoundData();
    expect(storedPrice).to.be.gt(ethers.BigNumber.from("0"));
    if (DEBUG) {
      console.log("storedPrice", storedPrice.toString());
      console.log("referencePrice", referencePrice.answer.toString());
    }
  });

  it("Should aggregate and publish round", async () => {
    const tx = await cuicaFacet.aggregateAndPublishRound();
    await tx.wait();
    const response = await cuicaFacet.latestRoundData();

    expect(response.roundId).to.eq(1);
    expect(response.answer).to.be.gt(0);
    expect(response.startedAt).to.be.gt(0);
    expect(response.updatedAt).to.be.gt(0);
    expect(response.answeredInRound).to.eq(1);

    if (DEBUG) console.log(response);
  });

  it("Should set-up Connext core address in CuicaFacet", async () => {
    const tx = await cuicaFacet.setConnext(CONNEXT_GNOSIS);
    await tx.wait();
    const response = await cuicaFacet.connext();

    expect(response).to.eq(CONNEXT_GNOSIS);
    if (DEBUG) console.log(response);
  });

  it("Should revert set-up Connext core address by not owner in CuicaFacet", async () => {
    await expect(cuicaFacet.connect(accounts[9]).setConnext(CONNEXT_GNOSIS)).to
      .be.reverted;
  });

  it("Should set-up signer in PriceBulletin", async () => {
    const signerToSet = accounts[0].address;
    const tx = await priceBulletin.setAuthorizedPublisher(signerToSet, true);
    await tx.wait();
    const response = await priceBulletin.authorizedPublishers(signerToSet);

    expect(response).to.eq(true);
    if (DEBUG) console.log(response);
  });

  it("Should revert attempt to set-up signer by not owner in PriceBulletin", async () => {
    const signerToSet = accounts[1].address;
    await expect(
      priceBulletin
        .connect(accounts[9])
        .setAuthorizedPublisher(signerToSet, true)
    ).to.be.reverted;
    const response = await priceBulletin.authorizedPublishers(signerToSet);

    expect(response).to.eq(false);
    if (DEBUG) console.log(response);
  });
});
