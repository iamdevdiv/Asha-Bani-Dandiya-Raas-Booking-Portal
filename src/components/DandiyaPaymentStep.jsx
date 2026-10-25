import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import API_BASE_URL from '../config/api';

const DandiyaPaymentStep = () => {
  const { setBookingId } = useBooking();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dandiyaBookingData, setDandiyaBookingData] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [bookingId, setLocalBookingId] = useState(null);

  useEffect(() => {
    // Get dandiya booking data from localStorage
    const bookingData = localStorage.getItem('dandiyaBookingData');
    const storedBookingId = localStorage.getItem('bookingId');
    
    if (bookingData) {
      setDandiyaBookingData(JSON.parse(bookingData));
    }
    if (storedBookingId) {
      setLocalBookingId(storedBookingId);
      setBookingId(storedBookingId);
    }

    // Fetch payment configuration
    fetchPaymentConfig();
  }, []); // Empty dependency array - only run once on mount

  const fetchPaymentConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment-config`);
      const data = await response.json();
      if (data.success) {
        setPaymentConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to fetch payment config:', error);
    }
  };

  const handleBack = () => {
    navigate('/dandiya');
  };

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 2000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Booking ID copied to clipboard!', 'success');
    }).catch(() => {
      showNotification('Failed to copy. Please copy manually.', 'error');
    });
  };

  if (!dandiyaBookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎪</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Booking Found</h2>
          <p className="text-gray-600 mb-6">Please start your dandiya booking first.</p>
          <button
            onClick={() => navigate('/dandiya')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Book Dandiya Sticks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 sm:px-6 py-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white text-center sm:text-left">Dandiya Payment</h1>
            <p className="text-purple-100 mt-1 text-center sm:text-left text-sm sm:text-base">Complete your payment to receive your dandiya pass</p>
          </div>

          <div className="p-4 sm:p-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 text-center sm:text-left">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product:</span>
                  <span className="font-medium">Dandiya Sticks (1 pair)</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{dandiyaBookingData.customerName}</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-purple-600">₹{dandiyaBookingData.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="space-y-6">

              {/* Payment Methods */}
              <div className="space-y-6">
                {/* Payment Options Header */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Pay Using UPI</h3>
                </div>

                {/* QR Code Payment */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center sm:text-left">Scan QR Code</h3>
                  <div className="text-center">
                    {paymentConfig?.upiUrl ? (
                      <div>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${paymentConfig.upiUrl}&am=${dandiyaBookingData.totalAmount}`)}`}
                          alt="Payment QR Code" 
                          className="mx-auto w-40 h-40 sm:w-48 sm:h-48 object-contain border border-gray-200 rounded-lg"
                        />
                        <p className="text-sm text-gray-600 mt-3">
                          Scan this QR code with any UPI app to pay ₹{dandiyaBookingData.totalAmount}
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        UPI payment link not configured. Please contact support.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* WhatsApp Instructions */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-4 text-center sm:text-left">📱 Send Payment Screenshot</h3>
                <div className="space-y-3">
                  <div className="flex flex-col space-y-3">
                    <span className="text-green-700 font-medium text-center sm:text-left">
                      WhatsApp: {paymentConfig?.whatsappNumber}
                    </span>
                    <p className="text-green-700 text-sm text-center sm:text-base">
                      Click here ⬇️
                    </p>
                    {paymentConfig?.whatsappNumber && (
                      <a
                        href={`whatsapp://send?phone=${paymentConfig.whatsappNumber.replace(/\D/g, '')}&text=${encodeURIComponent(`Hi, I have made payment for dandiya booking ID: ${bookingId}. Please find the screenshot attached.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 text-center w-full sm:w-auto"
                      >
                        Open WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2 text-center sm:text-left">Important Notes:</h4>
                <ul className="text-yellow-700 text-sm space-y-1 text-center sm:text-left">
                  <li>• Please include your Booking ID in the WhatsApp message</li>
                  <li>• Payment verification may take 24-48 hours</li>
                  <li>• If you lose access to your pass, contact {paymentConfig?.whatsappNumber}</li>
                  <li>• Dandiya sticks will be available at the event venue</li>
                </ul>
              </div>
            </div>

            {/* Back Button */}
            <div className="mt-6 text-center">
              <button
                onClick={handleBack}
                className="text-purple-600 hover:text-purple-700 font-medium transition duration-200"
              >
                ← Back to Dandiya Booking
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="text-lg">
              {notification.type === 'success' ? '✅' : '❌'}
            </div>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DandiyaPaymentStep;
