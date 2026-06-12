# Booking Site

A full-stack booking app (Calendly-style) with:
- **Frontend:** React + React Router + FullCalendar + Axios + Tailwind CSS
- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL
- **Deployment:** Render (frontend static site + backend web service + managed PostgreSQL)

## Project structure

- `/frontend` — React app
- `/backend` — Express API + Prisma schema/seed
- `/render.yaml` — Render Blueprint config

## Environment variables

### Backend (`/backend/.env`)
Copy `/backend/.env.example` to `/backend/.env` and set:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT` (optional, default `4000`)
- `ADMIN_EMAIL` (used by seed)
- `ADMIN_PASSWORD` (used by seed)

### Frontend (`/frontend/.env`)
Copy `/frontend/.env.example` to `/frontend/.env` and set:
- `VITE_API_BASE_URL` (for local dev: `http://localhost:4000/api`)

## Local setup

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Backend database and Prisma

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run prisma:seed
```

### 3) Run backend

```bash
cd backend
npm run dev
```

API runs at `http://localhost:4000`.

### 4) Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Implemented API endpoints

- `GET /api/slots?date=YYYY-MM-DD` — all timeslots + status for a day
- `POST /api/bookings` — book a free slot with name/email/phone
- `GET /api/bookings/:id` — booked slot contact details
- `POST /api/admin/login` — admin login (JWT)
- `GET /api/admin/bookings` — list bookings + stats (protected)
- `PATCH /api/admin/slots/:id` — set slot to free/unavailable (protected)
- `DELETE /api/admin/bookings/:id` — cancel booking (protected)

## Features included

- Default **Day** calendar view, plus **Week** and **Hour/time-grid** toggle
- Timeslot status badges: `FREE`, `BOOKED`, `UNAVAILABLE` (24-hour times)
- Click a free slot to book (name, email, phone)
- Booking confirmation summary after successful booking
- Click a booked slot to view contact details
- Admin dashboard (`/admin`) with:
  - Login and JWT-protected API access
  - Booking list with status/date filters
  - Slot blocking/unblocking (`Unavailable` / `Free`)
  - Booking cancel action
  - Summary stats (total, today, upcoming)

## Seed data

`npm run prisma:seed` creates:
- Admin account (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Slots for today + next 2 days
- One sample booked slot and one unavailable slot

## Render deployment

1. Push this repository to GitHub.
2. In Render, create a **Blueprint** from `render.yaml`.
3. Render provisions:
   - `booking-site-db` (PostgreSQL)
   - `booking-site-backend` (Node web service)
   - `booking-site-frontend` (static site)
4. Update the frontend `VITE_API_BASE_URL` in Render if backend URL differs.
5. Set `ADMIN_PASSWORD` as a secret environment variable in Render.
6. Run Prisma migration on backend after first deploy:

```bash
cd backend
npx prisma migrate deploy
npm run prisma:seed
```
