import { useState } from 'react';
import API_BASE_URL from '../config/api';
import { 
  getCurrentPhase, 
  getCurrentPhaseName, 
  getCurrentLadiesPrice, 
  getChildPrice, 
  calculateTotal as calculateTotalUtil,
  getAllPhases,
  PRICING
} from '../utils/pricing';

const OfflineBookingForm = ({ onClose, onBookingCreated }) => {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    ticketType: 'ladies',
    selectedPhase: 'early_bird', // Default to early bird phase
    childrenCount: 0,
    adults: [],
    children: [],
    customerName: '' // For dandiya bookings
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ticketTypes = [
    { id: 'ladies', name: 'Ladies Pass', price: 399, description: '1 Lady' },
    { id: 'stall', name: 'Stall Pass', price: 2999, description: '2 Adults - Stall Access' },
    { id: 'dandiya', name: 'Dandiya Sticks', price: 50, description: '1 Pair of Dandiya Sticks' },
    { id: 'children_only', name: 'Children Only', price: 199, description: 'Only children entries' }
  ];

  const calculateTotal = () => {
    const childCount = bookingData.childrenCount || 0;
    let total = 0;
    
    if (bookingData.ticketType === 'ladies') {
      // Use selected phase pricing for ladies pass
      const isAdmin599 = bookingData.selectedPhase === 'admin_offline_599';
      total = isAdmin599 ? 599 : PRICING[bookingData.selectedPhase].ladies;
    } else if (bookingData.ticketType === 'stall') {
      total = 2999; // Stall pass price is fixed
    } else if (bookingData.ticketType === 'dandiya') {
      total = 50; // Dandiya sticks price is fixed
    } else if (bookingData.ticketType === 'children_only') {
      total = childCount * getChildPrice();
    }
    
    // Don't add children price for stall pass or dandiya
    if (bookingData.ticketType !== 'stall' && bookingData.ticketType !== 'dandiya' && bookingData.ticketType !== 'children_only') {
      total += childCount * getChildPrice();
    }
    return total;
  };

  const handleTicketSelection = (type) => {
    setBookingData(prev => ({
      ...prev,
      ticketType: type,
      childrenCount: type === 'children_only' ? 1 : 0,
      adults: [],
      children: [],
      customerName: type === 'dandiya' ? prev.customerName : ''
    }));
  };

  const handlePhaseSelection = (phase) => {
    setBookingData(prev => ({
      ...prev,
      selectedPhase: phase
    }));
  };

  const handleChildrenChange = (count) => {
    setBookingData(prev => ({
      ...prev,
      childrenCount: count,
      children: []
    }));
  };

  const handleCustomerNameChange = (name) => {
    setBookingData(prev => ({
      ...prev,
      customerName: name
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
      // Special validation for dandiya bookings
      if (bookingData.ticketType === 'dandiya') {
        if (!bookingData.customerName?.trim()) {
          setError('Please enter customer name for dandiya booking');
          return false;
        }
          if (!bookingData.mobile?.trim()) {
            setError('Please enter mobile number for dandiya booking');
            return false;
          }
        setError('');
        return true;
      }

      // Validation for children only bookings
      if (bookingData.ticketType === 'children_only') {
        if (!bookingData.childrenCount || bookingData.childrenCount < 1) {
          setError('Please add at least 1 child for Children Only booking');
          return false;
        }
        for (let i = 0; i < bookingData.childrenCount; i++) {
          const child = bookingData.children[i];
          if (!child || !child.first_name?.trim() || !child.last_name?.trim()) {
            setError(`Please fill in all required fields for Child ${i + 1}`);
            return false;
          }
        }
        setError('');
        return true;
      }
      
      let adultCount;
      if (bookingData.ticketType === 'ladies') {
        adultCount = 1;
      } else if (bookingData.ticketType === 'stall') {
        adultCount = 2;
      } else {
        adultCount = 1; // Default fallback
      }
      const requiredAdults = bookingData.adults.slice(0, adultCount);
      
      for (let i = 0; i < requiredAdults.length; i++) {
        const adult = requiredAdults[i];
        if (!adult.first_name?.trim() || !adult.last_name?.trim()) {
          setError(`Please fill in all required fields for ${bookingData.ticketType === 'ladies' ? 'Lady' : 'Adult'} ${i + 1}`);
          return false;
        }
        
        // For stall pass, only validate full details for first adult
        if (bookingData.ticketType === 'stall' && i === 0) {
          if (!adult.mobile?.trim()) {
            setError(`Please fill in mobile number for Adult ${i + 1}`);
            return false;
          }
          if (!adult.address?.trim()) {
            setError(`Please fill in address for Adult ${i + 1}`);
            return false;
          }
        }
        
        // For ladies pass, validate mobile and address for all adults
        if (bookingData.ticketType === 'ladies') {
          if (!adult.mobile?.trim()) {
            setError(`Please fill in mobile number for Lady ${i + 1}`);
            return false;
          }
          if (!adult.address?.trim()) {
            setError(`Please fill in address for Lady ${i + 1}`);
            return false;
          }
        }
      }
      
      // Don't validate children for stall pass
      if (bookingData.ticketType !== 'stall' && bookingData.ticketType !== 'children_only' && bookingData.childrenCount > 0) {
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
        // Skip adults/children initialization for dandiya bookings
        if (bookingData.ticketType !== 'dandiya') {
          // Initialize adults and children arrays
          let adultCount;
          if (bookingData.ticketType === 'ladies') {
            adultCount = 1;
          } else if (bookingData.ticketType === 'stall') {
            adultCount = 2;
          } else if (bookingData.ticketType === 'children_only') {
            adultCount = 0;
          } else {
            adultCount = 1; // Default fallback
          }
          const adults = Array(adultCount).fill().map(() => ({
            first_name: '',
            last_name: '',
            email: bookingData.ticketType === 'stall' ? '' : undefined, // Only for stall pass
            mobile: '',
            address: ''
          }));
          
          const children = Array(bookingData.childrenCount).fill().map(() => ({
            first_name: '',
            last_name: ''
          }));
          
          setBookingData(prev => ({ ...prev, adults, children }));
        }
      }
      
      setStep(step + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      let response;
      
    if (bookingData.ticketType === 'dandiya') {
        // Handle dandiya booking
        response = await fetch(`${API_BASE_URL}/api/admin/create-dandiya-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            bookingData: {
              customerName: bookingData.customerName,
              mobile: bookingData.mobile,
              totalAmount: calculateTotal()
            }
          })
        });
      } else {
        // Handle regular booking
        response = await fetch(`${API_BASE_URL}/api/admin/create-offline-booking`, {
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
            totalAmount: calculateTotal(),
            selectedPhase: bookingData.selectedPhase
          })
        });
      }

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

  const renderTicketSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Ticket Type</h3>
        <div className="grid grid-cols-1 gap-4">
          {ticketTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => handleTicketSelection(type.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                bookingData.ticketType === type.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300'
              } ${type.id === 'stall' ? 'border-purple-300 hover:border-purple-400' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                <div>
                  <h4 className="font-semibold text-gray-800">{type.name}</h4>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
                <span className="text-lg font-bold text-orange-600">
                  {type.id === 'ladies' 
                    ? `₹${bookingData.selectedPhase === 'admin_offline_599' ? 599 : PRICING[bookingData.selectedPhase].ladies}` 
                    : `₹${type.price}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Selection for Ladies Pass */}
      {bookingData.ticketType === 'ladies' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Pricing Phase</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...getAllPhases(), {
              key: 'admin_offline_599',
              name: 'Phase ₹599 (Admin Only)',
              startDate: new Date(),
              endDate: new Date(),
              ladiesPrice: 599,
              childPrice: PRICING.early_bird.child,
              isCurrent: false,
              isActive: true
            }].map((phase) => (
              <div
                key={phase.key}
                onClick={() => handlePhaseSelection(phase.key)}
                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  bookingData.selectedPhase === phase.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <h4 className="font-semibold text-gray-800 text-sm">{phase.name}</h4>
                  <p className="text-xs text-gray-600 mb-1">
                    {phase.key === 'admin_offline_599' 
                      ? 'Admin only'
                      : `${phase.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${phase.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </p>
                  <span className="text-lg font-bold text-blue-600">₹{phase.ladiesPrice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bookingData.ticketType !== 'stall' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Children (6-10 years, Optional)</h3>
          {bookingData.ticketType !== 'dandiya' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Number of Children:</label>
              <select
                value={bookingData.childrenCount}
                onChange={(e) => handleChildrenChange(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {bookingData.ticketType === 'children_only' 
                  ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))
                  : [0, 1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                    ))}
              </select>
              {bookingData.ticketType !== 'children_only' && bookingData.childrenCount > 0 && (
                <span className="text-sm text-gray-600">
                  (₹{getChildPrice()} per child)
                </span>
              )}
              {bookingData.ticketType === 'children_only' && bookingData.childrenCount > 0 && (
                <span className="text-sm text-gray-600">
                  Total: ₹{bookingData.childrenCount * getChildPrice()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-800">Total Amount:</span>
          <span className="text-xl font-bold text-orange-600">₹{calculateTotal()}</span>
        </div>
      </div>
    </div>
  );

  const renderCustomerDetails = () => {
    // Special form for dandiya bookings
    if (bookingData.ticketType === 'dandiya') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={bookingData.customerName}
                    onChange={(e) => handleCustomerNameChange(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={bookingData.mobile || ''}
                      onChange={e => setBookingData(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="Enter mobile number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Adult Details</h3>
        <div className="space-y-4">
          {bookingData.adults.map((adult, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-3">
                {bookingData.ticketType === 'ladies' ? 'Lady' : 'Adult'} {index + 1}
                {bookingData.ticketType === 'stall' && index === 0 && (
                  <span className="ml-2 text-sm text-purple-600">(Primary - Full Details)</span>
                )}
                {bookingData.ticketType === 'stall' && index === 1 && (
                  <span className="ml-2 text-sm text-purple-600">(Secondary - Name Only)</span>
                )}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First Name"
                  value={adult.first_name || ''}
                  onChange={(e) => handleAdultChange(index, 'first_name', e.target.value)}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={adult.last_name || ''}
                  onChange={(e) => handleAdultChange(index, 'last_name', e.target.value)}
                  className="input-field"
                  required
                />
                {bookingData.ticketType !== 'stall' || index === 0 ? (
                  <>
                    {bookingData.ticketType === 'stall' && (
                      <input
                        type="email"
                        placeholder="Email (Optional)"
                        value={adult.email || ''}
                        onChange={(e) => handleAdultChange(index, 'email', e.target.value)}
                        className="input-field"
                      />
                    )}
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
                      className="input-field sm:col-span-2"
                    />
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {bookingData.ticketType !== 'stall' && bookingData.ticketType !== 'dandiya' && bookingData.childrenCount > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Children Details (6-10 years)</h3>
          <div className="space-y-4">
            {bookingData.children.map((child, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-3">Child {index + 1}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={child.first_name || ''}
                    onChange={(e) => handleChildChange(index, 'first_name', e.target.value)}
                    className="input-field"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
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
  };

  const renderBookingSummary = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Booking Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Ticket Type:</span>
            <span className="font-medium">
              {bookingData.ticketType === 'ladies' ? 'Ladies Pass' : 
               bookingData.ticketType === 'stall' ? 'Stall Pass' : 'Pass'}
            </span>
          </div>
          {bookingData.ticketType !== 'children_only' && (
            <div className="flex justify-between">
              <span>Adults:</span>
              <span className="font-medium">
                {bookingData.ticketType === 'ladies' ? '1' : 
                 bookingData.ticketType === 'stall' ? '2' : '1'}
              </span>
            </div>
          )}
          {bookingData.childrenCount > 0 && (
            <div className="flex justify-between">
              <span>Children (6-10 years):</span>
              <span className="font-medium">{bookingData.childrenCount}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t border-gray-300">
            <span className="font-semibold">Total Amount:</span>
            <span className="font-bold text-orange-600">₹{calculateTotal()}</span>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h4 className="font-medium text-orange-800 mb-2">Pricing Information</h4>
        <div className="text-sm text-orange-700 space-y-1">
          <div>Ladies Pass: ₹{getCurrentLadiesPrice()} ({getCurrentPhaseName()})</div>
          <div>Stall Pass: ₹2999 (2 Adults - Stall Access)</div>
          <div>Child Pass: ₹{getChildPrice()} (6-10 years)</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create Offline Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${
                step >= 2 ? 'bg-orange-600' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${
                step >= 3 ? 'bg-orange-600' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Step Content */}
          {step === 1 && renderTicketSelection()}
          {step === 2 && renderCustomerDetails()}
          {step === 3 && renderBookingSummary()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div></div>
            )}
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineBookingForm;

