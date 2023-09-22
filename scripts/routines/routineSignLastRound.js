const { ethers } = require('ethers')
const {
  CUICA_DATA_MAINNET,
  determineTest,
  getGnosisJsonRPCProvider,
  getLocalhostJsonRPCProvider,
  logNewLine,
  getVoidSigner,
  getChainProvider
} = require('../utilsCuica')

const TEST = determineTest()

/**
 * @notice Sign the last round in CuicaFacet
 * @returns Digest, signature values and calldata to be used in `PriceBulletin.updatePriceBulletin(...)`
 */
async function routineSignLastRound(chainName='localhost') {
  const abi = [
    'function latestRoundData() view returns (uint80, int256, uint, uint, uint80)',
    'function getStructHashLastRoundData() view returns (bytes32)',
    'function getHashTypedDataV4Digest(bytes32) view returns (bytes32)'
  ]
  let cuicaFacet
  if (TEST) {
    cuicaFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getVoidSigner(getLocalhostJsonRPCProvider())
    )
  } else {
    cuicaFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getVoidSigner(getGnosisJsonRPCProvider())
    )
  }

  let lastRoundInfo = await cuicaFacet.latestRoundData()
  lastRoundInfo = {
    roundId: lastRoundInfo[0],
    answer: lastRoundInfo[1],
    startedAt: lastRoundInfo[2],
    updatedAt: lastRoundInfo[3],
    answeredInRound: lastRoundInfo[4]
  }
  const structHash = await cuicaFacet.getStructHashLastRoundData()
  console.log(`${logNewLine('INFO')} Signing digest RoundId: ${lastRoundInfo.roundId.toString()} ...`)

  if (!process.env.PRIVATE_KEY) {
    throw "Please set PRIVATE_KEY in .env"
  }

  const digest = await cuicaFacet.getHashTypedDataV4Digest(structHash)
  const signingKey = new ethers.utils.SigningKey(process.env.PRIVATE_KEY)
  const signedDigest = signingKey.signDigest(digest)
  const { v, r, s } = ethers.utils.splitSignature(signedDigest)

  console.log(`${logNewLine('INFO')} Successfully signed round: digest: ${digest},\nv:${v}, \nr:${r}, \ns:${s}`)

  return {
    digest: digest,
    v: v,
    r: r,
    s: s,
    callData: ethers.utils.defaultAbiCoder.encode(
      [
        "tuple(uint80, int256, uint, uint, uint80)",
        "uint8",
        "bytes32",
        "bytes32"
      ],
      [
        [
          lastRoundInfo.roundId,
          lastRoundInfo.answer,
          lastRoundInfo.startedAt,
          lastRoundInfo.updatedAt,
          lastRoundInfo.answeredInRound
        ],
        v,
        r,
        s
      ]
    )
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  routineSignLastRound()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.routineSignLastRound = routineSignLastRound