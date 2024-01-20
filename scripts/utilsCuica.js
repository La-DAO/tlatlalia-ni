require("dotenv").config();
const yargs = require("yargs");
const { ethers } = require("ethers");
const { CONNEXT_DATA } = require("./utilsConnext");

const PROVIDERS = {
  ethereum: {
    chainId: 1,
    providers: [process.env.RPC_MAINNET],
  },
  polygon: {
    chainId: 137,
    providers: [process.env.RPC_POLYGON],
  },
  arbitrum: {
    chainId: 42161,
    providers: [process.env.RPC_ARBITRUM],
  },
  optimism: {
    chainId: 10,
    providers: [process.env.RPC_OPTIMISM],
  },
  gnosis: {
    chainId: 100,
    providers: [process.env.RPC_GNOSIS],
  },
  binance: {
    chainId: 56,
    providers: [process.env.RPC_BINANCE],
  },
  mumbai: {
    chainId: 80001,
    providers: [process.env.RPC_MUMBAI],
  },
  sepolia: {
    chainId: 11155111,
    providers: [process.env.RPC_SEPOLIA],
  },
  goerli: {
    chainId: 5,
    providers: [process.env.RPC_GOERLI],
  },
};

const options = yargs
  .usage("Usage: -t <test> -c <chain>")
  .option("t", {
    alias: "test",
    describe: "Boolean: true if testing",
    type: "bool",
    demandOption: false,
  })
  .option("c", {
    alias: "chain",
    describe: "String: chain name",
    type: "string",
    demandOption: false,
  }).argv;

function getGnosisJsonRPCProvider() {
  if (!process.env.RPC_GNOSIS) {
    throw "Please set RPC_GNOSIS in .env";
  }
  return new ethers.providers.JsonRpcProvider(process.env.RPC_GNOSIS);
}

function getLocalhostJsonRPCProvider() {
  return new ethers.providers.JsonRpcProvider("http://localhost:8545");
}

function getVoidSigner(provider) {
  return new ethers.VoidSigner(ethers.constants.AddressZero, provider);
}

function getEnvWSigner(provider) {
  if (!process.env.PRIVATE_KEY) {
    throw "Please set PRIVATE_KEY in .env";
  }
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
  const remainingSeconds = ((seconds % 86400) % 3600) % 60;

  const parts = [];

  if (days > 0) {
    parts.push(`${days} day${days === 1 ? "" : "s"}`);
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }

  if (remainingSeconds > 0) {
    parts.push(
      `${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`
    );
  }

  if (parts.length === 0) {
    return "0 seconds";
  }

  return parts.join(", ");
}

function getTime() {
  return new Date();
}

function pad(number, padding) {
  return String(number).padStart(padding, "0");
}

function logNewLine(type) {
  const currentTime = getTime();
  const year = currentTime.getFullYear();
  const month = pad(currentTime.getMonth() + 1, 2); // Month value is zero-based (0 - 11)
  const day = pad(currentTime.getDate(), 2);
  const hours = pad(currentTime.getHours(), 2);
  const minutes = pad(currentTime.getMinutes(), 2);
  const seconds = pad(currentTime.getSeconds(), 2);
  const milliseconds = pad(currentTime.getMilliseconds(), 3);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds} ${type} - `;
}

function determineTest() {
  if (!options.test) {
    return false;
  } else {
    return options.test;
  }
}

function determineChain() {
  if (!options.chain) {
    return "localhost";
  } else {
    return options.chain;
  }
}

function getChainProvider(chainName) {
  let jsonRPC;
  if (!options.chain && chainName == "localhost") {
    jsonRPC = getLocalhostJsonRPCProvider();
  } else if (chainName != "localhost") {
    const url = PROVIDERS[chainName].providers[0];
    jsonRPC = new ethers.providers.JsonRpcProvider(url);
  } else {
    const url = PROVIDERS[options.chain].providers[0];
    jsonRPC = new ethers.providers.JsonRpcProvider(url);
  }
  if (!jsonRPC) {
    throw `Please set 'providers' in PROVIDERS for 'chainName'`;
  }
  return jsonRPC;
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
  },
  goerli: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  sepolia: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
  mumbai: {
    priceBulletin: "0xada8c0eaba7ad722f4b5555b216f8f11a81593d8",
  },
};

module.exports = {
  CUICA_DATA_MAINNET,
  determineChain,
  determineTest,
  getGnosisJsonRPCProvider,
  getLocalhostJsonRPCProvider,
  getChainProvider,
  getVoidSigner,
  getEnvWSigner,
  formatDuration,
  logNewLine,
};
