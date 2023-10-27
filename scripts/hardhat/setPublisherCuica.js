/* global ethers */
const { ethers } = require("hardhat")

const DEBUG = true

async function setPublisherCuica(diamondAddr, publisherAddr) {
  if (DEBUG)  console.log('CuicaFacet setting authorized publisher ...', `${publisherAddr}`)
  const cuicaFacet = await ethers.getContractAt("CuicaFacet", diamondAddr)
  const tx = await cuicaFacet.setAuthorizedPublisher(publisherAddr, true)
  await tx.wait()
  console.log(`CuicaFacet authorized publisher set txHasH: ${tx.hash}`)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  const args = process.argv.slice(2); // Extract arguments, excluding the first two elements

  if (args.length !== 2) {
    console.error("Usage: node setPublisherCuica.js <diamondAddr> <publisherAddr>");
    process.exit(1);
  }

  const diamondAddr = args[0];
  const publisherAddr = args[1];

  setPublisherCuica(diamondAddr, publisherAddr)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.setPublisherCuica = setPublisherCuica