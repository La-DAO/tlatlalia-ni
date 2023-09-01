const { ethers } = require('ethers')
const {
  CUICA_DATA_MAINNET,
  determineTest,
  getGnosisJsonRPCProvider,
  getLocalhostJsonRPCProvider,
  getEnvWSigner,
  logNewLine
} = require('../utilsCuica')
const { routineRedstone } = require('./routineRedstone')
const { routinePyth } = require('./routinePyth')
const { routineChainlink } = require('./routineChainlink')

const TEST = determineTest()

async function routineAggregatePrice() {
  const abi = [
    'function aggregateAndPublishRound()',
    'function latestRoundData() view returns (uint80,int,uint,uint,uint80)'
  ]
  let cuicaFacet
  if (TEST) {
    cuicaFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    )
  } else {
    cuicaFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getEnvWSigner(getGnosisJsonRPCProvider())
    )
  }

  console.log(`${logNewLine('INFO')} Aggregating stored prices in Cuica ...`)
  try {
    const tx = await cuicaFacet.aggregateAndPublishRound()
    await tx.wait()
    const response = await cuicaFacet.latestRoundData()
    const formatedPrice = (response[1].toNumber() / 1e8).toFixed(8)
    const formatedRoundId = response[0].toString()
    console.log(`${logNewLine('WARN')} Success aggregating prices at roundId: ${formatedRoundId}, average price: ${formatedPrice}`)
  } catch (error) {
    console.log(`${logNewLine('WARN')} Aggregating reverted ERROR: \n${error}`)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  routineAggregatePrice()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.routineAggregatePrice = routineAggregatePrice