/* global describe it before ethers */

const {
  getSelectors,
  FacetCutAction
} = require('../../scripts/hardhat/libraries/diamond.js')
const { deployDiamond } = require('../../scripts/hardhat/deployDiamond.js')
const { expect, assert } = require("chai")
const { ethers } = require('hardhat')

const DEBUG = false

describe('ChainlinkTests', async function () {
  let diamondAddress
  let diamondCutFacet
  let diamondLoupeFacet
  let ownershipFacet
  let addresses = []

  before(async function () {
    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)

    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address)
    }
  })

  it('Should add Chainlink facet functions', async () => {
    const ChainlinkFacet = await ethers.getContractFactory('ChainlinkFacet')
    const chainlinkFacet = await ChainlinkFacet.deploy()
    await chainlinkFacet.deployed()
    addresses.push(chainlinkFacet.address)

    const selectors = getSelectors(chainlinkFacet)

    let tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: chainlinkFacet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    let receipt = await tx.wait()

    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }

    result = await diamondLoupeFacet.facetFunctionSelectors(chainlinkFacet.address)
    assert.sameMembers(result, selectors)
  })

  it('Should test store price call', async () => {
    const chainlinkFacet = await ethers.getContractAt('ChainlinkFacet', diamondAddress)
    const chainlink = await ethers.getContractAt('IAggregatorV3', '0xe9cea51a7b1b9B32E057ff62762a2066dA933cD2')

    await chainlinkFacet.storePrice_Chainlink()
    const storedPrice = await chainlinkFacet.getPrice_Chainlink()
    const referencePrice = await chainlink.latestRoundData()

    expect(storedPrice).to.eq(referencePrice.answer)

    if (DEBUG) {
      console.log('storedPrice',storedPrice.toString())
      console.log('referencePrice', (referencePrice.answer).toString())
    }
  })

})