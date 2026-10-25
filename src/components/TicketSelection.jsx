import { useState } from 'react';
import { useBooking } from '../context/BookingContext';
import { 
  getCurrentPhase, 
  getCurrentPhaseName, 
  getCurrentLadiesPrice, 
  getChildPrice, 
  calculateTotal as calculateTotalUtil,
  getAllPhases 
} from '../utils/pricing';

const TicketSelection = () => {
  const { setStep } = useBooking();
  const [childrenCount, setChildrenCount] = useState(0);

  const calculateTotal = () => {
    return calculateTotalUtil(childrenCount);
  };

  const handleNext = () => {
    // Store the selection in localStorage or context for the next step
    const bookingSelection = {
      ticketType: 'ladies',
      childrenCount: childrenCount,
      totalAmount: calculateTotal(),
      phase: getCurrentPhase()
    };
    
    // Store in localStorage for the next step
    localStorage.setItem('bookingSelection', JSON.stringify(bookingSelection));
    setStep(2);
  };

  return (
    <div className="space-y-8">
      {/* Ticket Selection Form */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Select Your Tickets</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Ladies Pass Display */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Ladies Pass
            </label>
            <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div>
                  <div className="font-semibold">Ladies Pass</div>
                  <div className="text-sm text-gray-600">Individual entry</div>
                  <div className="text-xs text-orange-600 font-medium">{getCurrentPhaseName()} Price</div>
                </div>
                <div className="text-xl font-bold text-orange-600">₹{getCurrentLadiesPrice()}</div>
              </div>
            </div>
          </div>

          {/* Children Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Number of Children (6-10 years)
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="text-2xl font-bold w-12 text-center">{childrenCount}</span>
              <button
                onClick={() => setChildrenCount(childrenCount + 1)}
                className="w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              ₹{getChildPrice()} per child (6-10 years only)
            </div>
          </div>
        </div>

        {/* Total Amount Display */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total Amount:</span>
            <span className="text-xl font-bold text-orange-600">₹{calculateTotal()}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Ladies Pass: ₹{getCurrentLadiesPrice()} ({getCurrentPhaseName()}) + Children: ₹{childrenCount * getChildPrice()}
          </div>
        </div>

        <button
          onClick={handleNext}
          className="btn-primary w-full"
        >
          Continue to Details →
        </button>
      </div>

      {/* Pricing Info */}
      <div className="card bg-gradient-to-r from-orange-50 to-pink-50">
        <h3 className="text-lg font-semibold mb-3">Pricing Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span>👩</span>
            <span>Ladies Pass: ₹{getCurrentLadiesPrice()} ({getCurrentPhaseName()})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>👶</span>
            <span>Child Pass: ₹{getChildPrice()} (6-10 years)</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          * All prices include food and access to all activities
        </div>
        
        {/* Phase Information */}
        <div className="mt-4 p-3 bg-white rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-2">Pricing Phases:</h4>
          <div className="space-y-1 text-xs">
            {getAllPhases().map((phase) => {
              const isPhaseExpired = new Date() > phase.endDate;
              const isPhaseFuture = new Date() < phase.startDate;
              const getPhaseStatus = () => {
                if (phase.isCurrent) return 'text-orange-600';
                if (phase.isActive) return 'text-gray-800';
                if (isPhaseExpired) return 'text-red-400';
                if (isPhaseFuture) return 'text-gray-400';
                return 'text-gray-400';
              };
              
              return (
                <div key={phase.key} className={`flex justify-between ${!phase.isActive ? 'opacity-50' : ''}`}>
                  <span>
                    {phase.name} ({phase.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {phase.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                    {isPhaseExpired && <span className="text-red-500 text-xs ml-1">(Expired)</span>}
                    {isPhaseFuture && <span className="text-gray-500 text-xs ml-1">(Coming Soon)</span>}
                  </span>
                  <span className={`font-medium ${getPhaseStatus()}`}>₹{phase.ladiesPrice}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketSelection;
