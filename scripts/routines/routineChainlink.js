const { ethers } = require('ethers')
const {
  CUICA_DATA_MAINNET,
  determineTest,
  getGnosisJsonRPCProvider,
  getLocalhostJsonRPCProvider,
  getEnvWSigner,
  logNewLine
} = require('../utilsCuica')

const TEST = determineTest()

async function routineChainlink() {
  const abi = [
    'function storePrice_Chainlink()',
    'function getPrice_Chainlink() view returns (uint)'
  ]

  let chainlinkFacet

  if (TEST) {
    chainlinkFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    )
  } else {
    chainlinkFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getEnvWSigner(getGnosisJsonRPCProvider())
    )
  }

  console.log(`${logNewLine('INFO')} Storing Chainlink price ...`)
  const tx1 = await chainlinkFacet.storePrice_Chainlink()
  await tx1.wait()
  const tx2 = await chainlinkFacet.getPrice_Chainlink()
  const formatedPrice = (tx2.toNumber() / 1e8).toFixed(8)
  console.log(`${logNewLine('INFO')} Success! Chainlink price stored: ${formatedPrice} usd/mxn`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  routineChainlink()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.routineChainlink = routineChainlink