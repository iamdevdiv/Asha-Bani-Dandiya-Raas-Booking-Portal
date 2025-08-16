import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import API_BASE_URL from '../config/api';

const PaymentStep = () => {
  const { tickets, customerDetails, totalAmount, setPaymentDetails, setBookingId, setStep } = useBooking();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderSummary, setOrderSummary] = useState(null);
  const [razorpayConfig, setRazorpayConfig] = useState(null);

  useEffect(() => {
    // Generate order summary
    const summary = {
      tickets: tickets.map((ticket, index) => ({
        ...ticket,
        members: getTicketMembers(index)
      })),
      totalAmount,
      totalMembers: getTotalMembers()
    };
    setOrderSummary(summary);

    // Fetch Razorpay configuration
    fetchRazorpayConfig();
  }, [tickets, customerDetails, totalAmount]);

  const fetchRazorpayConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/razorpay-config`);
      const data = await response.json();
      if (data.success) {
        setRazorpayConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to fetch Razorpay config:', error);
    }
  };

  const getTicketMembers = (ticketIndex) => {
    const members = [];
    const ticket = tickets[ticketIndex];
    const totalAdults = ticket.type === 'single' ? 1 : 2;

    // Get adult members
    for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
      const key = `ticket_${ticketIndex}_adult_${adultIndex}`;
      const member = customerDetails[key];
      if (member) {
        members.push({
          ...member,
          isChild: false
        });
      }
    }

    // Get children members
    for (let childIndex = 0; childIndex < ticket.children; childIndex++) {
      const key = `ticket_${ticketIndex}_child_${childIndex}`;
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

  const getTotalMembers = () => {
    return tickets.reduce((total, ticket) => {
      const totalPeople = ticket.type === 'single' ? 1 : 2;
      return total + totalPeople + ticket.children;
    }, 0);
  };

  const generateBookingId = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ABDR${timestamp.slice(-6)}${random}`;
  };

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      const bookingId = generateBookingId();
      setBookingId(bookingId);

      // Step 1: Create order on server
      const orderResponse = await fetch(`${API_BASE_URL}/api/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          bookingId: bookingId
        })
      });

      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        throw new Error('Failed to create order');
      }

      // Step 2: Initialize Razorpay with real order_id
      if (!razorpayConfig) {
        throw new Error('Razorpay configuration not loaded');
      }

      const options = {
        key: razorpayConfig.key,
        amount: totalAmount * 100, // Amount in paise
        currency: razorpayConfig.currency,
        name: razorpayConfig.name,
        description: `Booking ID: ${bookingId}`,
        order_id: orderData.order.id, // Real order ID from server
        handler: async function (response) {
          // Step 3: Verify payment on server
          try {
            const verifyResponse = await fetch(`${API_BASE_URL}/api/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingData: {
                  bookingId,
                  paymentDetails: {
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    amount: totalAmount,
                    status: 'success',
                    timestamp: new Date().toISOString()
                  },
                  tickets,
                  customerDetails
                }
              })
            });

            const verifyData = await verifyResponse.json();
            
            if (verifyData.success) {
              // Payment verified successfully
              const paymentData = {
                bookingId,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: totalAmount,
                status: 'success',
                timestamp: new Date().toISOString()
              };
              setPaymentDetails(paymentData);
              navigate('/success');
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            // Payment verification error
            setLoading(false);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: getPrimaryCustomerName(),
          email: getPrimaryCustomerEmail(),
          contact: getPrimaryCustomerMobile()
        },
        notes: {
          booking_id: bookingId,
          event: 'Asha Bani Dandiya Raas 2025',
          date: '30th September 2025'
        },
        theme: {
          color: '#ed7519'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      // Payment error
      setLoading(false);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPrimaryCustomerName = () => {
    const firstTicketKey = `ticket_0_member_0`;
    const primaryCustomer = customerDetails[firstTicketKey];
    return primaryCustomer ? `${primaryCustomer.firstName} ${primaryCustomer.lastName}` : '';
  };

  const getPrimaryCustomerEmail = () => {
    const firstTicketKey = `ticket_0_member_0`;
    const primaryCustomer = customerDetails[firstTicketKey];
    return primaryCustomer ? primaryCustomer.email : '';
  };

  const getPrimaryCustomerMobile = () => {
    const firstTicketKey = `ticket_0_member_0`;
    const primaryCustomer = customerDetails[firstTicketKey];
    return primaryCustomer ? primaryCustomer.mobile : '';
  };

  const handleBack = () => {
    setStep(2);
  };

  if (!orderSummary || !razorpayConfig) {
    return <div className="text-center py-8">Loading payment configuration...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Order Summary */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
        
        <div className="space-y-6">
          {orderSummary.tickets.map((ticket, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {ticket.type === 'single' ? 'Single Pass' : 'Couple Pass'} #{index + 1}
                  </h3>
                  <p className="text-gray-600">
                    {ticket.members.length} member{ticket.members.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">₹{ticket.price + ticket.childrenPrice}</div>
                  <div className="text-sm text-gray-600">
                    ₹{ticket.price} + ₹{ticket.childrenPrice} (children)
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                {ticket.members.map((member, memberIndex) => (
                  <div key={memberIndex} className="flex justify-between text-sm">
                    <span>
                      {member.firstName} {member.lastName}
                      {member.isChild && <span className="text-gray-500 ml-2">(Child)</span>}
                    </span>
                    <span className="text-gray-600">
                      {member.isChild ? '₹199' : (ticket.type === 'single' ? '₹399' : (memberIndex === 0 ? '₹799 (includes both adults)' : 'Included'))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xl font-bold">
            <span>Total Amount:</span>
            <span className="text-orange-600">₹{totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="card bg-green-50 border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-3">What's Included</h3>
        <ul className="text-sm text-green-800 space-y-2">
          <li>• Entry to the event venue</li>
          <li>• Delicious food and refreshments</li>
          <li>• Access to all activities and stalls</li>
          <li>• Digital passes sent to your email</li>
          <li>• Secure payment via Razorpay</li>
        </ul>
      </div>

      {/* Payment Security */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Secure Payment</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-3">
          <div className="text-2xl">🔒</div>
          <div>
            <p className="text-sm text-blue-800">
              Your payment is secured by Razorpay, a trusted payment gateway used by millions of customers.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="text-2xl">📧</div>
          <div>
            <p className="text-sm text-blue-800">
              Digital passes will be sent to your email immediately after successful payment.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <button
          onClick={handleBack}
          className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
        >
          ← Back to Details
        </button>
        <button
          onClick={handlePayment}
          disabled={loading}
          className="btn-primary w-full sm:w-auto order-1 sm:order-2"
        >
          {loading ? 'Processing...' : `Pay ₹${totalAmount}`}
        </button>
      </div>

      {/* Important Notes */}
      <div className="card bg-yellow-50 border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">Important Notes</h3>
        <ul className="text-sm text-yellow-800 space-y-2">
          <li>• Payment is processed securely through Razorpay</li>
          <li>• Digital passes will be sent to your email after payment</li>
          <li>• No refunds will be provided after payment</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentStep;
