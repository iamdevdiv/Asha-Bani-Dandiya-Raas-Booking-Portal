import { useState, useEffect } from 'react';
import { useBooking } from '../context/BookingContext';

const CustomerDetails = () => {
  const { setStep } = useBooking();
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [showError, setShowError] = useState(false);
  const [bookingSelection, setBookingSelection] = useState(null);

  // Get booking selection from localStorage
  useEffect(() => {
    const selection = localStorage.getItem('bookingSelection');
    if (selection) {
      setBookingSelection(JSON.parse(selection));
    }
  }, []);

  // Initialize form data for the selected ticket
  const initializeFormData = () => {
    if (!bookingSelection) return {};
    
    const data = {};
    const totalAdults = 1; // Ladies pass is always 1 adult
    
    // Add adult details
    for (let i = 0; i < totalAdults; i++) {
      const key = `ticket_0_adult_${i}`;
      data[key] = {
        firstName: '',
        lastName: '',
        mobile: '',
        address: ''
      };
    }
    
    // Add children names (only valid children based on age)
    const validChildrenCount = bookingSelection.childrenCount || 0;
    for (let i = 0; i < validChildrenCount; i++) {
      const key = `ticket_0_child_${i}`;
      data[key] = {
        firstName: '',
        lastName: ''
      };
    }
    return data;
  };

  // Initialize form data - only load existing data if navigating from step 3
  useEffect(() => {
    if (Object.keys(formData).length === 0 && bookingSelection) {
      // Check if we're coming from step 3 by checking sessionStorage
      const fromStep3 = sessionStorage.getItem('fromStep3');
      
      if (fromStep3 === 'true') {
        // We're coming from step 3, load existing data
        const existingDetails = localStorage.getItem('customerDetails');
        if (existingDetails) {
          try {
            const parsedDetails = JSON.parse(existingDetails);
            setFormData(parsedDetails);
          } catch (error) {
            console.error('Error parsing existing customer details:', error);
            setFormData(initializeFormData());
          }
        } else {
          setFormData(initializeFormData());
        }
        // Clear the flag
        sessionStorage.removeItem('fromStep3');
      } else {
        // Fresh page load or coming from step 1, start with empty form
        setFormData(initializeFormData());
      }
    }
  }, [bookingSelection]);

  const handleInputChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleBack = () => {
    // Save current form data before going back
    localStorage.setItem('customerDetails', JSON.stringify(formData));
    setStep(1);
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    for (const key in formData) {
      const member = formData[key];
      const fieldErrors = {};

      if (key.includes('adult')) {
        // Adults need all fields except email
        if (!member.firstName?.trim()) {
          fieldErrors.firstName = 'First name is required';
          isValid = false;
        }
        if (!member.lastName?.trim()) {
          fieldErrors.lastName = 'Last name is required';
          isValid = false;
        }
        if (!member.mobile?.trim()) {
          fieldErrors.mobile = 'Mobile number is required';
          isValid = false;
        } else if (!/^[0-9]{10}$/.test(member.mobile.trim())) {
          fieldErrors.mobile = 'Please enter a valid 10-digit mobile number';
          isValid = false;
        }

        if (!member.address?.trim()) {
          fieldErrors.address = 'Address is required';
          isValid = false;
        }
      } else if (key.includes('child')) {
        // Children only need names
        if (!member.firstName?.trim()) {
          fieldErrors.firstName = 'Child first name is required';
          isValid = false;
        }
        if (!member.lastName?.trim()) {
          fieldErrors.lastName = 'Child last name is required';
          isValid = false;
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        newErrors[key] = fieldErrors;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateForm()) {
      setShowError(false);
      setErrors({});
      
      // Store customer details in localStorage for the next step
      localStorage.setItem('customerDetails', JSON.stringify(formData));
      setStep(3);
    } else {
      setShowError(true);
    }
  };

  const renderAdultFields = () => {
    const adults = Object.keys(formData).filter(key => key.includes('adult'));
    
    return adults.map((key, index) => (
      <div key={key} className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-3">Ladies Details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              value={formData[key]?.firstName || ''}
              onChange={(e) => handleInputChange(key, 'firstName', e.target.value)}
              className={`input-field ${errors[key]?.firstName ? 'border-red-500' : ''}`}
              placeholder="Enter first name"
            />
            {errors[key]?.firstName && (
              <p className="text-red-500 text-xs mt-1">{errors[key].firstName}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              value={formData[key]?.lastName || ''}
              onChange={(e) => handleInputChange(key, 'lastName', e.target.value)}
              className={`input-field ${errors[key]?.lastName ? 'border-red-500' : ''}`}
              placeholder="Enter last name"
            />
            {errors[key]?.lastName && (
              <p className="text-red-500 text-xs mt-1">{errors[key].lastName}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
            <input
              type="tel"
              value={formData[key]?.mobile || ''}
              onChange={(e) => handleInputChange(key, 'mobile', e.target.value)}
              className={`input-field ${errors[key]?.mobile ? 'border-red-500' : ''}`}
              placeholder="Enter 10-digit mobile number"
              maxLength="10"
            />
            {errors[key]?.mobile && (
              <p className="text-red-500 text-xs mt-1">{errors[key].mobile}</p>
            )}
          </div>
          

          
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <textarea
              value={formData[key]?.address || ''}
              onChange={(e) => handleInputChange(key, 'address', e.target.value)}
              className={`input-field ${errors[key]?.address ? 'border-red-500' : ''}`}
              placeholder="Enter complete address"
              rows="3"
            />
            {errors[key]?.address && (
              <p className="text-red-500 text-xs mt-1">{errors[key].address}</p>
            )}
          </div>
        </div>
      </div>
    ));
  };

  const renderChildrenFields = () => {
    const children = Object.keys(formData).filter(key => key.includes('child'));
    
    if (children.length === 0) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Children Details (6-10 years)</h3>
        {children.map((key, index) => (
          <div key={key} className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Child {index + 1}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData[key]?.firstName || ''}
                  onChange={(e) => handleInputChange(key, 'firstName', e.target.value)}
                  className={`input-field ${errors[key]?.firstName ? 'border-red-500' : ''}`}
                  placeholder="Enter child's first name"
                />
                {errors[key]?.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors[key].firstName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={formData[key]?.lastName || ''}
                  onChange={(e) => handleInputChange(key, 'lastName', e.target.value)}
                  className={`input-field ${errors[key]?.lastName ? 'border-red-500' : ''}`}
                  placeholder="Enter child's last name"
                />
                {errors[key]?.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors[key].lastName}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!bookingSelection) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading booking details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Customer Details Form */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Customer Details</h2>
        
        {showError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">Please fill in all required fields correctly.</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Adults Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ladies Details</h3>
            {renderAdultFields()}
          </div>

          {/* Children Section */}
          {renderChildrenFields()}
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
          <button
            onClick={handleBack}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            ← Back to Tickets
          </button>
          <button
            onClick={handleNext}
            className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            Continue to Payment →
          </button>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="card bg-gradient-to-r from-orange-50 to-pink-50">
        <h3 className="text-lg font-semibold mb-3">Booking Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Ticket Type:</span>
            <span className="font-medium">Ladies Pass</span>
          </div>
          <div className="flex justify-between">
            <span>Ladies:</span>
            <span className="font-medium">1</span>
          </div>
          {bookingSelection.childrenCount > 0 && (
            <div className="flex justify-between">
              <span>Children (6-10 years):</span>
              <span className="font-medium">{bookingSelection.childrenCount}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-300">
            <span className="font-semibold">Total Amount:</span>
            <span className="font-bold text-orange-600">₹{bookingSelection.totalAmount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
