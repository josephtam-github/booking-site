import { Link, Route, Routes } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">Booking Site</span>
          <div className="flex gap-4 text-sm font-medium">
            <Link className="hover:text-blue-700" to="/">Book</Link>
            <Link className="hover:text-blue-700" to="/admin">Admin</Link>
          </div>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
