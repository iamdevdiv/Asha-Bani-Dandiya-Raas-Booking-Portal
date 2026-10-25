import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import API_BASE_URL from '../config/api';
import { 
  getCurrentPhase, 
  getCurrentPhaseName, 
  getCurrentLadiesPrice, 
  getChildPrice, 
  calculateTotal as calculateTotalUtil 
} from '../utils/pricing';

const PaymentStep = () => {
  const { setBookingId, setStep } = useBooking();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderSummary, setOrderSummary] = useState(null);
  const [bookingSelection, setBookingSelection] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [bookingId, setLocalBookingId] = useState(null);

  useEffect(() => {
    // Get booking selection and customer details from localStorage
    const selection = localStorage.getItem('bookingSelection');
    const details = localStorage.getItem('customerDetails');
    
    if (selection) {
      setBookingSelection(JSON.parse(selection));
    }
    if (details) {
      setCustomerDetails(JSON.parse(details));
    }

    // Fetch payment configuration
    fetchPaymentConfig();
  }, []);

  useEffect(() => {
    if (bookingSelection && customerDetails) {
      // Recalculate total amount based on current phase
      const recalculatedTotal = calculateTotalUtil(bookingSelection.childrenCount);
      
      // Generate order summary
      const summary = {
        ticketType: bookingSelection.ticketType,
        childrenCount: bookingSelection.childrenCount,
        totalAmount: recalculatedTotal,
        originalTotal: bookingSelection.totalAmount,
        currentPhase: getCurrentPhase(),
        currentPhaseName: getCurrentPhaseName(),
        members: getTicketMembers()
      };
      setOrderSummary(summary);
    }
  }, [bookingSelection, customerDetails]);

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

  const getTicketMembers = () => {
    if (!customerDetails) return [];
    
    const members = [];
    const totalAdults = 1; // Ladies pass is always 1 adult

    // Get adult members
    for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
      const key = `ticket_0_adult_${adultIndex}`;
      const member = customerDetails[key];
      if (member) {
        members.push({
          ...member,
          isChild: false
        });
      }
    }

    // Get children members
    for (let childIndex = 0; childIndex < bookingSelection.childrenCount; childIndex++) {
      const key = `ticket_0_child_${childIndex}`;
      const member = customerDetails[key];
      if (member) {
        members.push({
          ...member,
          isChild: true
        });
      }
    }
    return members;
  };

  const generateBookingId = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ABDR${timestamp.slice(-6)}${random}`;
  };

  const handleCreateBooking = async () => {
    setLoading(true);
    
    try {
      const newBookingId = generateBookingId();
      setLocalBookingId(newBookingId);
      setBookingId(newBookingId);

      // Prepare booking data for server
      const tickets = [{
        type: bookingSelection.ticketType,
        children: bookingSelection.childrenCount
      }];

      const bookingData = {
        bookingId: newBookingId,
        totalAmount: orderSummary.totalAmount,
        tickets,
        customerDetails
      };

      // Create booking on server
      const response = await fetch(`${API_BASE_URL}/api/create-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingData })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create booking');
      }

      // Store booking ID in localStorage for the success page
      localStorage.setItem('bookingId', newBookingId);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      showNotification('Failed to create booking. Please try again.', 'error');
      setLoading(false);
    }
  };

  const getPrimaryCustomerName = () => {
    if (!customerDetails) return '';
    const primaryCustomer = customerDetails['ticket_0_adult_0'];
    return primaryCustomer ? `${primaryCustomer.firstName} ${primaryCustomer.lastName}` : '';
  };

  const getPrimaryCustomerEmail = () => {
    if (!customerDetails) return '';
    const primaryCustomer = customerDetails['ticket_0_adult_0'];
    return primaryCustomer?.email || '';
  };

  const getPrimaryCustomerMobile = () => {
    if (!customerDetails) return '';
    const primaryCustomer = customerDetails['ticket_0_adult_0'];
    return primaryCustomer?.mobile || '';
  };

  const handleBack = () => {
    // Set flag to indicate we're coming from step 3
    sessionStorage.setItem('fromStep3', 'true');
    setStep(2);
  };

  const handleProceedToPayment = () => {
    if (!bookingId) {
      handleCreateBooking();
    }
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

  if (!orderSummary) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-6 py-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white text-center sm:text-left">Payment Instructions</h1>
            <p className="text-orange-100 mt-1 text-center sm:text-left text-sm sm:text-base">Complete your payment to receive your passes</p>
          </div>

          <div className="p-4 sm:p-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 text-center sm:text-left">Order Summary</h2>
              
              {/* Price Change Notification */}
              {orderSummary.originalTotal && orderSummary.totalAmount !== orderSummary.originalTotal && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <div className="text-yellow-600 text-lg">⚠️</div>
                    <div>
                      <p className="text-yellow-800 text-sm font-medium">Price Updated</p>
                      <p className="text-yellow-700 text-xs">
                        The price has been updated to reflect the current {orderSummary.currentPhaseName} phase pricing.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket Type:</span>
                  <span className="font-medium">Ladies Pass</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Adults:</span>
                  <span className="font-medium">1</span>
                </div>
                
                {orderSummary.childrenCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Children:</span>
                    <span className="font-medium">{orderSummary.childrenCount}</span>
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-orange-600">₹{orderSummary.totalAmount}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center sm:text-left">
                    Current Phase: {orderSummary.currentPhaseName} (₹{getCurrentLadiesPrice()} + ₹{getChildPrice()} per child)
                  </div>
                </div>
              </div>

              {/* Member Details */}
              <div className="mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 text-center sm:text-left">Member Details</h3>
                <div className="space-y-2">
                  {orderSummary.members.map((member, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between text-sm">
                      <span className="text-gray-600 text-center sm:text-left">
                        {member.isChild ? 'Child' : 'Adult'} {index + 1}: {member.firstName} {member.lastName}
                      </span>
                      <span className="text-gray-800 font-medium text-center sm:text-right">
                        {member.isChild ? `₹${getChildPrice()}` : `₹${getCurrentLadiesPrice()}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

                                        {/* Payment Instructions */}
            {!bookingId ? (
              <div className="text-center">
                <button
                  onClick={handleProceedToPayment}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg transition duration-200 disabled:opacity-50 w-full sm:w-auto"
                >
                  {loading ? 'Creating Booking...' : 'Proceed to Payment'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Payment Guide Video */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center sm:text-left">📹 Payment Guide Video</h3>
                  <div className="text-center">
                    <div className="relative w-full max-w-2xl mx-auto">
                      <div className="aspect-video w-full">
                        <iframe
                          src="https://www.youtube.com/embed/SfUvA5I_Ck8"
                          title="Payment Guide Video"
                          className="w-full h-full rounded-lg"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Watch this video to understand how to complete your payment
                    </p>
                  </div>
                </div>

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
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${paymentConfig.upiUrl}&am=${orderSummary.totalAmount}`)}`}
                            alt="Payment QR Code" 
                            className="mx-auto w-40 h-40 sm:w-48 sm:h-48 object-contain border border-gray-200 rounded-lg"
                          />
                          <p className="text-sm text-gray-600 mt-3">
                            Scan this QR code with any UPI app to pay ₹{orderSummary.totalAmount}
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">
                          UPI payment link not configured. Please contact support.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* OR Divider */}
                  {/* <div className="text-center">
                    <div className="inline-flex items-center">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-4 text-sm font-medium text-gray-500">OR</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                  </div> */}

                  {/* UPI Link */}
                  {/* <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center sm:text-left">Option 2: Pay via UPI</h3>
                    <div className="text-center">
                      {paymentConfig?.upiUrl ? (
                        <a
                          href={`${paymentConfig.upiUrl}&am=${orderSummary.totalAmount}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg text-center transition duration-200"
                        >
                          Pay ₹{orderSummary.totalAmount} via UPI
                        </a>
                      ) : (
                        <div className="text-gray-500 text-sm">
                          UPI payment link not configured. Please use QR code payment.
                        </div>
                      )}
                    </div>
                  </div> */}
                </div>

                {/* Important Payment Note */}
                {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-blue-600 text-xl">ℹ️</div>
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-1">Important:</h4>
                      <p className="text-blue-700 text-sm">
                        After completing your payment, please return to this website to send your payment screenshot via WhatsApp.
                      </p>
                    </div>
                  </div>
                </div> */}

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
                          href={`whatsapp://send?phone=${paymentConfig.whatsappNumber.replace(/\D/g, '')}&text=${encodeURIComponent(`Hi, I have made payment for booking ID: ${bookingId}. Please find the screenshot attached.`)}`}
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
                    <li>• If you lose access to your passes, contact {paymentConfig?.whatsappNumber}</li>
                  </ul>
                </div>
              </div>
            )}
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

export default PaymentStep;
