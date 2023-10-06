const { ethers } = require('ethers')
const {
  determineTest,
  getLocalhostJsonRPCProvider,
  logNewLine,
  getEnvWSigner,
  getChainProvider,
  CUICA_DATA_MAINNET
} = require('../utilsCuica')
const { routineSignLastRound } = require('./routineSignLastRound')

const TEST = determineTest()

/**
 * @notice Updates roundId data at {PriceBulletin}
 * @param {string} chainName 
 */
async function routineUpdateBulletin(chainName='localhost') {
  const {digest, v, r, s, callData} = await routineSignLastRound(chainName)

  const bulletinAbi = [
    'function xReceive(bytes32, uint, address, address, uint32, bytes)',
    'function latestRoundData() view returns (uint, int256, uint, uint, uint)',
  ]
  let bulletin
  if (TEST) {
    bulletin = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.priceBulletin,
      bulletinAbi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    )
  } else {
    bulletin = new ethers.Contract(
      CUICA_DATA_MAINNET[chainName].priceBulletin,
      bulletinAbi,
      getEnvWSigner(getChainProvider(chainName))
    )
  }

  console.log(`${logNewLine('INFO')} Updating PriceBulletin ...`)
  const tx = await bulletin.updateBulletin(
    callData
  )
  await tx.wait()
  let lastRoundInfo = await bulletin.latestRoundData()
  lastRoundInfo = {
    roundId: lastRoundInfo[0],
    answer: lastRoundInfo[1],
    startedAt: lastRoundInfo[2],
    updatedAt: lastRoundInfo[3],
    answeredInRound: lastRoundInfo[4]
  }
  console.log(`${logNewLine('INFO')} Successfully updated {PriceBulletin}: latestAnswer(): ${lastRoundInfo.answer.toString()}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  routineUpdateBulletin()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.routineUpdateBulletin = routineUpdateBulletin