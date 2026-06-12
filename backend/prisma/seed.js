const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { PrismaClient, SlotStatus } = require('@prisma/client');
const { generateDaySlots, toDateKey } = require('../src/utils/slots');

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  const today = new Date();
  const dateStrings = [0, 1, 2].map((offset) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });

  for (const dateString of dateStrings) {
    const daySlots = generateDaySlots(dateString);
    await prisma.booking.createMany({
      data: daySlots.map((slot) => ({
        date: toDateKey(dateString),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: SlotStatus.FREE,
      })),
      skipDuplicates: true,
    });
  }

  const firstDay = toDateKey(dateStrings[0]);
  const firstSlot = await prisma.booking.findFirst({
    where: { date: firstDay, startTime: '10:00' },
  });

  if (firstSlot) {
    await prisma.booking.update({
      where: { id: firstSlot.id },
      data: {
        status: SlotStatus.BOOKED,
        name: 'Sample User',
        email: 'sample.user@example.com',
        phone: '+1-555-0100',
      },
    });
  }

  const blockedSlot = await prisma.booking.findFirst({
    where: { date: firstDay, startTime: '14:00' },
  });

  if (blockedSlot) {
    await prisma.booking.update({
      where: { id: blockedSlot.id },
      data: {
        status: SlotStatus.UNAVAILABLE,
        name: null,
        email: null,
        phone: null,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
