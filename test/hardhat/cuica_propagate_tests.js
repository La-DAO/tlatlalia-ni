/* global describe it before ethers */
require("dotenv").config();
const {
  deployDiamondComplete,
} = require("../../scripts/hardhat/deployDiamondComplete.js");
const {
  deployPriceBulletin,
} = require("../../scripts/hardhat/deployPriceBulletin.js");
const { expect, assert } = require("chai");
const { WrapperBuilder } = require("@redstone-finance/evm-connector");
const { EvmPriceServiceConnection } = require("@pythnetwork/pyth-evm-js");
const { ethers } = require("hardhat");
const {
  CONNEXT_DATA,
  getSdkBaseConnext,
  getParams,
} = require("../../scripts/utilsConnext.js");
const {
  setPublisherCuica,
} = require("../../scripts/hardhat/setPublisherCuica.js");
const {
  setPublisherPriceBulletin,
} = require("../../scripts/hardhat/setPublisherPriceBulletin.js");

const DEBUG = false;

// https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/ethereum/sdk/js#price-service-endpoints
const connection = new EvmPriceServiceConnection(
  "https://xc-mainnet.pyth.network"
);

describe("CuicaFacet", async () => {
  let accounts;
  let diamondAddress;
  let diamondLoupeFacet;
  let cuicaFacet;
  let redstoneFacet;
  let pythFacet;
  let chainlinkFacet;
  let priceBulletin;
  let addresses = [];
  let publisher;

  before(async () => {
    accounts = await ethers.getSigners();
    diamondAddress = await deployDiamondComplete();
    const proxyAddr = await deployPriceBulletin(diamondAddress);
    priceBulletin = await ethers.getContractAt("PriceBulletin", proxyAddr);
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
    redstoneFacet = await ethers.getContractAt("RedstoneFacet", diamondAddress);
    pythFacet = await ethers.getContractAt("PythFacet", diamondAddress);
    chainlinkFacet = await ethers.getContractAt(
      "ChainlinkFacet",
      diamondAddress
    );
    cuicaFacet = await ethers.getContractAt("CuicaFacet", diamondAddress);

    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address);
    }

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

    // Aggregate and publish round
    tx = await cuicaFacet.aggregateAndPublishRound();
    await tx.wait();

    /// Set a test publisher in PriceBulletin
    publisher = ethers.Wallet.createRandom();
    await setPublisherCuica(diamondAddress, publisher.address);
    await setPublisherPriceBulletin(priceBulletin.address, publisher.address);
  });

  it("Should have matching structHashes from PriceBulletin and CuicaFacet", async () => {
    const lastRoundData = await cuicaFacet.latestRoundData();
    const structHashPriceBulletin = await priceBulletin.getStructHashRoundData(
      lastRoundData
    );
    const structHashCuicaFacet = await cuicaFacet.getStructHashRoundData(
      lastRoundData
    );
    const structHashOtherFunctionCuica =
      await cuicaFacet.getStructHashLastRoundData();
    if (DEBUG)
      console.log(
        "structHashPriceBulletin",
        structHashPriceBulletin,
        "structHashCuicaFacet",
        structHashCuicaFacet,
        "structHashOtherFunctionCuica",
        structHashOtherFunctionCuica
      );
    expect(structHashPriceBulletin).to.eq(structHashCuicaFacet);
    expect(structHashCuicaFacet).to.eq(structHashOtherFunctionCuica);
  });

  it("Should have matching digests from PriceBulletin and CuicaFacet", async () => {
    const structHash = await cuicaFacet.getStructHashLastRoundData();
    const digestFromPriceBulletin =
      await priceBulletin.getHashTypedDataV4Digest(structHash);
    const digestFromCuicaFaccet = await cuicaFacet.getHashTypedDataV4Digest(
      structHash
    );
    if (DEBUG)
      console.log(
        "digestFromPriceBulletin",
        digestFromPriceBulletin,
        "digestFromCuicaFaccet",
        digestFromCuicaFaccet
      );
    expect(digestFromPriceBulletin).to.eq(digestFromCuicaFaccet);
  });

  it("Should return a relayer fee estimate", async () => {
    const structHash = await cuicaFacet.getStructHashLastRoundData();
    const digest = await priceBulletin.getHashTypedDataV4Digest(structHash);
    const publisherSigningKey = new ethers.utils.SigningKey(
      publisher.privateKey
    );
    const signedDigest = publisherSigningKey.signDigest(digest);
    const { v, r, s } = ethers.utils.splitSignature(signedDigest);

    const lastRoundInfo = await cuicaFacet.latestRoundData();
    const callData = ethers.utils.defaultAbiCoder.encode(
      [
        "tuple(uint80, int256, uint, uint, uint80)",
        "uint8",
        "bytes32",
        "bytes32",
      ],
      [
        [
          lastRoundInfo.roundId,
          lastRoundInfo.answer,
          lastRoundInfo.startedAt,
          lastRoundInfo.updatedAt,
          lastRoundInfo.answeredInRound,
        ],
        v,
        r,
        s,
      ]
    );

    const gasEstimate = await priceBulletin.estimateGas.xReceive(
      ethers.constants.HashZero,
      0,
      ethers.constants.AddressZero,
      priceBulletin.address,
      CONNEXT_DATA.gnosis.domainId,
      callData
    );

    if (DEBUG) console.log("gasEstimate", gasEstimate.toString());

    const sdkBase = await getSdkBaseConnext();

    const doms = Object.keys(CONNEXT_DATA);
    const gnoDom = CONNEXT_DATA.gnosis.domainId;

    for (let index = 0; index < doms.length; index++) {
      const domain = CONNEXT_DATA[doms[index]].domainId;
      const relayerFee = await sdkBase.estimateRelayerFee(
        getParams(gnoDom, domain, gasEstimate)
      );

      expect(relayerFee).to.be.gt(0);

      const formatedRelayerFee = (relayerFee / 1e18).toFixed(9);
      if (DEBUG)
        console.log(
          `RelayerFees from Gnosis(in xDAI) to ${doms[index]}: ${formatedRelayerFee}`
        );
    }
  });

  it("Should set price in PriceBulletin by random caller with proper signature values", async () => {
    const structHash = await cuicaFacet.getStructHashLastRoundData();
    const digest = await priceBulletin.getHashTypedDataV4Digest(structHash);
    const publisherSigningKey = new ethers.utils.SigningKey(
      publisher.privateKey
    );
    const signedDigest = publisherSigningKey.signDigest(digest);
    const { v, r, s } = ethers.utils.splitSignature(signedDigest);

    const lastRoundInfo = await cuicaFacet.latestRoundData();

    const callData = ethers.utils.defaultAbiCoder.encode(
      [
        "tuple(uint80, int256, uint, uint, uint80)",
        "uint8",
        "bytes32",
        "bytes32",
      ],
      [
        [
          lastRoundInfo.roundId,
          lastRoundInfo.answer,
          lastRoundInfo.startedAt,
          lastRoundInfo.updatedAt,
          lastRoundInfo.answeredInRound,
        ],
        v,
        r,
        s,
      ]
    );

    await priceBulletin
      .connect(accounts[9])
      .xReceive(
        digest,
        0,
        ethers.constants.AddressZero,
        priceBulletin.address,
        CONNEXT_DATA.gnosis.domainId,
        callData
      );

    const response = await priceBulletin.latestRoundData();

    if (DEBUG) {
      console.log("cuicaFacet.lastRoundData", lastRoundInfo);
      console.log("priceBulletin.latestRoundData", response);
    }

    expect(response.roundId).to.eq(lastRoundInfo.roundId);
    expect(response.answer).to.eq(lastRoundInfo.answer);
    expect(response.startedAt).to.eq(lastRoundInfo.startedAt);
    expect(response.updatedAt).to.eq(lastRoundInfo.updatedAt);
    expect(response.answeredInRound).to.eq(lastRoundInfo.answeredInRound);
  });

  it("Should propagate price through Connext", async () => {
    const structHash = await cuicaFacet.getStructHashLastRoundData();
    const digest = await cuicaFacet.getHashTypedDataV4Digest(structHash);
    const publisherSigningKey = new ethers.utils.SigningKey(
      publisher.privateKey
    );
    const signedDigest = publisherSigningKey.signDigest(digest);
    const { v, r, s } = ethers.utils.splitSignature(signedDigest);

    const lastRoundInfo = await cuicaFacet.latestRoundData();
    const callData = ethers.utils.defaultAbiCoder.encode(
      [
        "tuple(uint80, int256, uint, uint, uint80)",
        "uint8",
        "bytes32",
        "bytes32",
      ],
      [
        [
          lastRoundInfo.roundId,
          lastRoundInfo.answer,
          lastRoundInfo.startedAt,
          lastRoundInfo.updatedAt,
          lastRoundInfo.answeredInRound,
        ],
        v,
        r,
        s,
      ]
    );

    const gasEstimate = await priceBulletin.estimateGas.xReceive(
      digest,
      0,
      ethers.constants.AddressZero,
      priceBulletin.address,
      CONNEXT_DATA.gnosis.domainId,
      callData
    );

    const sdkBase = await getSdkBaseConnext();
    const relayerFee = await sdkBase.estimateRelayerFee(
      getParams(
        CONNEXT_DATA.gnosis.domainId,
        CONNEXT_DATA.optimism.domainId,
        gasEstimate
      )
    );

    const tx = await cuicaFacet.tlatlaliaNi(
      CONNEXT_DATA.optimism.domainId,
      priceBulletin.address,
      relayerFee,
      v,
      r,
      s,
      { value: relayerFee }
    );
    await tx.wait();
  });
});
