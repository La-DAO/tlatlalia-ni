/* global ethers */
const { ethers } = require("hardhat")
const { setPublisherPriceBulletin } = require("./setPublisherPriceBulletin")
const {
  CUICA_DATA_MAINNET
} = require('../utilsCuica')

const DEBUG = false

async function deployPriceBulletin(diamondAddress=CUICA_DATA_MAINNET.gnosis.diamond) {
  const PriceBulletin = await ethers.getContractFactory("PriceBulletin")
  const pricebulletin = await PriceBulletin.deploy()
  await pricebulletin.deployed()

  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy")
  let data = (await pricebulletin.populateTransaction.initialize(diamondAddress)).data
  const proxy = await ERC1967Proxy.deploy(pricebulletin.address, data)
  
  if (DEBUG) {
    console.log()
    console.log('PriceBulletin implementation deployed at:', pricebulletin.address)
    console.log('PriceBulletin proxy:', proxy.address)
  }

  setPublisherPriceBulletin(proxy.address, '0x2a895CF57ef296d1C63FE082053238D99D749774')

  return proxy.address
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  const args = process.argv.slice(2); // Extract arguments, excluding the first two elements

  if (args.length !== 1) {
    console.error("Usage: node deployPriceBulletin.js <diamondAddr>");
    process.exit(1);
  }

  const diamondAddr = args[0];
  
  deployPriceBulletin(diamondAddr)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.deployPriceBulletin = deployPriceBulletin