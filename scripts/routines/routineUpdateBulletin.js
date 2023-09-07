const { ethers } = require('ethers')
const {
  determineTest,
  getLocalhostJsonRPCProvider,
  logNewLine,
  getEnvWSigner,
  getChainProvider
} = require('../utilsCuica')
const { routineSignLastRound } = require('./routineSignLastRound')

const TEST = determineTest()

/**
 * @notice Updates roundId data at {PriceBulletin}
 * @param {string} chainName 
 */
async function routineUpdateBulletin(chainName='localhost') {
  const {digest, v, r, s, callData} = await routineSignLastRound()

  const bulletinAbi = [
    'function xReceive(bytes32, uint, address, address, uint32, bytes)',
    'function latestRoundData() view returns (uint, int256, uint, uint, uint)',
  ]
  let bulletin
  if (TEST) {
    bulletin = new ethers.Contract(
      '0x94C82325a2B26f27AEb08B936331c8485a988634',
      bulletinAbi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    )
  } else {
    bulletin = new ethers.Contract(
      '0x94C82325a2B26f27AEb08B936331c8485a988634',
      bulletinAbi,
      getEnvWSigner(getChainProvider(chainName))
    )
  }

  console.log(`${logNewLine('INFO')} Updating PriceBulletin ...`)
  const tx = await bulletin.xReceive(
    digest,
    0,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    0,
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