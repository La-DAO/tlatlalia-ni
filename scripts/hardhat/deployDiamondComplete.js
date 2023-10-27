/* global ethers */
/* eslint prefer-const: "off" */

const { getSelectors, FacetCutAction } = require('./libraries/diamond.js')
const { CONNEXT_DATA } = require('../utilsConnext.js')
const { setPublisherCuica } = require('./setPublisherCuica.js')

const DEBUG = false

async function deployDiamondComplete() {
  const accounts = await ethers.getSigners()
  const contractOwner = accounts[0]

  // Deploy DiamondInitCuica
  const DiamondInit = await ethers.getContractFactory('DiamondInitCuica')
  const diamondInit = await DiamondInit.deploy()
  await diamondInit.deployed()
  if (DEBUG) {
    console.log('DiamondInit deployed:', diamondInit.address)
    console.log('')
    console.log('Deploying facets')
  }
  // Deploy facets and set the `facetCuts` variable

  const FacetNames = [
    'DiamondCutFacet',
    'DiamondLoupeFacet',
    'OwnershipFacet',
    'RedstoneFacet',
    'PythFacet',
    'ChainlinkFacet',
    'CuicaFacet'
  ]
  // The `facetCuts` variable is the FacetCut[] that contains the functions to add during diamond deployment
  const facetCuts = []
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName)
    const facet = await Facet.deploy()
    await facet.deployed()
    if (DEBUG) {
      console.log(`${FacetName} deployed: ${facet.address}`)
    }
    facetCuts.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet)
    })
  }

  // Creating a function call
  // This call gets executed during deployment and can also be executed in upgrades
  // It is executed with delegatecall on the DiamondInit address.
  let functionCall = diamondInit.interface.encodeFunctionData(
    'init',
    [CONNEXT_DATA.gnosis.coreAddress]
  )

  // Setting arguments that will be used in the diamond constructor
  const diamondArgs = {
    owner: contractOwner.address,
    init: diamondInit.address,
    initCalldata: functionCall
  }

  // deploy Diamond
  const Diamond = await ethers.getContractFactory('Diamond')
  const diamond = await Diamond.deploy(facetCuts, diamondArgs)
  await diamond.deployed()

  if (DEBUG) {
    console.log()
    console.log('Diamond deployed:', diamond.address)
  }

  setPublisherCuica(diamond.address, '0x2a895CF57ef296d1C63FE082053238D99D749774')

  // returning the address of the diamond
  return diamond.address
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamondComplete()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.deployDiamondComplete = deployDiamondComplete