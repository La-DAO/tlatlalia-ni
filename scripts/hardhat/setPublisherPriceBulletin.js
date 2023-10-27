/* global ethers */
const { ethers } = require("hardhat")

const DEBUG = true

async function setPublisherPriceBulletin(priceBulletinAddr, publisherAddr) {
  if (DEBUG)  console.log('PriceBulletin setting authorized publisher ...', `${publisherAddr}`)
  const pricebulletin = await ethers.getContractAt("PriceBulletin", priceBulletinAddr)
  const tx = await pricebulletin.setAuthorizedPublisher(publisherAddr, true)
  await tx.wait()
  console.log(`PriceBulletin authorized publisher set txHasH: ${tx.hash}`)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  const args = process.argv.slice(2); // Extract arguments, excluding the first two elements

  if (args.length !== 2) {
    console.error("Usage: node setPublisherPriceBulletin.js <priceBulletinAddr> <publisherAddr>");
    process.exit(1);
  }

  const priceBulletinAddr = args[0];
  const publisherAddr = args[1];

  setPublisherPriceBulletin(priceBulletinAddr, publisherAddr)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.setPublisherPriceBulletin = setPublisherPriceBulletin