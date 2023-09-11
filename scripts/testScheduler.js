const { DateTime } = require('luxon')
const { logNewLine, formatDuration } = require('./utilsCuica')
const { routineUpdateAllOracles } = require('./routines/routineUpdateAllOracles')
const { routineUpdateBulletin } = require('./routines/routineUpdateBulletin')

async function scheduler() {
  await routineCallbacks()
  // Get the current date and time in Eastern Time (ET)
  const currentTimeET = DateTime.now().setZone('America/New_York');

 const nextScheduledTime = currentTimeET.plus({minute: 2})

  // Calculate the delay in milliseconds
  const delayMillis = nextScheduledTime.diff(currentTimeET).as('milliseconds')
  const durationString = formatDuration(delayMillis)

  console.log(`${logNewLine('INFO')} Next scheduler callback in ${durationString} ...`)
  // Schedule the callback
  setTimeout(scheduler, delayMillis)
}

// Example usage
async function routineCallbacks() {
  console.log(`${logNewLine('INFO')} Begin of scheduler callbacks ...`)
  await routineUpdateAllOracles()
  await routineUpdateBulletin('gnosis')
}

scheduler()
