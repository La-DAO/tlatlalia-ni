/* global describe it before ethers */

const {
  getSelectors,
  FacetCutAction
} = require('../../scripts/hardhat/libraries/diamond.js')
const { deployDiamond } = require('../../scripts/hardhat/deployDiamond.js')
const { expect, assert } = require("chai")
const { WrapperBuilder } = require("@redstone-finance/evm-connector");

const DEBUG = false

describe('RedstoneTest', async function () {
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

  it('Should add Redstone facet functions', async () => {
    const RedstoneFacet = await ethers.getContractFactory('RedstoneFacet')
    const redstoneFacet = await RedstoneFacet.deploy()
    await redstoneFacet.deployed()
    addresses.push(redstoneFacet.address)

    const selectors = getSelectors(redstoneFacet)

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

    result = await diamondLoupeFacet.facetFunctionSelectors(redstoneFacet.address)
    assert.sameMembers(result, selectors)
  })

  it('Should test function call', async () => {
    const redstoneFacet = await ethers.getContractAt('RedstoneFacet', diamondAddress)
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

    await w_redstoneFacet.store_MXNUSD_Price_Redstone()

    const price = await redstoneFacet.get_MXNUSD_Price_Redstone()

    if (DEBUG) {
      console.log(price.toString())
    }
  })

})