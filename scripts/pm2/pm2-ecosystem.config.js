require("dotenv").config();

const PYTH_ADDRESS_SEPOLIA = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21";
const PYTH_ADDRESS_ARB = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C";
const PYTH_ADDRESS_BASE = "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a";
const PYTH_ADDRESS_OPT = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C";

const PK = process.env.PRIVATE_KEY;

module.exports = {
  apps: [
    {
      name: "arb-pyth-pusher",
      script: "./pyth-pusher.js",
      env: {
        LOCAL_CHAIN_ID: 42161,
        LOCAL_PYTH: PYTH_ADDRESS_ARB,
        LOCAL_RPC: "https://arbitrum.llamarpc.com",
      },
      cron_restart: "0 22 * * 1-5", // This will restart the script every weekday at 6:00 AM
      cron_timezone: "America/Los_Angeles", // This will set the timezone to "America/Los_Angeles"
      autorestart: false, // This prevents PM2 from automatically restarting your script if it crashes or stops
    },
    {
      name: "base-pyth-pusher",
      script: "./pyth-pusher.js",
      env: {
        LOCAL_CHAIN_ID: 8453,
        LOCAL_PYTH: PYTH_ADDRESS_BASE,
        LOCAL_RPC: "https://mainnet.base.org",
      },
      cron_restart: "0 22 * * 1-5", // This will restart the script every weekday at 6:00 AM
      cron_timezone: "America/Los_Angeles", // This will set the timezone to "America/Los_Angeles"
      autorestart: false, // This prevents PM2 from automatically restarting your script if it crashes or stops
    },
    {
      name: "optimism-pyth-pusher",
      script: "./pyth-pusher.js",
      env: {
        LOCAL_CHAIN_ID: 10,
        LOCAL_PYTH: PYTH_ADDRESS_OPT,
        LOCAL_RPC: "https://optimism.drpc.org",
      },
      cron_restart: "0 22 * * 1-5", // This will restart the script every weekday at 6:00 AM
      cron_timezone: "America/Los_Angeles", // This will set the timezone to "America/Los_Angeles"
      autorestart: false, // This prevents PM2 from automatically restarting your script if it crashes or stops
    },
  ],
};

// module.exports = {
//   apps: [
//     {
//       name: "sepolia-pyth-pusher",
//       script: "./scripts/pm2/pyth-pusher.js",
//       env: {
//         LOCAL_CHAIN_ID: 11155111,
//         LOCAL_PYTH: PYTH_ADDRESS_SEPOLIA,
//         LOCAL_RPC: "https://1rpc.io/sepolia	",
//         LOCAL_PK: PK,
//       },
//       cron_restart: "* * * * *", // This will restart the script every weekday at 6:00 AM
//       cron_timezone: "America/Los_Angeles", // This will set the timezone to "America/Los_Angeles"
//       autorestart: false, // This prevents PM2 from automatically restarting your script if it crashes or stops
//     },
//   ],
// };
