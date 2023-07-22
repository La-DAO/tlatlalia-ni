/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-foundry");
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.17",
  networks: {
    localhost: {
      url: "http://localhost:8545/",
      timeout: 2000000,
    },
    gnosisFork: {
      url: "https://rpc.ankr.com/gnosis",
    }
  },
}
