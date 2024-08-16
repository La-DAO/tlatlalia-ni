require("dotenv").config();

const PYTH_ADDRESS_BASE = "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a";

module.exports = {
  apps: [
    {
      name: "base-pyth-pusher",
      script: "./scripts/pm2/pyth-pusher.js",
      env: {
        LOCAL_CHAIN_ID: 8453,
        LOCAL_PYTH: PYTH_ADDRESS_BASE,
        LOCAL_RPC: `${process.env.RPC_BASE}`,
      },
      cron_restart: "0 14 * * 1-5", // This will restart the script every weekday at 7:00 AM and 2:00 PM
      cron_timezone: "America/Los_Angeles", // This will set the timezone to "America/Los_Angeles"
      autorestart: false, // This prevents PM2 from automatically restarting your script if it crashes or stops
    },
  ],
};
