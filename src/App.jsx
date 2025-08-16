import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BookingProvider } from './context/BookingContext';
import HomePage from './components/HomePage';
import BookingPage from './components/BookingPage';
import SuccessPage from './components/SuccessPage';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <BookingProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-sky-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </div>
      </Router>
    </BookingProvider>
  );
}

export default App;
