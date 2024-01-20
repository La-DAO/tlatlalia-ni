const { deployDiamondComplete } = require("./deployDiamondComplete");

const main = async () => {
  console.log("\n\n 📡 Deploying...\n");
  const diamondAddress = await deployDiamondComplete();
  console.log("Diamond " + ": deployed at", diamondAddress);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${error}\n`);
    process.exit(1);
  });
