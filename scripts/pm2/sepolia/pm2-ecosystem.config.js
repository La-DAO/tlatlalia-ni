require("dotenv").config();

const PYTH_ADDRESS_SEPOLIA = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21";

module.exports = {
  apps: [
    {
      name: "sep-pyth-pusher",
      script: "./scripts/pm2/pyth-pusher.js",
      env: {
        LOCAL_CHAIN_ID: 11155111,
        LOCAL_PYTH: PYTH_ADDRESS_SEPOLIA,
        LOCAL_RPC: `${process.env.RPC_SEPOLIA}`,
      },
      cron_restart: "0 14 * * 1-5", // This will restart the script every weekday at 2:00 PM
      cron_timezone: "America/Los_Angeles", // This will set the timezone to "America/Los_Angeles"
      autorestart: false, // This prevents PM2 from automatically restarting your script if it crashes or stops
    },
  ],
};
