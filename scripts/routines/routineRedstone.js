const { ethers } = require("ethers");
const { WrapperBuilder } = require("@redstone-finance/evm-connector");
const {
  CUICA_DATA_MAINNET,
  determineTest,
  getGnosisJsonRPCProvider,
  getLocalhostJsonRPCProvider,
  getEnvWSigner,
  logNewLine,
} = require("../utilsCuica");

const TEST = determineTest();

async function routineRedstone() {
  const abi = [
    "function storePrice_Redstone()",
    "function getPrice_Redstone() view returns (uint)",
  ];
  let redstoneFacet;
  if (TEST) {
    redstoneFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    );
  } else {
    redstoneFacet = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.diamond,
      abi,
      getEnvWSigner(getGnosisJsonRPCProvider())
    );
  }
  const w_redstoneFacet = WrapperBuilder.wrap(redstoneFacet).usingDataService(
    {
      dataServiceId: "redstone-main-demo",
      uniqueSignersCount: 1,
      dataFeeds: ["MXN"],
    },
    ["https://d33trozg86ya9x.cloudfront.net"]
  );

  console.log(`${logNewLine("INFO")} Storing Redstone price ...`);
  try {
    const tx1 = await w_redstoneFacet.storePrice_Redstone();
    await tx1.wait();
    const tx2 = await w_redstoneFacet.getPrice_Redstone();
    const formatedPrice = (tx2.toNumber() / 1e8).toFixed(8);
    console.log(
      `${logNewLine(
        "INFO"
      )} Success! Redstone price stored: ${formatedPrice} usd/mxn`
    );
  } catch (error) {
    console.log(
      `${logNewLine("WARN")} Storing Redstone price reverted ERROR: \n${error}`
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  routineRedstone()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.routineRedstone = routineRedstone;
