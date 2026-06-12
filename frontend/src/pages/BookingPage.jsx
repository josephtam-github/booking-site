import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../api';
import Modal from '../components/Modal';

function getStatusClass(status) {
  if (status === 'booked') return 'bg-red-100 text-red-700';
  if (status === 'unavailable') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function BookingPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlot, setBookedSlot] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [viewMode, setViewMode] = useState('timeGridDay');
  const [range, setRange] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const calendarRef = useRef(null);

  useEffect(() => {
    async function loadSlots() {
      setLoading(true);
      if (!range) {
        setLoading(false);
        return;
      }

      const dates = [];
      const cursor = new Date(range.start);
      while (cursor < range.end) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      const responses = await Promise.all(
        dates.map((date) => api.get('/slots', { params: { date } })),
      );

      setSlots(responses.flatMap((response) => response.data));
      setLoading(false);
    }

    loadSlots().catch(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    const apiRef = calendarRef.current?.getApi();
    if (apiRef && apiRef.view.type !== viewMode) {
      apiRef.changeView(viewMode);
    }
  }, [viewMode]);

  const events = useMemo(
    () =>
      slots.map((slot) => ({
        id: String(slot.id),
        title: slot.status.toUpperCase(),
        start: `${slot.date}T${slot.startTime}:00`,
        end: `${slot.date}T${slot.endTime}:00`,
        extendedProps: slot,
      })),
    [slots],
  );

  async function handleBook(event) {
    event.preventDefault();
    if (!selectedSlot) return;

    const response = await api.post('/bookings', {
      slotId: selectedSlot.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
    });

    setConfirmation(response.data);
    setSelectedSlot(null);
    setForm({ name: '', email: '', phone: '' });

    setSlots((previous) =>
      previous.map((slot) =>
        slot.id === response.data.id ? response.data : slot,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Booking Calendar</h1>
        <div className="flex gap-2">
          <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={() => setViewMode('timeGridDay')} type="button">Day</button>
          <button className="rounded bg-slate-700 px-3 py-1 text-sm text-white" onClick={() => setViewMode('timeGridWeek')} type="button">Week</button>
          <button className="rounded bg-blue-700 px-3 py-1 text-sm text-white" onClick={() => setViewMode('timeGridDay')} type="button">Hour Grid</button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-600">Loading slots...</p>
      ) : (
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          datesSet={(arg) => {
            setRange({ start: arg.start, end: arg.end });
          }}
          allDaySlot={false}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          events={events}
          eventContent={(eventInfo) => {
            const status = eventInfo.event.extendedProps.status;
            return (
              <div className="flex items-center justify-between gap-1 px-1">
                <span className="truncate text-xs font-semibold">{eventInfo.event.extendedProps.startTime} - {eventInfo.event.extendedProps.endTime}</span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(status)}`}>{status.toUpperCase()}</span>
              </div>
            );
          }}
          eventClick={(clickInfo) => {
            const slot = clickInfo.event.extendedProps;
            if (slot.status === 'free') {
              setSelectedSlot(slot);
            } else if (slot.status === 'booked') {
              setBookedSlot(slot);
            }
          }}
        />
      )}

      {selectedSlot && (
        <Modal title="Book selected slot" onClose={() => setSelectedSlot(null)}>
          <p className="mb-4 text-sm text-slate-700">
            {selectedSlot.date} {selectedSlot.startTime} - {selectedSlot.endTime}
          </p>
          <form className="space-y-3" onSubmit={handleBook}>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              required
            />
            <button className="w-full rounded bg-slate-900 px-4 py-2 font-semibold text-white" type="submit">
              Confirm booking
            </button>
          </form>
        </Modal>
      )}

      {bookedSlot && (
        <Modal title="Booked slot details" onClose={() => setBookedSlot(null)}>
          <div className="space-y-2 text-sm text-slate-700">
            <p><span className="font-semibold">Name:</span> {bookedSlot.name}</p>
            <p><span className="font-semibold">Email:</span> {bookedSlot.email}</p>
            <p><span className="font-semibold">Phone:</span> {bookedSlot.phone}</p>
          </div>
        </Modal>
      )}

      {confirmation && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Booking confirmed</p>
          <p>{confirmation.name} ({confirmation.email}, {confirmation.phone})</p>
          <p>{confirmation.date} {confirmation.startTime} - {confirmation.endTime}</p>
        </div>
      )}
    </div>
  );
}

export default BookingPage;
