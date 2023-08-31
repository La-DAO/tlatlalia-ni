require("dotenv").config()
const yargs = require('yargs')
const { ethers } = require('ethers')

const options = yargs
  .usage("Usage: -t <test>")
  .option("t", { alias: "test", describe: "Boolean: true if testing", type: "bool", demandOption: false })
  .argv;

function getGnosisJsonRPCProvider() {
  if (!process.env.RPC_GNOSIS) {
    throw "Please set RPC_GNOSIS in .env"
  }
  return new ethers.providers.JsonRpcProvider(process.env.RPC_GNOSIS)
}

function getLocalhostJsonRPCProvider() {
  return new ethers.providers.JsonRpcProvider('http://localhost:8545')
}

function getVoidSigner(provider) {
  return new ethers.VoidSigner(ethers.constants.AddressZero, provider)
}

function getEnvWSigner(provider) {
  if (!process.env.PRIVATE_KEY) {
    throw "Please set PRIVATE_KEY in .env"
  }
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider)
}

function getTime() {
  return new Date()
}

function pad(number, padding) {
  return String(number).padStart(padding, '0')
}

function logNewLine(type) {
  const currentTime = getTime()
  const year = currentTime.getFullYear();
  const month = pad(currentTime.getMonth(), 2) // Month value is zero-based (0 - 11)
  const day = pad(currentTime.getDate(), 2)
  const hours = pad(currentTime.getHours(), 2)
  const minutes = pad(currentTime.getMinutes(), 2)
  const seconds = pad(currentTime.getSeconds(), 2)
  const milliseconds = pad(currentTime.getMilliseconds(), 3);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds} ${type} - `
}

function determineTest() {
  if(!options.test) {
    return false
  } else {
    return options.test
  }
}

const CUICA_DATA_MAINNET = {
  ethereum: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  polygon: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  arbitrum: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  optimism: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  gnosis: {
    diamond: "0x8f78dc290e1701EC664909410661DC17E9c7b62b",
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  binance: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  linea: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  polygonzkevm: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  base: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  }
}

const CUICA_DATA_TESTNET = {
  goerli: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  sepolia: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
  mumbai: {
    priceBulletin: "0x94C82325a2B26f27AEb08B936331c8485a988634",
  },
}

module.exports = {
  CUICA_DATA_MAINNET,
  CUICA_DATA_TESTNET,
  determineTest,
  getGnosisJsonRPCProvider,
  getLocalhostJsonRPCProvider,
  getVoidSigner,
  getEnvWSigner,
  logNewLine
}