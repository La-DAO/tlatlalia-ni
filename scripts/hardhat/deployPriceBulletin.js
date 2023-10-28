/* global ethers */
const { ethers } = require("ethers")
const { setPublisherPriceBulletin } = require("./setPublisherPriceBulletin")
const PriceBulletinArtifact = require("../../artifacts/src/PriceBulletin.sol/PriceBulletin")
const ERC1967ProxyArtifact = require("../../artifacts/src/libraries/openzeppelin/ERC1967Proxy.sol/ERC1967Proxy")
const {
  getEnvWSigner,
  getLocalhostJsonRPCProvider,
  getChainProvider,
  CUICA_DATA_MAINNET
} = require('../utilsCuica')

const DEBUG = false

async function deployPriceBulletin(
  diamondAddress = CUICA_DATA_MAINNET.gnosis.diamond,
  chainName = 'localhost'
) {
  let pricebulletinFactory
  let ERC1967ProxyFactory
  if (chainName == 'localhost') {

    pricebulletinFactory = new ethers.ContractFactory(
      PriceBulletinArtifact.abi,
      PriceBulletinArtifact.bytecode,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    )
    ERC1967ProxyFactory = new ethers.ContractFactory(
      ERC1967ProxyArtifact.abi,
      ERC1967ProxyArtifact.bytecode,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    )
  } else {

    pricebulletinFactory = new ethers.ContractFactory(
      PriceBulletinArtifact.abi,
      PriceBulletinArtifact.bytecode,
      getEnvWSigner(getChainProvider(chainName))
    )
    ERC1967ProxyFactory = new ethers.ContractFactory(
      ERC1967ProxyArtifact.abi,
      ERC1967ProxyArtifact.bytecode,
      getEnvWSigner(getChainProvider(chainName))
    )
  }
  console.log("\n\n 📡 Deploying...\n")
  const pricebulletin = await pricebulletinFactory.deploy()
  await pricebulletin.deployed()

  let data = (await pricebulletin.populateTransaction.initialize(diamondAddress)).data
  const proxy = await ERC1967ProxyFactory.deploy(pricebulletin.address, data)

  if (DEBUG) {
    console.log()
    console.log('PriceBulletin implementation deployed at:', pricebulletin.address)
    console.log('PriceBulletin proxy:', proxy.address)
  }
  console.log("PriceBulletin " + ": deployed at", proxy.address)

  setPublisherPriceBulletin(proxy.address, '0x2a895CF57ef296d1C63FE082053238D99D749774')

  return proxy.address
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  const args = process.argv.slice(2); // Extract arguments, excluding the first two elements

  if (args.length == 2) {
    const diamondAddr = args[0];
    const chainName = args[1];

    deployPriceBulletin(diamondAddr, chainName)
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
  } else if (args.length == 0) {
    deployPriceBulletin()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
  } else {
    console.error("Usage: node deployPriceBulletin.js <diamondAddr> <chainName>");
    process.exit(1);
  }
}

exports.deployPriceBulletin = deployPriceBulletin