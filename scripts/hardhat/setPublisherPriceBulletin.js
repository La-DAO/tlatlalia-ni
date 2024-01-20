/* global ethers */
const { ethers } = require("ethers");
const {
  getLocalhostJsonRPCProvider,
  getEnvWSigner,
  getChainProvider,
} = require("../utilsCuica");

const DEBUG = false;

async function setPublisherPriceBulletin(
  priceBulletinAddr,
  publisherAddr,
  chainName = "localhost"
) {
  const bulletinAbi = ["function setAuthorizedPublisher(address, bool)"];
  let pricebulletin;
  if (chainName == "localhost") {
    pricebulletin = new ethers.Contract(
      priceBulletinAddr,
      bulletinAbi,
      getEnvWSigner(getLocalhostJsonRPCProvider())
    );
  } else {
    bulletin = new ethers.Contract(
      priceBulletinAddr,
      bulletinAbi,
      getEnvWSigner(getChainProvider(chainName))
    );
  }
  if (DEBUG)
    console.log(
      "PriceBulletin setting authorized publisher ...",
      `${publisherAddr}`
    );
  const tx = await pricebulletin.setAuthorizedPublisher(publisherAddr, true);
  await tx.wait();
  console.log(`PriceBulletin authorized publisher set txHasH: ${tx.hash}`);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  const args = process.argv.slice(2); // Extract arguments, excluding the first two elements

  if (args.length !== 3) {
    console.error(
      "Usage: node setPublisherPriceBulletin.js <priceBulletinAddr> <publisherAddr> <chainName>"
    );
    process.exit(1);
  }

  const priceBulletinAddr = args[0];
  const publisherAddr = args[1];
  const chainName = args[2];

  setPublisherPriceBulletin(priceBulletinAddr, publisherAddr, chainName)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.setPublisherPriceBulletin = setPublisherPriceBulletin;
