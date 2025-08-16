import { useBooking } from '../context/BookingContext';

const StepIndicator = () => {
  const { currentStep } = useBooking();

  const steps = [
    {
      number: 1,
      title: 'Select Tickets',
      description: 'Choose ticket type and quantity',
      status: currentStep >= 1 ? 'active' : 'pending'
    },
    {
      number: 2,
      title: 'Customer Details',
      description: 'Enter personal information',
      status: currentStep >= 2 ? 'active' : 'pending'
    },
    {
      number: 3,
      title: 'Payment',
      description: 'Complete payment securely',
      status: currentStep >= 3 ? 'active' : 'pending'
    }
  ];

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center w-full sm:w-auto">
            {/* Step Circle */}
            <div className="flex flex-col items-center w-full sm:w-auto">
              <div className={`
                w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg
                ${step.status === 'active' ? 'step-active' : 'step-pending'}
              `}>
                {step.status === 'active' ? step.number : step.number}
              </div>
              
              {/* Step Info */}
              <div className="text-center mt-2 sm:mt-3 px-2">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{step.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{step.description}</p>
              </div>
            </div>
            
            {/* Connector Line - Only show on desktop */}
            {index < steps.length - 1 && (
              <div className="hidden sm:block flex-1 h-0.5 bg-gray-300 mx-2 lg:mx-4"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
