require("dotenv").config();
const { EvmPriceServiceConnection } = require("@pythnetwork/pyth-evm-js");
const { ethers } = require("ethers");
const { logNewLine } = require("../utilsCuica");

const PYTH_ABI = [
  "function getUpdateFee(bytes[]) view returns (uint)",
  "function updatePriceFeeds(bytes[] calldata updateData) external payable",
];

const PYTH_UPDATE_PRICE_LIMIT = ethers.utils.parseUnits("1", 9);

/// Main tenderly-action function
const actionFn = async () => {
  console.log(`/n${logNewLine("INFO")} Starting Pyth price pusher ...`);

  const chain = {
    chainId: process.env.LOCAL_CHAIN_ID.toString(),
    pyth: process.env.LOCAL_PYTH,
    rpc: process.env.LOCAL_RPC,
  };
  console.log(`Chain: ${chain.chainId}`);
  console.log(`Pyth: ${chain.pyth}`);
  console.log(`RPC: ${chain.rpc}`);

  if (!chain.chainId)
    throw `Please define LOCAL_CHAIN_ID in pm2-ecosystem.config.js`;
  if (!chain.rpc) throw `Please define LOCAL_RPC in pm2-ecosystem.config.js`;

  // https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/ethereum/sdk/js#price-service-endpoints
  const connection = new EvmPriceServiceConnection(
    "https://hermes.pyth.network/"
  );
  const priceIds = [
    // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#pyth-evm-mainnet
    "0xe13b1c1ffb32f34e1be9545583f01ef385fde7f42ee66049d30570dc866b77ca", // MXN/USD price id mainnet
  ];

  let priceUpdateData;
  console.log(`${logNewLine("INFO")} Getting Pyth price update data ...`);
  try {
    priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);
  } catch (e) {
    console.log(`${logNewLine("ERROR")} getting pyth price update data: ${e}`);
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(chain.rpc);

  if (!process.env.PRIVATE_KEY) throw "Please set PRIVATE_KEY in .env";

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const signer = wallet.connect(provider);
  const pyth = new ethers.Contract(chain.pyth, PYTH_ABI, signer);

  let updateFee;
  console.log(`${logNewLine("INFO")} Getting Pyth update fee ...`);
  try {
    updateFee = await pyth.getUpdateFee(priceUpdateData);
    if (updateFee.gt(PYTH_UPDATE_PRICE_LIMIT)) {
      console.log(`${logNewLine("ERROR")} Pyth update fee above threshold!`);
      return;
    }
  } catch (e) {
    console.log(`${logNewLine("ERROR")} No update fee: ${e}`);
    return;
  }

  console.log(`${logNewLine("INFO")} Storing Pyth price ...`);
  let receipt;
  try {
    const tx = await pyth.updatePriceFeeds(priceUpdateData, {
      value: updateFee,
    });
    receipt = await tx.wait();
  } catch (e) {
    console.log(`${logNewLine("ERROR")} failed to store Pyth price: ${e}`);
    return;
  }
  console.log(`${logNewLine("INFO")} txHash: ${receipt.transactionHash}`);
  console.log(`${logNewLine("INFO")} Pyth price successfully stored!`);
};

// Do not change this.
if (require.main === module) {
  actionFn()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.actionFn = actionFn;
