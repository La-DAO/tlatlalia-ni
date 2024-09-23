require("dotenv").config();

const PYTH_ADDRESS_ARB = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C";

module.exports = {
  apps: [
    {
      name: "arb-pyth-pusher",
      script: "./scripts/pm2/pyth-pusher.js",
      env: {
        LOCAL_CHAIN_ID: 42161,
        LOCAL_PYTH: PYTH_ADDRESS_ARB,
        LOCAL_RPC: "https://arbitrum.llamarpc.com",
      },
      cron_restart: "0 14 * * 0-5", // This will restart the script every weekday at 2:00 PM
      cron_timezone: "America/Los_Angeles", // This will set the timezone to "America/Los_Angeles"
      autorestart: false, // This prevents PM2 from automatically restarting your script if it crashes or stops
    },
  ],
};
