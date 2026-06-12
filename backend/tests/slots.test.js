const test = require('node:test');
const assert = require('node:assert/strict');
const { generateDaySlots } = require('../src/utils/slots');

test('generateDaySlots creates 30-minute slots from 09:00 to 17:00', () => {
  const slots = generateDaySlots('2026-01-01');

  assert.equal(slots.length, 16);
  assert.equal(slots[0].startTime, '09:00');
  assert.equal(slots[0].endTime, '09:30');
  assert.equal(slots[slots.length - 1].startTime, '16:30');
  assert.equal(slots[slots.length - 1].endTime, '17:00');
});
