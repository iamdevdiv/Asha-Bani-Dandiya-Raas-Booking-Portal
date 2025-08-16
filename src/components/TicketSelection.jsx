import { useState } from 'react';
import { useBooking } from '../context/BookingContext';

const TicketSelection = () => {
  const { tickets, addTicket, removeTicket, updateTicket, setStep, totalAmount } = useBooking();
  const [selectedType, setSelectedType] = useState('single');
  const [childrenCount, setChildrenCount] = useState(0);

  const handleAddTicket = () => {
    const newTicket = {
      id: Date.now(),
      type: selectedType,
      children: childrenCount,
              price: selectedType === 'single' ? 399 : 799,
        childrenPrice: childrenCount * 199
    };
    addTicket(newTicket);
    setSelectedType('single');
    setChildrenCount(0);
  };

  const handleRemoveTicket = (index) => {
    removeTicket(index);
  };

  const handleNext = () => {
    if (tickets.length > 0) {
      setStep(2);
    }
  };

  return (
    <div className="space-y-8">
      {/* Ticket Selection Form */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Select Your Tickets</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Ticket Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Ticket Type
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="ticketType"
                  value="single"
                  checked={selectedType === 'single'}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Single Pass</div>
                      <div className="text-sm text-gray-600">Individual entry</div>
                    </div>
                    <div className="text-xl font-bold text-orange-600">₹399</div>
                  </div>
                </div>
              </label>

              <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="ticketType"
                  value="couple"
                  checked={selectedType === 'couple'}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Couple Pass</div>
                      <div className="text-sm text-gray-600">Two adults entry</div>
                    </div>
                    <div className="text-xl font-bold text-sky-600">₹799</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Children Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Number of Children (0-10 years)
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
                              ₹199 per child (No Aadhaar required)
            </div>
          </div>
        </div>

        <button
          onClick={handleAddTicket}
          className="btn-primary w-full"
        >
          Add Ticket to Cart
        </button>
      </div>

      {/* Selected Tickets */}
      {tickets.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Selected Tickets</h3>
          
          <div className="space-y-4">
            {tickets.map((ticket, index) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {ticket.type === 'single' ? '👤' : '💑'}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {ticket.type === 'single' ? 'Single Pass' : 'Couple Pass'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {ticket.children > 0 && `${ticket.children} child${ticket.children > 1 ? 'ren' : ''} included`}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-bold">₹{ticket.price + ticket.childrenPrice}</div>
                    <div className="text-sm text-gray-600">
                      {ticket.price} + {ticket.childrenPrice} (children)
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTicket(index)}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Amount:</span>
              <span className="text-2xl font-bold text-orange-600">₹{totalAmount}</span>
            </div>
          </div>

          {/* Next Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleNext}
              className="btn-primary w-full sm:w-auto"
            >
              Continue to Details →
            </button>
          </div>
        </div>
      )}

      {/* Pricing Info */}
      <div className="card bg-gradient-to-r from-orange-50 to-sky-50">
        <h3 className="text-lg font-semibold mb-3">Pricing Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span>👤</span>
                            <span>Single Pass: ₹399</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>💑</span>
                            <span>Couple Pass: ₹799</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>👶</span>
                            <span>Child Pass: ₹199</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          * All prices include food and access to all activities
        </div>
      </div>
    </div>
  );
};

export default TicketSelection;
