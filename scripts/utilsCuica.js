require("dotenv").config()
const yargs = require('yargs')
const { ethers } = require('ethers')
const { CONNEXT_DATA } = require('./utilsConnext')

const options = yargs
  .usage("Usage: -t <test> -c <chain>")
  .option("t", { alias: "test", describe: "Boolean: true if testing", type: "bool", demandOption: false })
  .option("c", { alias: "chain", describe: "String: chain name", type: "string", demandOption: false })
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

function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
  const remainingSeconds = ((seconds % 86400) % 3600) % 60;

  const parts = [];

  if (days > 0) {
    parts.push(`${days} day${days === 1 ? '' : 's'}`);
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  }

  if (remainingSeconds > 0) {
    parts.push(`${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`);
  }

  if (parts.length === 0) {
    return '0 seconds';
  }

  return parts.join(', ');
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
  const month = pad(currentTime.getMonth() + 1, 2) // Month value is zero-based (0 - 11)
  const day = pad(currentTime.getDate(), 2)
  const hours = pad(currentTime.getHours(), 2)
  const minutes = pad(currentTime.getMinutes(), 2)
  const seconds = pad(currentTime.getSeconds(), 2)
  const milliseconds = pad(currentTime.getMilliseconds(), 3);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds} ${type} - `
}

function determineTest() {
  if (!options.test) {
    return false
  } else {
    return options.test
  }
}

function getChainProvider(chainName) {
  let jsonRPC
  if (!options.chain && chainName == 'localhost') {
    jsonRPC = getLocalhostJsonRPCProvider()
  } else if (chainName != 'localhost') {
    const url = CONNEXT_DATA[chainName].providers[0]
    jsonRPC =  new ethers.providers.JsonRpcProvider(url)
  } else {
    const url = CONNEXT_DATA[options.chain].providers[0]
    jsonRPC = new ethers.providers.JsonRpcProvider(url)
  }
  if (!jsonRPC) {
    throw `Please set 'providers' in CONNEXT_DATA for 'chainName'`
  }
  return jsonRPC
}

const CUICA_DATA_MAINNET = {
  ethereum: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  polygon: {
    priceBulletin: "0x996d7b03d1537524bb20273713385c23944ff2ec",
  },
  arbitrum: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  optimism: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  gnosis: {
    diamond: "0x8f78dc290e1701EC664909410661DC17E9c7b62b",
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  binance: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  linea: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  polygonzkevm: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  base: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  }
}

const CUICA_DATA_TESTNET = {
  goerli: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  sepolia: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  mumbai: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
}

module.exports = {
  CUICA_DATA_MAINNET,
  CUICA_DATA_TESTNET,
  determineTest,
  getGnosisJsonRPCProvider,
  getLocalhostJsonRPCProvider,
  getChainProvider,
  getVoidSigner,
  getEnvWSigner,
  formatDuration,
  logNewLine
}