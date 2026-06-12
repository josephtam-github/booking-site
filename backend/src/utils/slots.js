const SLOT_DURATION_MINUTES = 30;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 17;

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function generateDaySlots(dateString) {
  const slots = [];

  for (let hour = DAY_START_HOUR; hour < DAY_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
      const startTotal = hour * 60 + minute;
      const endTotal = startTotal + SLOT_DURATION_MINUTES;

      const startHour = Math.floor(startTotal / 60);
      const startMinute = startTotal % 60;
      const endHour = Math.floor(endTotal / 60);
      const endMinute = endTotal % 60;

      slots.push({
        date: toDateKey(dateString),
        startTime: `${pad(startHour)}:${pad(startMinute)}`,
        endTime: `${pad(endHour)}:${pad(endMinute)}`,
      });
    }
  }

  return slots;
}

module.exports = {
  generateDaySlots,
  toDateKey,
};
