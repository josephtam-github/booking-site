import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const TOKEN_KEY = 'admin_token';

function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' });
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ totalBookings: 0, bookingsToday: 0, upcomingBookings: 0 });

  const headers = useMemo(() => ({ Authorization: token }), [token]);

  useEffect(() => {
    async function syncBookings() {
      if (!token) {
        return;
      }

      const response = await api.get('/admin/bookings', {
        headers,
        params: {
          ...(filters.startDate ? { startDate: filters.startDate } : {}),
          ...(filters.endDate ? { endDate: filters.endDate } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
      });

      setBookings(response.data.bookings);
      setStats(response.data.stats);
    }

    syncBookings().catch(() => {});
  }, [headers, token, filters.startDate, filters.endDate, filters.status]);

  async function handleLogin(event) {
    event.preventDefault();
    const response = await api.post('/admin/login', { email, password });
    localStorage.setItem(TOKEN_KEY, response.data.token);
    setToken(response.data.token);
  }

  async function updateSlotStatus(id, status) {
    await api.patch(`/admin/slots/${id}`, { status }, { headers });
    const response = await api.get('/admin/bookings', { headers });
    setBookings(response.data.bookings);
    setStats(response.data.stats);
  }

  async function cancelBooking(id) {
    await api.delete(`/admin/bookings/${id}`, { headers });
    const response = await api.get('/admin/bookings', { headers });
    setBookings(response.data.bookings);
    setStats(response.data.stats);
  }

  if (!token) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">Admin Login</h1>
        <form className="space-y-3" onSubmit={handleLogin}>
          <input className="w-full rounded border border-slate-300 px-3 py-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input className="w-full rounded border border-slate-300 px-3 py-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="w-full rounded bg-slate-900 px-4 py-2 font-semibold text-white" type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <button
          type="button"
          className="rounded bg-slate-200 px-3 py-2 text-sm"
          onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }}
        >
          Logout
        </button>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded border bg-white p-4"><p className="text-sm text-slate-500">Total Bookings</p><p className="text-2xl font-bold">{stats.totalBookings}</p></div>
        <div className="rounded border bg-white p-4"><p className="text-sm text-slate-500">Bookings Today</p><p className="text-2xl font-bold">{stats.bookingsToday}</p></div>
        <div className="rounded border bg-white p-4"><p className="text-sm text-slate-500">Upcoming Bookings</p><p className="text-2xl font-bold">{stats.upcomingBookings}</p></div>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-4">
        <input className="rounded border border-slate-300 px-3 py-2" type="date" value={filters.startDate} onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))} />
        <input className="rounded border border-slate-300 px-3 py-2" type="date" value={filters.endDate} onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))} />
        <select className="rounded border border-slate-300 px-3 py-2" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
          <option value="">All statuses</option>
          <option value="free">Free</option>
          <option value="booked">Booked</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{booking.date}</td>
                <td className="px-3 py-2">{booking.startTime} - {booking.endTime}</td>
                <td className="px-3 py-2 uppercase">{booking.status}</td>
                <td className="px-3 py-2">{booking.name || '-'}</td>
                <td className="px-3 py-2">{booking.email || '-'}</td>
                <td className="px-3 py-2">{booking.phone || '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700" type="button" onClick={() => updateSlotStatus(booking.id, 'unavailable')}>Block</button>
                    <button className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700" type="button" onClick={() => updateSlotStatus(booking.id, 'free')}>Free</button>
                    {booking.status === 'booked' && (
                      <button className="rounded bg-rose-100 px-2 py-1 text-xs text-rose-700" type="button" onClick={() => cancelBooking(booking.id)}>Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPage;
