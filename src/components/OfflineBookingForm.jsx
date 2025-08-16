import { useState } from 'react';
import API_BASE_URL from '../config/api';

const OfflineBookingForm = ({ onClose, onBookingCreated }) => {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    ticketType: 'single',
    childrenCount: 0,
    adults: [],
    children: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ticketTypes = [
    { id: 'single', name: 'Single Pass', price: 399, description: '1 Adult' },
    { id: 'couple', name: 'Couple Pass', price: 799, description: '2 Adults' }
  ];

  const calculateTotal = () => {
    const adultCount = bookingData.ticketType === 'single' ? 1 : 2;
    const childCount = bookingData.childrenCount || 0;
    let total = 0;
    
    if (adultCount === 1) {
      total = 399;
    } else if (adultCount === 2) {
      total = 799;
    }
    
    total += childCount * 199;
    return total;
  };

  const handleTicketSelection = (type) => {
    setBookingData(prev => ({
      ...prev,
      ticketType: type,
      adults: [],
      children: []
    }));
  };

  const handleChildrenChange = (count) => {
    setBookingData(prev => ({
      ...prev,
      childrenCount: count,
      children: []
    }));
  };

  const handleAdultChange = (index, field, value) => {
    setBookingData(prev => ({
      ...prev,
      adults: prev.adults.map((adult, i) => 
        i === index ? { ...adult, [field]: value } : adult
      )
    }));
  };

  const handleChildChange = (index, field, value) => {
    setBookingData(prev => ({
      ...prev,
      children: prev.children.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!bookingData.ticketType) {
        setError('Please select a ticket type');
        return false;
      }
      setError('');
      return true;
    }
    
    if (step === 2) {
      const adultCount = bookingData.ticketType === 'single' ? 1 : 2;
      const requiredAdults = bookingData.adults.slice(0, adultCount);
      
      for (let i = 0; i < requiredAdults.length; i++) {
        const adult = requiredAdults[i];
        if (!adult.first_name?.trim() || !adult.last_name?.trim()) {
          setError(`Please fill in all required fields for Adult ${i + 1}`);
          return false;
        }
      }
      
      if (bookingData.childrenCount > 0) {
        for (let i = 0; i < bookingData.childrenCount; i++) {
          const child = bookingData.children[i];
          if (!child.first_name?.trim() || !child.last_name?.trim()) {
            setError(`Please fill in all required fields for Child ${i + 1}`);
            return false;
          }
        }
      }
      
      setError('');
      return true;
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step === 1) {
        // Initialize adults and children arrays
        const adultCount = bookingData.ticketType === 'single' ? 1 : 2;
        const adults = Array(adultCount).fill().map(() => ({
          first_name: '',
          last_name: '',
          email: '',
          mobile: '',
          address: ''
        }));
        
        const children = Array(bookingData.childrenCount).fill().map(() => ({
          first_name: '',
          last_name: ''
        }));
        
        setBookingData(prev => ({ ...prev, adults, children }));
      }
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/create-offline-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          ticketType: bookingData.ticketType,
          childrenCount: bookingData.childrenCount,
          adults: bookingData.adults,
          children: bookingData.children,
          amount: calculateTotal()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onBookingCreated(data.booking);
        onClose();
      } else {
        setError(data.error || 'Failed to create booking');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-6">
      <div className={`flex items-center ${step >= 1 ? 'text-orange-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-orange-600 bg-orange-600 text-white' : 'border-gray-300'}`}>
          1
        </div>
        <span className="ml-2 text-sm font-medium">Ticket Selection</span>
      </div>
      
      <div className={`w-8 h-1 ${step >= 2 ? 'bg-orange-600' : 'bg-gray-300'}`}></div>
      
      <div className={`flex items-center ${step >= 2 ? 'text-orange-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-orange-600 bg-orange-600 text-white' : 'border-gray-300'}`}>
          2
        </div>
        <span className="ml-2 text-sm font-medium">Customer Details</span>
      </div>
      
      <div className={`w-8 h-1 ${step >= 3 ? 'bg-orange-600' : 'bg-gray-300'}`}></div>
      
      <div className={`flex items-center ${step >= 3 ? 'text-orange-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-orange-600 bg-orange-600 text-white' : 'border-gray-300'}`}>
          3
        </div>
        <span className="ml-2 text-sm font-medium">Confirm & Create</span>
      </div>
    </div>
  );

  const renderTicketSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Ticket Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ticketTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => handleTicketSelection(type.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                bookingData.ticketType === type.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-800">{type.name}</h4>
                <span className="text-lg font-bold text-orange-600">₹{type.price}</span>
              </div>
              <p className="text-sm text-gray-600">{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Children (Optional)</h3>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Number of Children:</label>
          <select
            value={bookingData.childrenCount}
            onChange={(e) => handleChildrenChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {[0, 1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
          {bookingData.childrenCount > 0 && (
            <span className="text-sm text-gray-600">
              (₹199 per child)
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-800">Total Amount:</span>
          <span className="text-xl font-bold text-orange-600">₹{calculateTotal()}</span>
        </div>
      </div>
    </div>
  );

  const renderCustomerDetails = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Adult Details</h3>
        <div className="space-y-4">
          {bookingData.adults.map((adult, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-3">Adult {index + 1}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First Name *"
                  value={adult.first_name || ''}
                  onChange={(e) => handleAdultChange(index, 'first_name', e.target.value)}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name *"
                  value={adult.last_name || ''}
                  onChange={(e) => handleAdultChange(index, 'last_name', e.target.value)}
                  className="input-field"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={adult.email || ''}
                  onChange={(e) => handleAdultChange(index, 'email', e.target.value)}
                  className="input-field"
                />
                <input
                  type="tel"
                  placeholder="Mobile"
                  value={adult.mobile || ''}
                  onChange={(e) => handleAdultChange(index, 'mobile', e.target.value)}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={adult.address || ''}
                  onChange={(e) => handleAdultChange(index, 'address', e.target.value)}
                  className="input-field md:col-span-2"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {bookingData.childrenCount > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Children Details</h3>
          <div className="space-y-4">
            {bookingData.children.map((child, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-3">Child {index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={child.first_name || ''}
                    onChange={(e) => handleChildChange(index, 'first_name', e.target.value)}
                    className="input-field"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name *"
                    value={child.last_name || ''}
                    onChange={(e) => handleChildChange(index, 'last_name', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Booking Summary</h3>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Ticket Type:</span>
            <span>{bookingData.ticketType === 'single' ? 'Single Pass' : 'Couple Pass'}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Adults:</span>
            <span>{bookingData.ticketType === 'single' ? '1' : '2'}</span>
          </div>
          {bookingData.childrenCount > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Children:</span>
              <span>{bookingData.childrenCount}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-300">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-lg font-bold text-orange-600">₹{calculateTotal()}</span>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">Offline Payment</h3>
              <div className="mt-2 text-sm text-orange-700">
                <p>This booking will be created without online payment. The customer should pay ₹{calculateTotal()} in cash.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Create Offline Booking</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {renderStepIndicator()}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            {step === 1 && renderTicketSelection()}
            {step === 2 && renderCustomerDetails()}
            {step === 3 && renderConfirmation()}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`px-6 py-2 rounded-lg border transition-colors ${
                step === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Back
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              {step < 3 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Booking & Generate Pass'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineBookingForm;
