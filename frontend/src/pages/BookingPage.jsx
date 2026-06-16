import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../api';
import Modal from '../components/Modal';

function getStatusClass(status) {
  if (status === 'booked') return 'bg-red-100 text-red-800 border-red-200';
  if (status === 'unavailable') return 'bg-gray-100 text-gray-600 border-gray-200';
  // Use a soft Google-like blue for available slots
  return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors'; 
}

function BookingPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlot, setBookedSlot] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [viewMode, setViewMode] = useState('timeGridDay');
  const [slotDuration, setSlotDuration] = useState('00:30:00');
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
    <div className="mx-auto max-w-6xl p-6 font-sans antialiased">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-medium tracking-tight text-gray-800">Booking Calendar</h1>
        
        {/* Modern Pill Controls */}
        <div className="flex gap-2 rounded-full bg-gray-100 p-1">
          <button
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              viewMode === 'timeGridDay' && slotDuration === '00:30:00'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => {
              setViewMode('timeGridDay');
              setSlotDuration('00:30:00');
            }}
            type="button"
          >
            Day
          </button>
          <button
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              viewMode === 'timeGridWeek'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => {
              setViewMode('timeGridWeek');
              setSlotDuration('00:30:00');
            }}
            type="button"
          >
            Week
          </button>
          <button
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              slotDuration === '01:00:00'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => {
              setViewMode('timeGridDay');
              setSlotDuration('01:00:00');
            }}
            type="button"
          >
            Hourly
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            datesSet={(arg) => {
              setRange((prev) => {
                if (
                  prev &&
                  prev.start.getTime() === arg.start.getTime() &&
                  prev.end.getTime() === arg.end.getTime()
                ) {
                  return prev;
                }
                return { start: arg.start, end: arg.end };
              });
            }}
            allDaySlot={false}
            slotDuration={slotDuration}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            events={events}
            eventContent={(eventInfo) => {
              const status = eventInfo.event.extendedProps.status;
              return (
                <div className={`flex h-full flex-col justify-center rounded-md border-l-4 px-2 py-1 ${getStatusClass(status)}`}>
                  <span className="truncate text-[11px] font-semibold tracking-wide">
                    {eventInfo.event.extendedProps.startTime} - {eventInfo.event.extendedProps.endTime}
                  </span>
                  <span className="mt-0.5 w-max rounded-full bg-white/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider mix-blend-multiply">
                    {status}
                  </span>
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
        </div>
      )}

      {selectedSlot && (
        <Modal title="Confirm Booking" onClose={() => setSelectedSlot(null)}>
          <div className="mb-6 rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              {selectedSlot.date} • {selectedSlot.startTime} - {selectedSlot.endTime}
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleBook}>
            <div>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                placeholder="Full name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                placeholder="Email address"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                placeholder="Phone number"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                required
              />
            </div>
            <button 
              className="mt-2 w-full rounded-full bg-blue-600 px-4 py-3 font-medium text-white transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.98]" 
              type="submit"
            >
              Confirm Booking
            </button>
          </form>
        </Modal>
      )}

      {bookedSlot && (
        <Modal title="Booking Details" onClose={() => setBookedSlot(null)}>
          <div className="space-y-4 rounded-xl bg-gray-50 p-5 text-sm text-gray-700">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{bookedSlot.name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{bookedSlot.email}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{bookedSlot.phone}</span>
            </div>
          </div>
        </Modal>
      )}

      {confirmation && (
        <div className="mt-6 rounded-2xl border-none bg-green-50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 text-green-700">
              ✓
            </div>
            <p className="text-lg font-semibold text-green-900">Booking Confirmed</p>
          </div>
          <div className="ml-11 text-sm text-green-800">
            <p className="font-medium">{confirmation.name}</p>
            <p className="opacity-80">{confirmation.email} • {confirmation.phone}</p>
            <p className="mt-2 inline-block rounded-md bg-green-100 px-2 py-1 font-medium">
              {confirmation.date} • {confirmation.startTime} - {confirmation.endTime}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingPage;