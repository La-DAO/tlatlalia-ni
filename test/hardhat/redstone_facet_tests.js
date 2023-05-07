/* global describe it before ethers */

const { deployDiamond } = require('../../scripts/hardhat/deployDiamond.js')
const { expect } = require("chai")
const { WrapperBuilder } = require("@redstone-finance/evm-connector");

const DEBUG = false

describe('RedstoneTest', async function () {
  let diamondAddress
  let diamondCutFacet
  let diamondLoupeFacet
  let ownershipFacet

  before(async function () {
    diamondAddress = await deployDiamond()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
  })

  it('Should be a passing test', async () => {
    // TODO your test here
    if (DEBUG) {
      console.log("diamondAddress",diamondAddress)
    }
    expect(1).to.equal(1)
  })

})