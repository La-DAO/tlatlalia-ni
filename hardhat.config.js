/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-foundry");
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://localhost:8545/",
      timeout: 2000000,
    }
  },
}
