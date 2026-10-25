import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import API_BASE_URL from '../config/api';

const DandiyaPage = () => {
  const navigate = useNavigate();
  const { setBookingId, setStep } = useBooking();
  const [formData, setFormData] = useState({
    customerName: '',
    mobile: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.customerName.trim()) {
      setError('Please enter your name');
      return false;
    }
    if (formData.customerName.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return false;
    }
    if (!formData.mobile.trim()) {
      setError('Please enter your mobile number');
      return false;
    }
    if (!/^\d{10}$/.test(formData.mobile.trim())) {
      setError('Mobile number must be 10 digits');
      return false;
    }
    setError('');
    return true;
  };

  const generateDandiyaBookingId = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `DANDIYA${timestamp.slice(-6)}${random}`;
  };

  const handleBookDandiya = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const bookingId = generateDandiyaBookingId();
      
      // Prepare dandiya booking data
      const dandiyaBookingData = {
        bookingId,
        customerName: formData.customerName.trim(),
        mobile: formData.mobile.trim(),
        totalAmount: 50,
        type: 'dandiya',
        timestamp: new Date().toISOString()
      };

      // Create dandiya booking on server
      const response = await fetch(`${API_BASE_URL}/api/create-dandiya-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingData: dandiyaBookingData })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create dandiya booking');
      }

      // Store booking data for payment step
      localStorage.setItem('dandiyaBookingData', JSON.stringify(dandiyaBookingData));
      localStorage.setItem('bookingId', bookingId);
      
      // Set booking ID in context
      setBookingId(bookingId);
      
      // Navigate to payment step
      navigate('/dandiya-payment');

    } catch (error) {
      console.error('Error creating dandiya booking:', error);
      setError('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎪</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Your Dandiya Sticks
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Complete your Dandiya Raas experience with premium quality dandiya sticks
          </p>
        </div>

        {/* Dandiya Images Gallery */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">See Our Dandiya Sticks</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {['dandiya-1.jpg', 'dandiya-2.jpg', 'dandiya-3.jpg', 'dandiya-4.jpg'].map((img, idx) => (
              <div key={img} className="rounded-xl overflow-hidden shadow border bg-white flex items-center justify-center">
                <img
                  src={`/${img}`}
                  alt={`Dandiya Stick ${idx + 1}`}
                  className="object-cover w-full h-32 sm:h-40 transition-transform duration-200 hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Product Info */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-8 text-center">
            <div className="text-4xl mb-4">🎵</div>
            <h2 className="text-2xl font-bold text-white mb-2">Premium Dandiya Sticks</h2>
            <p className="text-purple-100 mb-4">
              Handcrafted with traditional techniques and modern comfort
            </p>
            <div className="text-4xl font-bold text-white">₹50</div>
            <p className="text-purple-100 text-sm mt-1">One pair per customer</p>
          </div>

          {/* Features */}
          <div className="px-6 py-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">What You Get</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">✨</div>
                <p className="text-sm text-gray-600">Premium Quality</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🎵</div>
                <p className="text-sm text-gray-600">Perfect Sound</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">💝</div>
                <p className="text-sm text-gray-600">Great Value</p>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="px-6 py-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              Book Your Dandiya Sticks
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="text-red-600 text-lg mr-2">❌</div>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Enter your 10-digit mobile number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  disabled={loading}
                  maxLength={10}
                  pattern="\d{10}"
                />
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dandiya Sticks (1 pair)</span>
                    <span className="font-medium">₹50</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-purple-600">₹50</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={handleBookDandiya}
                disabled={loading || !formData.customerName.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Booking...
                  </div>
                ) : (
                  '🎪 Book Dandiya Sticks - ₹50'
                )}
              </button>
            </div>
          </div>

          {/* Important Notes */}
          <div className="px-6 py-4 bg-yellow-50 border-t">
            <div className="flex items-start space-x-2">
              <div className="text-yellow-600 text-lg">⚠️</div>
              <div>
                <h4 className="font-semibold text-yellow-800 text-sm">Important Notes:</h4>
                <ul className="text-yellow-700 text-xs space-y-1 mt-1">
                  <li>• One pair per customer only</li>
                  <li>• Payment required to confirm booking</li>
                  <li>• Dandiya sticks will be available at the event venue</li>
                  <li>• Show your booking confirmation to collect</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DandiyaPage;
