/* global ethers */
const { ethers } = require("hardhat")

const DEBUG = false

async function deployPriceBulletin() {
  const accounts = await ethers.getSigners()
  const contractOwner = accounts[0]

  const PriceBulletin = await ethers.getContractFactory("PriceBulletin")
  const pricebulletin = await PriceBulletin.deploy()
  await pricebulletin.deployed()

  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy")
  let data = (await pricebulletin.populateTransaction.initialize()).data
  const proxy = await ERC1967Proxy.deploy(pricebulletin.address, data)

  let calldata = (await pricebulletin.populateTransaction.setAuthorizedPublisher('0x2a895CF57ef296d1C63FE082053238D99D749774', true)).data
  let utx = {
    to: proxy.address,
    data: calldata
  }

  const tx = await contractOwner.sendTransaction(utx);
  await tx.wait()

  if (DEBUG) {
    console.log()
    console.log('PriceBulletin implementation deployed at:', pricebulletin.address)
    console.log('PriceBulletin proxy:', proxy.address)
  }

  return proxy.address
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployPriceBulletin()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.deployPriceBulletin = deployPriceBulletin