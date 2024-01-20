const { routineRedstone } = require("./routineRedstone");
const { routinePyth } = require("./routinePyth");
const { routineChainlink } = require("./routineChainlink");
const { routineAggregatePrice } = require("./routineAggregatePrice");

/**
 * @notice Updates all oracle prices by calling routines
 */
async function routineUpdateAllOracles() {
  await routineRedstone();
  await routinePyth();
  await routineChainlink();
  await routineAggregatePrice();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  routineUpdateAllOracles()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.routineUpdateAllOracles = routineUpdateAllOracles;
