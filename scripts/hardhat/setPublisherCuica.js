/* global ethers */
const { ethers } = require("ethers")
const {
  getLocalhostJsonRPCProvider,
  getEnvWSigner,
  getChainProvider,
} = require('../utilsCuica')

const DEBUG = false

async function setPublisherCuica(diamondAddr, publisherAddr, chainName = 'localhost') {
  const abi = [
    'function setAuthorizedPublisher(address, bool)',
  ]
  let cuicaFacet
  if (chainName == 'localhost') {
    cuicaFacet = new ethers.Contract(
      diamondAddr,
      abi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    )
  } else {
    cuicaFacet = new ethers.Contract(
      diamondAddr,
      abi,
      getEnvWSigner(getChainProvider(chainName))
    )
  }
  if (DEBUG) console.log('CuicaFacet setting authorized publisher ...', `${publisherAddr}`)
  const tx = await cuicaFacet.setAuthorizedPublisher(publisherAddr, true)
  await tx.wait()
  console.log(`CuicaFacet authorized publisher set txHasH: ${tx.hash}`)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  const args = process.argv.slice(2); // Extract arguments, excluding the first two elements

  if (args.length !== 3) {
    console.error("Usage: node setPublisherCuica.js <diamondAddr> <publisherAddr> <chainName>");
    process.exit(1);
  }

  const diamondAddr = args[0];
  const publisherAddr = args[1];
  const chainName = args[2];

  setPublisherCuica(diamondAddr, publisherAddr, chainName)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.setPublisherCuica = setPublisherCuica