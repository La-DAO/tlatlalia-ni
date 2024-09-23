require("dotenv").config();

const PYTH_ADDRESS_ETH = "0x4305FB66699C3B2702D4d05CF36551390A4c69C6";

module.exports = {
  apps: [
    {
      name: "eth-pyth-pusher",
      script: "./scripts/pm2/pyth-pusher.js",
      env: {
        LOCAL_CHAIN_ID: 1,
        LOCAL_PYTH: PYTH_ADDRESS_ETH,
        LOCAL_RPC: `${process.env.RPC_MAINNET}`,
      },
      cron_restart: "0 14 * * 0-5", // This will restart the script every weekday at 2:00 PM
      cron_timezone: "America/Los_Angeles", // This will set the timezone to "America/Los_Angeles"
      autorestart: false, // This prevents PM2 from automatically restarting your script if it crashes or stops
    },
  ],
};
