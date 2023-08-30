require("dotenv").config();
const { ethers } = require('hardhat');
const { SdkBase } = require('@connext/sdk');

// Refer to: https://docs.connext.network/resources/deployments

const CONNEXT_DATA = {
  ethereum: {
    coreAddress: "0x8898B472C54c31894e3B9bb83cEA802a5d0e63C6",
    domainId: 6648936,
    providers: [process.env.RPC_MAINNET],
  },
  polygon: {
    coreAddress: "0x11984dc4465481512eb5b777E44061C158CF2259",
    domainId: 1886350457,
    providers: [process.env.RPC_POLYGON]
  },
  arbitrum: {
    coreAddress: "0xEE9deC2712cCE65174B561151701Bf54b99C24C8",
    domainId: 1634886255,
    providers: [process.env.RPC_ARBITRUM]
  },
  optimism: {
    coreAddress: "0x8f7492DE823025b4CfaAB1D34c58963F2af5DEDA",
    domainId: 1869640809,
    providers: [process.env.RPC_OPTIMISM]
  },
  gnosis: {
    coreAddress: "0x5bB83e95f63217CDa6aE3D181BA580Ef377D2109",
    domainId: 6778479,
    providers: [process.env.RPC_GNOSIS]
  },
  binance: {
    coreAddress: "0xCd401c10afa37d641d2F594852DA94C700e4F2CE",
    domainId: 6450786,
    providers: [process.env.RPC_BINANCE]
  }
}

const getConfig = async () => {
  const signer = await ethers.getSigner().address;
  return {
    signerAddress: signer,
    network: "mainnet",
    chains: {
      6648936: { // the domain ID for Ethereum Mainnet
        providers: [process.env.RPC_MAINNET],
      },
      1886350457: { // the domain ID for Polygon
        providers: [process.env.RPC_POLYGON]
      },
      1634886255: { // the domain ID for Arbitrum
        providers: [process.env.RPC_ARBITRUM]
      },
      1869640809: { // the domain ID for Optimism
        providers: [process.env.RPC_OPTIMISM]
      },
      6778479: { // the domain ID for Gnosis
        providers: [process.env.RPC_GNOSIS]
      },
      6450786: { // the domain ID for Binance Smart Chain
        providers: [process.env.RPC_BINANCE]
      }
    },
  }
}

const getSdkBaseConnext = async () => {
  return SdkBase.create(await getConfig());
}

const getParams = (originDomain_, destDomain_, gasEstimate_) => {
  return {
    originDomain: originDomain_,
    destinationDomain: destDomain_,
    callDataGasAmount: gasEstimate_.toString()
  };
}

module.exports = {
  CONNEXT_DATA,
  getSdkBaseConnext,
  getParams
}