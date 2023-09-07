const { DateTime } = require('luxon')
const { routineUpdateAllOracles } = require('./routines/routineUpdateAllOracles')
const { routineUpdateBulletin } = require('./routines/routineUpdateBulletin')

function scheduleCallback(callback) {
  // Get the current date and time in Eastern Time (ET)
  const currentTimeET = DateTime.now().setZone('America/New_York');

  const currentDay = currentTimeET.weekday; // 1 = Monday, 7 = Sunday
  const currentHour = currentTimeET.hour;
  const currentMinute = currentTimeET.minute;

  // Define the scheduled times in ET
  const scheduledTimes = [
    { hour: 9, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 16, minute: 30 }
  ];

  let nextScheduledTime = null;

  for (const time of scheduledTimes) {
    const scheduledDateTime = currentTimeET.set({ hour: time.hour, minute: time.minute });

    // Check if the scheduled time is in the future
    if (scheduledDateTime > currentTimeET) {
      if (nextScheduledTime === null || scheduledDateTime < nextScheduledTime) {
        nextScheduledTime = scheduledDateTime;
      }
    }
  }

  // If no scheduled time for today, calculate for tomorrow
  if (nextScheduledTime === null) {
    const tomorrow = currentTimeET.plus({ days: 1 });
    nextScheduledTime = tomorrow.set({ hour: scheduledTimes[0].hour, minute: scheduledTimes[0].minute });
  }

  // Calculate the delay in milliseconds
  const delayMillis = nextScheduledTime.diff(currentTimeET).as('milliseconds');

  // Schedule the callback
  setTimeout(callback, delayMillis);
}

// Example usage
async function routineCallbacks() {
  await routineUpdateAllOracles()
  await routineUpdateBulletin('gnosis')
  scheduleCallback(routineCallbacks);
}

scheduleCallback(routineCallbacks);
