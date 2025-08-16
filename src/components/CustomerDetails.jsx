import { useState, useEffect } from 'react';
import { useBooking } from '../context/BookingContext';

const CustomerDetails = () => {
  const { tickets, customerDetails, setCustomerDetails, setStep } = useBooking();
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [showError, setShowError] = useState(false);

  // Initialize form data for all tickets (adults and children)
  const initializeFormData = () => {
    const data = {};
    tickets.forEach((ticket, ticketIndex) => {
      const totalAdults = ticket.type === 'single' ? 1 : 2;
      
      // Add adult details
      for (let i = 0; i < totalAdults; i++) {
        const key = `ticket_${ticketIndex}_adult_${i}`;
        data[key] = {
          firstName: '',
          lastName: '',
          mobile: '',
          email: '',
          address: ''
        };
      }
      
      // Add children names
      for (let i = 0; i < ticket.children; i++) {
        const key = `ticket_${ticketIndex}_child_${i}`;
        data[key] = {
          firstName: '',
          lastName: ''
        };
      }
    });
    return data;
  };

  // Initialize form data with existing customer details or empty form
  useEffect(() => {
    if (Object.keys(formData).length === 0) {
      // If we have existing customer details, use them; otherwise initialize empty form
      if (customerDetails && Object.keys(customerDetails).length > 0) {
        setFormData(customerDetails);
      } else {
        setFormData(initializeFormData());
      }
    }
  }, [tickets, customerDetails]);

  const handleInputChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    for (const key in formData) {
      const member = formData[key];
      const fieldErrors = {};

      if (key.includes('adult')) {
        // Adults need all fields
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
        if (!member.email?.trim()) {
          fieldErrors.email = 'Email is required';
          isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim())) {
          fieldErrors.email = 'Please enter a valid email address';
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
      setCustomerDetails(formData);
      setStep(3);
    } else {
      setShowError(true);
      // Scroll to the first error
      setTimeout(() => {
        const firstErrorElement = document.querySelector('.error-field');
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const getAdultLabel = (ticketIndex, adultIndex, ticket) => {
    return ticket.type === 'single' ? 'Adult' : `Adult ${adultIndex + 1}`;
  };

  return (
    <div className="space-y-8">
      {/* Error Alert */}
      {showError && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Please fix the following errors:</h3>
              <p className="text-sm text-red-800">
                All required fields must be filled correctly before proceeding.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Customer Details</h2>
        <p className="text-gray-600 mb-6">
          Please provide details for all members. All fields marked with * are required.
        </p>

        {tickets.map((ticket, ticketIndex) => {
          const totalAdults = ticket.type === 'single' ? 1 : 2;

          return (
            <div key={ticketIndex} className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">
                {ticket.type === 'single' ? 'Single Pass' : 'Couple Pass'} #{ticketIndex + 1}
                {ticket.children > 0 && ` (${ticket.children} child${ticket.children > 1 ? 'ren' : ''} included)`}
              </h3>

              <div className="space-y-6">
                {/* Adult Details */}
                {Array.from({ length: totalAdults }, (_, adultIndex) => {
                  const key = `ticket_${ticketIndex}_adult_${adultIndex}`;
                  const member = formData[key] || {};

                  return (
                    <div key={adultIndex} className="p-4 bg-white rounded-lg border">
                      <h4 className="font-semibold mb-4 text-lg">
                        {getAdultLabel(ticketIndex, adultIndex, ticket)}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className={errors[key]?.firstName ? 'error-field' : ''}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={member.firstName || ''}
                            onChange={(e) => handleInputChange(key, 'firstName', e.target.value)}
                            className={`input-field ${errors[key]?.firstName ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="Enter first name"
                            required
                          />
                          {errors[key]?.firstName && (
                            <p className="text-red-600 text-sm mt-1">{errors[key].firstName}</p>
                          )}
                        </div>

                        <div className={errors[key]?.lastName ? 'error-field' : ''}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={member.lastName || ''}
                            onChange={(e) => handleInputChange(key, 'lastName', e.target.value)}
                            className={`input-field ${errors[key]?.lastName ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="Enter last name"
                            required
                          />
                          {errors[key]?.lastName && (
                            <p className="text-red-600 text-sm mt-1">{errors[key].lastName}</p>
                          )}
                        </div>

                        <div className={errors[key]?.mobile ? 'error-field' : ''}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Mobile Number *
                          </label>
                          <input
                            type="tel"
                            value={member.mobile || ''}
                            onChange={(e) => handleInputChange(key, 'mobile', e.target.value)}
                            className={`input-field ${errors[key]?.mobile ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="Enter mobile number"
                            pattern="[0-9]{10}"
                            required
                          />
                          {errors[key]?.mobile && (
                            <p className="text-red-600 text-sm mt-1">{errors[key].mobile}</p>
                          )}
                        </div>

                        <div className={errors[key]?.email ? 'error-field' : ''}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={member.email || ''}
                            onChange={(e) => handleInputChange(key, 'email', e.target.value)}
                            className={`input-field ${errors[key]?.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="Enter email address"
                            required
                          />
                          {errors[key]?.email && (
                            <p className="text-red-600 text-sm mt-1">{errors[key].email}</p>
                          )}
                        </div>

                        <div className={`md:col-span-2 ${errors[key]?.address ? 'error-field' : ''}`}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Address *
                          </label>
                          <textarea
                            value={member.address || ''}
                            onChange={(e) => handleInputChange(key, 'address', e.target.value)}
                            className={`input-field ${errors[key]?.address ? 'border-red-500 focus:ring-red-500' : ''}`}
                            rows="3"
                            placeholder="Enter complete address"
                            required
                          />
                          {errors[key]?.address && (
                            <p className="text-red-600 text-sm mt-1">{errors[key].address}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Children Names */}
                {Array.from({ length: ticket.children }, (_, childIndex) => {
                  const key = `ticket_${ticketIndex}_child_${childIndex}`;
                  const child = formData[key] || {};

                  return (
                    <div key={childIndex} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold mb-4 text-lg text-blue-900">
                        Child {childIndex + 1} <span className="text-sm text-blue-600">(0-10 years)</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <div className={errors[key]?.firstName ? 'error-field' : ''}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={child.firstName || ''}
                            onChange={(e) => handleInputChange(key, 'firstName', e.target.value)}
                            className={`input-field ${errors[key]?.firstName ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="Enter child's first name"
                            required
                          />
                          {errors[key]?.firstName && (
                            <p className="text-red-600 text-sm mt-1">{errors[key].firstName}</p>
                          )}
                        </div>

                        <div className={errors[key]?.lastName ? 'error-field' : ''}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={child.lastName || ''}
                            onChange={(e) => handleInputChange(key, 'lastName', e.target.value)}
                            className={`input-field ${errors[key]?.lastName ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="Enter child's last name"
                            required
                          />
                          {errors[key]?.lastName && (
                            <p className="text-red-600 text-sm mt-1">{errors[key].lastName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <button
          onClick={handleBack}
          className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
        >
          ← Back to Tickets
        </button>
        <button
          onClick={handleNext}
          className="btn-primary w-full sm:w-auto order-1 sm:order-2"
        >
          Continue to Payment →
        </button>
      </div>

      {/* Important Notes */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Important Information</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• All fields marked with * are required</li>
          <li>• Email will be used to send digital passes</li>
        </ul>
      </div>
    </div>
  );
};

export default CustomerDetails;
