const { ethers } = require("ethers");
const {
  determineTest,
  determineChain,
  getLocalhostJsonRPCProvider,
  logNewLine,
  getEnvWSigner,
  getChainProvider,
  CUICA_DATA_MAINNET,
} = require("../utilsCuica");
const { routineSignLastRound } = require("./routineSignLastRound");

const TEST = determineTest();

/**
 * @notice Updates roundId data at {PriceBulletin}
 * @param {string} chainName
 */
async function routineUpdateBulletin(chainName) {
  chainName = determineChain();

  const { digest, v, r, s, info, callData } = await routineSignLastRound(
    chainName
  );

  const bulletinAbi = [
    "function updateBulletin(bytes)",
    "function updateBulletinWithRewardLog(bytes)",
    "function updateBulletinWithRewardClaim(bytes, address)",
    "function latestRoundData() view returns (uint, int256, uint, uint, uint)",
  ];
  let bulletin;
  if (TEST) {
    bulletin = new ethers.Contract(
      CUICA_DATA_MAINNET.gnosis.priceBulletin,
      bulletinAbi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    );
  } else {
    bulletin = new ethers.Contract(
      CUICA_DATA_MAINNET[chainName].priceBulletin,
      bulletinAbi,
      getEnvWSigner(getChainProvider(chainName))
    );
  }

  console.log(
    `${logNewLine("INFO")} ${chainName} - Updating PriceBulletin ...`
  );
  const tx = await bulletin.updateBulletin(callData);
  await tx.wait();
  let lastRoundInfo = await bulletin.latestRoundData();
  lastRoundInfo = {
    roundId: lastRoundInfo[0],
    answer: lastRoundInfo[1],
    startedAt: lastRoundInfo[2],
    updatedAt: lastRoundInfo[3],
    answeredInRound: lastRoundInfo[4],
  };
  const updateResult = info.roundId.eq(lastRoundInfo.roundId);
  if (updateResult) {
    console.log(
      `${logNewLine(
        "INFO"
      )} ${chainName} - Successfully updated {PriceBulletin}: latestAnswer(): ${lastRoundInfo.answer.toString()}`
    );
  } else {
    console.log(
      `${logNewLine(
        "WARN"
      )} ${chainName} - !!! Failed to update {PriceBulletin}: roundId: ${info.roundId.toString()}`
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  routineUpdateBulletin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.routineUpdateBulletin = routineUpdateBulletin;
