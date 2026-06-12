const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SlotStatus } = require('@prisma/client');
const { z } = require('zod');
const { prisma } = require('./prisma');
const { requireAdminAuth } = require('./middleware/auth');
const { generateDaySlots, toDateKey } = require('./utils/slots');

const app = express();

app.use(cors());
app.use(express.json());

const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function ensureSlotsForDate(dateString) {
  const date = toDateKey(dateString);
  const slotsForDay = generateDaySlots(dateString);

  await prisma.booking.createMany({
    data: slotsForDay.map((slot) => ({
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: SlotStatus.FREE,
    })),
    skipDuplicates: true,
  });
}

function toApiBooking(booking) {
  return {
    id: booking.id,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    date: booking.date.toISOString().slice(0, 10),
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status.toLowerCase(),
    createdAt: booking.createdAt,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/slots', async (req, res) => {
  const parsed = dateStringSchema.safeParse(req.query.date);
  if (!parsed.success) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const dateString = parsed.data;
  const date = toDateKey(dateString);

  await ensureSlotsForDate(dateString);

  const slots = await prisma.booking.findMany({
    where: { date },
    orderBy: { startTime: 'asc' },
  });

  return res.json(slots.map(toApiBooking));
});

app.post('/api/bookings', async (req, res) => {
  const schema = z.object({
    slotId: z.number().int().positive(),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid booking payload' });
  }

  const { slotId, name, email, phone } = parsed.data;
  const slot = await prisma.booking.findUnique({ where: { id: slotId } });

  if (!slot) {
    return res.status(404).json({ error: 'Slot not found' });
  }

  if (slot.status !== SlotStatus.FREE) {
    return res.status(409).json({ error: 'Slot is already booked or unavailable' });
  }

  const booking = await prisma.booking.update({
    where: { id: slotId },
    data: {
      name,
      email,
      phone,
      status: SlotStatus.BOOKED,
    },
  });

  return res.status(201).json(toApiBooking(booking));
});

app.get('/api/bookings/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.status !== SlotStatus.BOOKED) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  return res.json({
    id: booking.id,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    date: booking.date.toISOString().slice(0, 10),
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status.toLowerCase(),
  });
});

app.post('/api/admin/login', adminRateLimit, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid credentials payload' });
  }

  const { email, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ adminId: admin.id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  return res.json({ token });
});

app.get('/api/admin/bookings', adminRateLimit, requireAdminAuth, async (req, res) => {
  const { startDate, endDate, status } = req.query;
  const where = {};

  if (status && ['free', 'booked', 'unavailable'].includes(String(status).toLowerCase())) {
    where.status = String(status).toUpperCase();
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate && dateStringSchema.safeParse(startDate).success) {
      where.date.gte = toDateKey(startDate);
    }
    if (endDate && dateStringSchema.safeParse(endDate).success) {
      where.date.lte = toDateKey(endDate);
    }
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  const stats = {
    totalBookings: bookings.filter((item) => item.status === SlotStatus.BOOKED).length,
    bookingsToday: bookings.filter(
      (item) => item.status === SlotStatus.BOOKED && item.date.toISOString().slice(0, 10) === todayKey,
    ).length,
    upcomingBookings: bookings.filter((item) => {
      if (item.status !== SlotStatus.BOOKED) {
        return false;
      }
      const slotStart = new Date(`${item.date.toISOString().slice(0, 10)}T${item.startTime}:00Z`);
      return slotStart >= now;
    }).length,
  };

  return res.json({
    stats,
    bookings: bookings.map(toApiBooking),
  });
});

app.patch('/api/admin/slots/:id', adminRateLimit, requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    status: z.enum(['free', 'unavailable']),
  });

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid slot ID' });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid slot status payload' });
  }

  const data = {
    status: parsed.data.status.toUpperCase(),
    name: null,
    email: null,
    phone: null,
  };

  const slot = await prisma.booking.update({
    where: { id },
    data,
  });

  return res.json(toApiBooking(slot));
});

app.delete('/api/admin/bookings/:id', adminRateLimit, requireAdminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: SlotStatus.FREE,
      name: null,
      email: null,
      phone: null,
    },
  });

  return res.json(toApiBooking(booking));
});

app.use((error, _req, res, _next) => {
  // Prisma known errors (e.g. record not found) and generic fallback
  if (error && error.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = { app };
