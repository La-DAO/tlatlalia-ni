const { DateTime } = require('luxon')
const { logNewLine, formatDuration } = require('./utilsCuica')
const { routineUpdateAllOracles } = require('./routines/routineUpdateAllOracles')
const { routineUpdateBulletin } = require('./routines/routineUpdateBulletin')

async function scheduler() {
  await routineCallbacks()

  // Get the current date and time in Eastern Time (ET)
  const currentTimeET = DateTime.now().setZone('America/New_York');

  const currentDay = currentTimeET.weekday // 1 = Monday, 7 = Sunday

  // Define the scheduled times in ET
  const scheduledTimes = [
    { hour: 9, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 16, minute: 30 }
  ];

  let nextScheduledTime = null

  if (currentDay < 5) {
    // Next scheduled time calculation pattern for Monday-Thursday
    for (const time of scheduledTimes) {
      const scheduledDateTime = currentTimeET.set({ hour: time.hour, minute: time.minute })

      // Check if the scheduled time is in the future
      if (scheduledDateTime > currentTimeET) {
        if (nextScheduledTime === null || scheduledDateTime < nextScheduledTime) {
          nextScheduledTime = scheduledDateTime
        }
      }
    }

    // If no scheduled time for today, set for tomorrow
    if (nextScheduledTime === null) {
      const tomorrow = currentTimeET.plus({ days: 1 })
      nextScheduledTime = tomorrow.set({ hour: scheduledTimes[0].hour, minute: scheduledTimes[0].minute })
    }
  } else if (currentDay >= 5) {
    // Next scheduled time calculation pattern for Friday - Sunday
    if (currentDay == 5) {
      // Handle Friday and check if next scheduled time is still applicable today
      for (const time of scheduledTimes) {
        const scheduledDateTime = currentTimeET.set({ hour: time.hour, minute: time.minute })
        // Check if the scheduled time is in the future
        if (scheduledDateTime > currentTimeET) {
          if (nextScheduledTime === null || scheduledDateTime < nextScheduledTime) {
            nextScheduledTime = scheduledDateTime
          }
        }
      }

      // If no scheduled time for Friday, calculate for next Monday
      if (nextScheduledTime === null) {
        const nextMonday = currentTimeET.plus({ days: 3 })
        nextScheduledTime = nextMonday.set({ hour: scheduledTimes[0].hour, minute: scheduledTimes[0].minute })
      }
    } else if (currentDay == 6) {
      // Handle Saturday
      const nextMonday = currentTimeET.plus({ days: 2 })
      nextScheduledTime = nextMonday.set({ hour: scheduledTimes[0].hour, minute: scheduledTimes[0].minute })
    } else if (currentDay == 7) {
      // Handle Sunday
      const nextMonday = currentTimeET.plus({ days: 1 })
      nextScheduledTime = nextMonday.set({ hour: scheduledTimes[0].hour, minute: scheduledTimes[0].minute })
    }
  }

  // Calculate the delay in milliseconds
  const delayMillis = nextScheduledTime.diff(currentTimeET).as('milliseconds')
  const durationString = formatDuration(delayMillis)

  console.log(`${logNewLine('INFO')} Next scheduler callback in ${durationString} ...`)
  // Schedule the callback
  setTimeout(scheduler, delayMillis)
}

// Routine tasks to cuica price
async function routineCallbacks() {
  console.log(`${logNewLine('INFO')} Begin of scheduler callbacks ...`)
  await routineUpdateAllOracles()
  await routineUpdateBulletin('gnosis')
}

scheduler()
