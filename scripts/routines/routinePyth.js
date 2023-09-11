const { ethers } = require('ethers')
const { EvmPriceServiceConnection } = require("@pythnetwork/pyth-evm-js")
const {
  CUICA_DATA_MAINNET,
  determineTest,
  getGnosisJsonRPCProvider,
  getLocalhostJsonRPCProvider,
  getVoidSigner,
  getEnvWSigner,
  logNewLine
} = require('../utilsCuica')

const TEST = determineTest()
// Throw if Pyth update fee surpasses threshold
const PYTH_UPDATE_PRICE_LIMIT = ethers.utils.parseUnits("1", 9)

async function routinePyth() {
  const abi = [
    'function storePrice_Pyth(bytes[]) payable',
    'function getPrice_Pyth() view returns (uint)'
  ]
  const pythAbi = [
    'function getUpdateFee(bytes[]) view returns (uint)'
  ]

  let pythFacet
  let pyth

  // Pyth Gnosis address
  // https://docs.pyth.network/documentation/pythnet-price-feeds/evm
  const pythAddress = '0x2880aB155794e7179c9eE2e38200202908C17B43'

  if (TEST) {
    pythFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    )
    pyth = new ethers.Contract(
      pythAddress,
      pythAbi,
      getVoidSigner(getLocalhostJsonRPCProvider())
    )
  } else {
    pythFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getEnvWSigner(getGnosisJsonRPCProvider())
    )
    pyth = new ethers.Contract(
      pythAddress,
      pythAbi,
      getVoidSigner(getGnosisJsonRPCProvider())
    )
  }

  // https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/ethereum/sdk/js#price-service-endpoints
  const connection = new EvmPriceServiceConnection(
    "https://xc-mainnet.pyth.network"
  )

  const priceIds = [
    // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#pyth-evm-mainnet
    "0xe13b1c1ffb32f34e1be9545583f01ef385fde7f42ee66049d30570dc866b77ca", // MXN/USD price id mainnet
  ]

  const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds)
  const updateFee = await pyth.getUpdateFee(priceUpdateData)

  console.log(`${logNewLine('INFO')} Storing Pyth price ...`)
  if (updateFee.gt(PYTH_UPDATE_PRICE_LIMIT)) {
    console.log(`${logNewLine('WARN')} Pyth update fee above threshold!`)

  } else {
    try {
      const tx1 = await pythFacet.storePrice_Pyth(priceUpdateData, { value: updateFee })
      await tx1.wait()
      const tx2 = await pythFacet.getPrice_Pyth()
      const formatedPrice = (tx2.toNumber() / 1e8).toFixed(8)
      console.log(`${logNewLine('INFO')} Success! Pyth price stored: ${formatedPrice} usd/mxn`)
    } catch (error) {
      console.log(`${logNewLine('WARN')} Storing Pyth price reverted ERROR: \n${error}`)
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  routinePyth()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.routinePyth = routinePyth