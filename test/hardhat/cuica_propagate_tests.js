/* global describe it before ethers */
require("dotenv").config();
const {
  getSelectors,
  FacetCutAction
} = require('../../scripts/hardhat/libraries/diamond.js')
const { deployDiamond } = require('../../scripts/hardhat/deployDiamond.js')
const { expect, assert } = require("chai")
const { WrapperBuilder } = require("@redstone-finance/evm-connector");
const { EvmPriceServiceConnection } = require("@pythnetwork/pyth-evm-js");
const { ethers } = require('hardhat');
const { CONNEXT_DATA, getSdkBaseConnext, getParams } = require('../../scripts/utilsConnext.js')

const DEBUG = false

// https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/ethereum/sdk/js#price-service-endpoints
const connection = new EvmPriceServiceConnection(
  "https://xc-mainnet.pyth.network"
);

const CONNEXT_GNOSIS = "0x5bB83e95f63217CDa6aE3D181BA580Ef377D2109"

describe('CuicaFacet', async function () {
  let accounts
  let diamondAddress
  let diamondCutFacet
  let diamondLoupeFacet
  let cuicaFacet
  let redstoneFacet
  let pythFacet
  let chainlinkFacet
  let priceBulletin
  let addresses = []

  before(async function () {
    accounts = await ethers.getSigners()
    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)

    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address)
    }

    /// Setup RedstoneFacet in Diamond

    const RedstoneFacet = await ethers.getContractFactory('RedstoneFacet')
    redstoneFacet = await RedstoneFacet.deploy()
    await redstoneFacet.deployed()
    addresses.push(redstoneFacet.address)

    let selectors = getSelectors(redstoneFacet)

    let tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: redstoneFacet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    let receipt = await tx.wait()

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }

    redstoneFacet = await ethers.getContractAt("RedstoneFacet", diamondAddress)

    /// Setup PythFacet in Diamond

    const PythFacet = await ethers.getContractFactory('PythFacet')
    pythFacet = await PythFacet.deploy()
    await pythFacet.deployed()
    addresses.push(pythFacet.address)

    selectors = getSelectors(pythFacet)

    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: pythFacet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    pythFacet = await ethers.getContractAt("PythFacet", diamondAddress)


    /// Setup ChainlinkFacet in Diamond

    const ChainlinkFacet = await ethers.getContractFactory('ChainlinkFacet')
    chainlinkFacet = await ChainlinkFacet.deploy()
    await chainlinkFacet.deployed()
    addresses.push(chainlinkFacet.address)

    selectors = getSelectors(chainlinkFacet)

    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: chainlinkFacet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    chainlinkFacet = await ethers.getContractAt("ChainlinkFacet", diamondAddress)

    /// Set up CuicaFacet
    const CuicaFacet = await ethers.getContractFactory('CuicaFacet')
    cuicaFacet = await CuicaFacet.deploy()
    await cuicaFacet.deployed()
    addresses.push(cuicaFacet.address)

    selectors = getSelectors(cuicaFacet)

    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: cuicaFacet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }

    /// Call and store RedstoneFacet price

    const w_redstoneFacet = WrapperBuilder
      .wrap(redstoneFacet)
      .usingDataService(
        {
          dataServiceId: "redstone-main-demo",
          uniqueSignersCount: 1,
          dataFeeds: ["MXN"]
        },
        ["https://d33trozg86ya9x.cloudfront.net"]
      );

    tx = await w_redstoneFacet.storePrice_Redstone()
    await tx.wait()

    /// Call and store PythFacet price

    const pyth = await ethers.getContractAt('IPyth', '0x2880aB155794e7179c9eE2e38200202908C17B43')
    const priceIds = [
      // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#pyth-evm-mainnet
      "0xe13b1c1ffb32f34e1be9545583f01ef385fde7f42ee66049d30570dc866b77ca", // MXN/USD price id mainnet
    ]

    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds)
    const updateFee = await pyth.getUpdateFee(priceUpdateData)

    tx = await pythFacet.storePrice_Pyth(priceUpdateData, { value: updateFee })
    await tx.wait()

    /// Call and store chainlinkFacet price

    tx = await chainlinkFacet.storePrice_Chainlink()
    await tx.wait()

    /// Deploy and set signer in PriceBulletin

    const PriceBulletin = await ethers.getContractFactory("PriceBulletin")
    priceBulletin = await PriceBulletin.deploy()
    const signerToSet = accounts[0].address;
    tx = await priceBulletin.setAuthorizedPublisher(signerToSet, true)
    await tx.wait()
  })

  it('Should return a relayer fee estimate', async () => {
    const digest = await cuicaFacet.getStructHashLastRoundData()
    const ownerSigningKey = new ethers.utils.SigningKey(process.env.TEST_PK);
    const signedDigest = await ownerSigningKey.signDigest(digest);
    const { v, r, s } = ethers.utils.splitSignature(signedDigest);

    const lastRoundInfo = await cuicaFacet.latestRoundData()
    const callData = ethers.utils.defaultAbiCoder.encode(
      [
        "tuple(uint80, int256, uint, uint, uint80)",
        "uint8",
        "bytes32",
        "bytes32"
      ],
      [
        [
          lastRoundInfo.roundId,
          lastRoundInfo.answer,
          lastRoundInfo.startedAt,
          lastRoundInfo.updatedAt,
          lastRoundInfo.answeredInRound
        ],
        v,
        r,
        s
      ]
    )

    const gasEstimate = await priceBulletin.estimateGas.xReceive(
      ethers.constants.HashZero,
      0,
      ethers.constants.AddressZero,
      priceBulletin.address,
      CONNEXT_DATA.gnosis.domainId,
      callData
    )

    if (DEBUG) console.log('gasEstimate', gasEstimate.toString())

    const sdkBase = await getSdkBaseConnext();

    const doms = Object.keys(CONNEXT_DATA)
    const gnoDom = CONNEXT_DATA.gnosis.domainId;

    for (let index = 0; index < doms.length; index++) {
      const domain = CONNEXT_DATA[doms[index]].domainId
      const relayerFee = await sdkBase.estimateRelayerFee(getParams(gnoDom, domain, gasEstimate))

      expect(relayerFee).to.be.gt(0)

      const formatedRelayerFee = (relayerFee / 1e18).toFixed(9)
      if (DEBUG) console.log(`RelayerFees from Gnosis(in xDAI) to ${doms[index]}: ${formatedRelayerFee}`)
    }
  })

  it('Should set price in PriceBulletin by random caller with proper signature values', async () => {
    const digest = await cuicaFacet.getStructHashLastRoundData()
    const ownerSigningKey = new ethers.utils.SigningKey(process.env.TEST_PK);
    const signedDigest = await ownerSigningKey.signDigest(digest);
    const { v, r, s } = ethers.utils.splitSignature(signedDigest);

    const lastRoundInfo = await cuicaFacet.latestRoundData()
    const callData = ethers.utils.defaultAbiCoder.encode(
      [
        "tuple(uint80, int256, uint, uint, uint80)",
        "uint8",
        "bytes32",
        "bytes32"
      ],
      [
        [
          lastRoundInfo.roundId,
          lastRoundInfo.answer,
          lastRoundInfo.startedAt,
          lastRoundInfo.updatedAt,
          lastRoundInfo.answeredInRound
        ],
        v,
        r,
        s
      ]
    )

    await priceBulletin.connect(accounts[2]).xReceive(
      digest,
      0,
      ethers.constants.AddressZero,
      priceBulletin.address,
      CONNEXT_DATA.gnosis.domainId,
      callData
    )

    const response = await priceBulletin.latestRoundData()

    expect(response.roundId).to.eq(lastRoundInfo.roundId)
    expect(response.answer).to.eq(lastRoundInfo.answer)
    expect(response.startedAt).to.eq(lastRoundInfo.startedAt)
    expect(response.updatedAt).to.eq(lastRoundInfo.updatedAt)
    expect(response.answeredInRound).to.eq(lastRoundInfo.answeredInRound)

    if (DEBUG) console.log(response)
  })

})