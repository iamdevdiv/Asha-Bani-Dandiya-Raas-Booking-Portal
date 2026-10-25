import { useNavigate } from 'react-router-dom';
import { getAllPhases, getCurrentPhaseName, getCurrentLadiesPrice, getChildPrice } from '../utils/pricing';

const HomePage = () => {
  // Event booking deadline: 28 September 2025, 23:59:59
  const bookingDeadline = new Date('2025-09-28T23:59:59');
  const now = new Date();
  const isBookingClosed = now > bookingDeadline;
  const navigate = useNavigate();

  const handleBookTickets = () => {
    navigate('/booking');
  };



  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 to-sky-600">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/background.jpg)' }}
        >
          <div className="absolute inset-0 bg-black opacity-40"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <div className="animate-bounce-slow mb-6 -mt-8 sm:mt-0">
              <h1 className="text-4xl md:text-7xl font-bold text-white mb-4">
                ASHA BANI
              </h1>
              <h2 className="text-2xl md:text-5xl font-bold text-white mb-2">
                DANDIYA RAAS
              </h2>
              <p className="text-lg md:text-2xl text-white/90 font-medium">
                PRESENTS
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 mb-8">
              <h3 className="text-xl md:text-4xl font-bold text-white mb-4">
                ✨ 5th Grand Dandiya Celebration | 5 Years of Joy, Music & Togetherness ✨
              </h3>
              <p className="text-base md:text-lg text-white/90">
                This year marks the 5th glorious year of our Dandiya Night — and we're taking the celebration to a whole new level!
              </p>
            </div>

            <button
              onClick={handleBookTickets}
              className={`bg-white text-orange-600 font-bold text-lg md:text-xl px-8 md:px-12 py-3 md:py-4 rounded-lg shadow-lg transform transition-all duration-300 animate-pulse-slow ${isBookingClosed ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-gray-100 hover:scale-105'}`}
              disabled={isBookingClosed}
            >
              🎫 Book Your Tickets Now!
            </button>
            {isBookingClosed && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">⛔</div>
                <h3 className="text-lg font-bold text-red-700 mb-2">Online Booking Closed</h3>
                <p className="text-red-800 text-base mb-2">Online ticket booking is now closed.</p>
                <p className="text-gray-700 text-sm">For offline booking, contact <span className="font-bold">8439260603</span></p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Phases Section */}
      <div className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ticket Booking Phases
            </h2>
            <p className="text-lg md:text-xl text-gray-600">
              Book early to get the best prices!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
            {getAllPhases().map((phase, index) => {
              const isCurrentPhase = phase.isCurrent;
                             const getPhaseIcon = (phaseKey) => {
                 switch (phaseKey) {
                   case 'early_bird': return '🚀';
                   case 'phase1': return '⚡';
                   case 'phase2': return '🔥';
                   case 'phase3': return '💎';
                   default: return '🎫';
                 }
               };
              
                             const getPhaseColors = (phaseKey, isActive) => {
                 // If phase is not active, return greyed out colors
                 if (!isActive) {
                   return {
                     border: 'border-gray-200',
                     text: 'text-gray-400',
                     bg: 'bg-gray-400 cursor-not-allowed',
                     currentBg: 'bg-gray-50',
                     currentText: 'text-gray-500'
                   };
                 }
                 
                 switch (phaseKey) {
                   case 'early_bird': return {
                     border: 'border-green-200 hover:border-green-400',
                     text: 'text-green-600',
                     bg: 'bg-green-600 hover:bg-green-700',
                     currentBg: 'bg-green-100',
                     currentText: 'text-green-800'
                   };
                   case 'phase1': return {
                     border: 'border-orange-200 hover:border-orange-400',
                     text: 'text-orange-600',
                     bg: 'bg-orange-600 hover:bg-orange-700',
                     currentBg: 'bg-orange-100',
                     currentText: 'text-orange-800'
                   };
                   case 'phase2': return {
                     border: 'border-red-200 hover:border-red-400',
                     text: 'text-red-600',
                     bg: 'bg-red-600 hover:bg-red-700',
                     currentBg: 'bg-red-100',
                     currentText: 'text-red-800'
                   };
                   case 'phase3': return {
                     border: 'border-purple-200 hover:border-purple-400',
                     text: 'text-purple-600',
                     bg: 'bg-purple-600 hover:bg-purple-700',
                     currentBg: 'bg-purple-100',
                     currentText: 'text-purple-800'
                   };
                   default: return {
                     border: 'border-gray-200 hover:border-gray-400',
                     text: 'text-gray-600',
                     bg: 'bg-gray-600 hover:bg-gray-700',
                     currentBg: 'bg-gray-100',
                     currentText: 'text-gray-800'
                   };
                 }
               };
              
                             const isPhaseActive = phase.isActive;
               const isPhaseExpired = new Date() > phase.endDate;
               const isPhaseFuture = new Date() < phase.startDate;
               const colors = getPhaseColors(phase.key, isPhaseActive);
               const dateRange = `${phase.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${phase.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
               
               return (
                 <div 
                   key={phase.key}
                   className={`card text-center border-2 ${colors.border} transition-all duration-300 ${isCurrentPhase ? 'transform scale-105' : ''} max-w-sm mx-auto w-full ${!isPhaseActive ? 'opacity-60' : ''}`}
                 >
                  <div className="text-4xl md:text-6xl mb-4">{getPhaseIcon(phase.key)}</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">{phase.name}</h3>
                  <div className="text-xs md:text-sm text-gray-600 mb-4">{dateRange}</div>
                  <div className={`text-xl md:text-2xl font-bold ${colors.text} mb-4`}>₹{phase.ladiesPrice}</div>
                  <ul className="text-sm md:text-base text-gray-600 space-y-2">
                    <li>• Ladies Pass: ₹{phase.ladiesPrice}</li>
                    <li>• Child Pass: ₹{phase.childPrice}</li>
                    {phase.key === 'early_bird' && (
                      <>
                        <li>• Best prices available</li>
                        <li>• Limited time offer</li>
                      </>
                    )}
                    {phase.key === 'phase1' && (
                      <>
                        <li>• Regular pricing</li>
                        <li>• Good availability</li>
                      </>
                    )}
                                         {phase.key === 'phase2' && (
                       <>
                         <li>• Last minute pricing</li>
                         <li>• Limited availability</li>
                       </>
                     )}
                     {phase.key === 'phase3' && (
                       <>
                         <li>• Final phase pricing</li>
                         <li>• Very limited availability</li>
                       </>
                     )}
                  </ul>
                  {isCurrentPhase && (
                    <div className={`mt-4 p-2 ${colors.currentBg} rounded-lg`}>
                      <span className={`${colors.currentText} font-semibold text-sm md:text-base`}>CURRENT PHASE</span>
                    </div>
                  )}
                                     <button
                     onClick={handleBookTickets}
                     disabled={!isPhaseActive}
                     className={`mt-4 ${colors.bg} text-white font-semibold px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${!isPhaseActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                     {isPhaseActive ? '🎫 Book Now' : isPhaseExpired ? '⏰ Expired' : '⏰ Coming Soon'}
                   </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dandiya Sticks Banner */}
      {/* <div className="py-12 md:py-16 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8">
            <div className="text-4xl md:text-6xl mb-4">🎪</div>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Get Your Perfect Dandiya Sticks!
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-6">
              Complete your Dandiya Raas experience with our premium quality, handcrafted dandiya sticks. 
              Made with traditional techniques and modern comfort for the perfect grip and sound.
            </p>
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-white/20 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl mb-2">✨</div>
                <h3 className="font-semibold text-white mb-2 text-sm md:text-base">Premium Quality</h3>
                <p className="text-white/80 text-xs md:text-sm">Handcrafted with finest materials</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl mb-2">🎵</div>
                <h3 className="font-semibold text-white mb-2 text-sm md:text-base">Perfect Sound</h3>
                <p className="text-white/80 text-xs md:text-sm">Authentic dandiya rhythm and tone</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl mb-2">💝</div>
                <h3 className="font-semibold text-white mb-2 text-sm md:text-base">Great Value</h3>
                <p className="text-white/80 text-xs md:text-sm">Best prices for quality sticks</p>
              </div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 md:p-4 mb-6">
              <p className="text-white font-semibold text-base md:text-lg">
                📞 Call us now: <span className="text-yellow-300">9897120123</span>
              </p>
              <p className="text-white/80 text-xs md:text-sm mt-2">
                Limited stock available! Book your sticks along with your tickets for the complete experience.
              </p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Event Details Section */}
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What's in Store for You?
            </h2>
            <p className="text-lg md:text-xl text-gray-600">
              Get ready for an unforgettable night of celebration!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12">
            <div className="card text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl md:text-4xl mb-4">🎵</div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">Best DJ in Town</h3>
              <p className="text-sm md:text-base text-gray-600">Dance the night away with the best DJ in town</p>
            </div>

            <div className="card text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl md:text-4xl mb-4">🍽️</div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">Mouth-watering Food</h3>
              <p className="text-sm md:text-base text-gray-600">Relish delicious food — included with your pass</p>
            </div>

            <div className="card text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl md:text-4xl mb-4">🛍️</div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">Shopping Stalls</h3>
              <p className="text-sm md:text-base text-gray-600">Exclusive stalls available for shopping and more</p>
            </div>

            <div className="card text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl md:text-4xl mb-4">🎭</div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">Garba & Dandiya</h3>
              <p className="text-sm md:text-base text-gray-600">Spin to the beats of Garba & Dandiya like never before</p>
            </div>

            <div className="card text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl md:text-4xl mb-4">🎪</div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">Limited Entries</h3>
              <p className="text-sm md:text-base text-gray-600">Exclusive passes available — limited entries only</p>
            </div>

            <div className="card text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl md:text-4xl mb-4">🎊</div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">5th Year Celebration</h3>
              <p className="text-sm md:text-base text-gray-600">Let's make this 5th year the most memorable one yet!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-12 md:py-16 bg-gradient-to-br from-sky-50 to-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ticket Pricing
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-4">
              Choose the perfect pass for you and your family
            </p>
            <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-green-800 font-semibold text-base md:text-lg">
                🚀 <span className="text-green-900">{getCurrentPhaseName()} Active!</span> 
                <br className="md:hidden" />
                <span className="text-green-700 text-sm md:text-base"> Prices shown below are for the current {getCurrentPhaseName()} phase</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12">
            <div className="card text-center border-2 border-orange-200 hover:border-orange-400 transition-all duration-300 max-w-sm mx-auto w-full">
              <div className="text-4xl md:text-6xl mb-4">👩</div>
              <h3 className="text-xl md:text-2xl font-bold mb-2">Ladies Pass</h3>
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-4">₹{getCurrentLadiesPrice()}</div>
              <ul className="text-sm md:text-base text-gray-600 space-y-2">
                <li>• Individual entry</li>
                <li>• Food included</li>
                <li>• Access to all activities</li>
                <li>• {getCurrentPhaseName()} pricing</li>
              </ul>
            </div>

            <div className="card text-center border-2 border-green-200 hover:border-green-400 transition-all duration-300 max-w-sm mx-auto w-full">
              <div className="text-4xl md:text-6xl mb-4">👶</div>
              <h3 className="text-xl md:text-2xl font-bold mb-2">Child Pass</h3>
              <div className="text-3xl md:text-4xl font-bold text-green-600 mb-4">₹{getChildPrice()}</div>
              <ul className="text-sm md:text-base text-gray-600 space-y-2">
                <li>• 6-10 years only</li>
                <li>• Food included</li>
                <li>• Access to all activities</li>
                <li>• No Aadhaar required</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleBookTickets}
              className="bg-white text-orange-600 hover:bg-gray-100 font-bold text-lg md:text-xl px-8 md:px-12 py-3 md:py-4 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              🎫 Book Now - Passes Selling Fast!
            </button>
          </div>
        </div>
      </div>

      {/* Event Info Section */}
      <div className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Event Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="text-2xl md:text-3xl">📅</div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold">Date</h3>
                    <p className="text-sm md:text-base text-gray-600">30th September 2025</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="text-2xl md:text-3xl">📍</div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold">Venue</h3>
                    <p className="text-sm md:text-base text-gray-600">Maharaja Agrasen Bhavan, Aggarwal Dharamshala</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="text-2xl md:text-3xl">📞</div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold">Contact Us</h3>
                    <p className="text-sm md:text-base text-gray-600">8126106660 | 8439260603 | 7906443726</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="text-2xl md:text-3xl">⚠️</div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold">Important Note</h3>
                    <p className="text-sm md:text-base text-gray-600">Entry will not be permitted without a valid pass</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instagram Updates Section */}
      <div className="py-12 md:py-16 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card">
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 md:w-16 md:h-16 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Stay Updated!
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-6">
              All event updates, announcements, and behind-the-scenes content will be posted on our Instagram page.
            </p>
            <a 
              href="https://www.instagram.com/asha_bani_dandiya_raas_5.0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Follow us on Instagram</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-base md:text-lg">
            🎤 "Book now, before it's gone! Let's make this 5th year the most memorable one yet!"
          </p>
          <p className="text-xs md:text-sm text-gray-400 mt-2">
            Gather your friends, dress up, and get ready to spin to the beats of Garba & Dandiya like never before.
          </p>
          <div className="mt-4">
            <a 
              href="https://www.instagram.com/asha_bani_dandiya_raas_5.0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-sky-400 hover:text-sky-300 font-semibold text-sm md:text-base"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Follow @asha_bani_dandiya_raas_5.0 for updates</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
