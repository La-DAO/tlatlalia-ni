/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();
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
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
  },
  networks: {
    localhost: {
      url: "http://localhost:8545/",
      timeout: 2000000,
    },
    localhostWithPKey: {
      url: "http://localhost:8545/",
      timeout: 2000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    gnosis: {
      url: process.env.RPC_GNOSIS,
      timeout: 2000000,
      accounts: [process.env.PRIVATE_KEY]
    },
  },
}
