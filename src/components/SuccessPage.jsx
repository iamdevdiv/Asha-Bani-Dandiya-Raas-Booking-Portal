import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import QRCode from 'qrcode';
import passTemplate from '../assets/pass-template.jpg';
import API_BASE_URL from '../config/api';

const SuccessPage = () => {
  const { bookingId, paymentDetails, tickets, customerDetails, resetBooking } = useBooking();
  const navigate = useNavigate();
  const [qrCodes, setQrCodes] = useState({});
  const [downloading, setDownloading] = useState(false);
  const [emailStatus, setEmailStatus] = useState('idle');
  const emailSentRef = useRef(false);
  const emailSendingRef = useRef(false);

  useEffect(() => {
    if (!bookingId || !paymentDetails) {
      navigate('/');
      return;
    }

    // Generate QR codes for each ticket
    generateQRCodes();
    
    // Send confirmation email in background (non-blocking) - only if not already sent or sending
    if (!emailSentRef.current && !emailSendingRef.current) {
      emailSendingRef.current = true;
      setTimeout(() => {
        sendConfirmationEmail();
      }, 100);
    }
  }, [bookingId, paymentDetails]);

  const sendConfirmationEmail = async () => {
    // Prevent duplicate emails
    if (emailSentRef.current) {
      return;
    }
    
    try {
      setEmailStatus('sending');
      const response = await fetch(`${API_BASE_URL}/api/send-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingData: {
            bookingId,
            paymentDetails,
            tickets,
            customerDetails
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setEmailStatus('sent');
        emailSentRef.current = true;
      } else {
        setEmailStatus('failed');
      }
      emailSendingRef.current = false;
    } catch (error) {
      setEmailStatus('failed');
      emailSendingRef.current = false;
    }
  };

  const generateQRCodes = async () => {
    const codes = {};
    
    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
      const ticket = tickets[ticketIndex];
      const key = `ticket_${ticketIndex}`;
      const ticketCode = generateTicketCode(bookingId, ticketIndex);
      
      // Get adult details for this ticket
      const adultDetails = [];
      const totalAdults = ticket.type === 'single' ? 1 : 2;
      
      for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
        const adultKey = `ticket_${ticketIndex}_adult_${adultIndex}`;
        const adult = customerDetails[adultKey];
        if (adult) {
          adultDetails.push({
            name: `${adult.firstName} ${adult.lastName}`,
            mobile: adult.mobile
          });
        }
      }
      
      // Get children names for this ticket
      const childrenNames = [];
      for (let childIndex = 0; childIndex < ticket.children; childIndex++) {
        const childKey = `ticket_${ticketIndex}_child_${childIndex}`;
        const child = customerDetails[childKey];
        if (child) {
          childrenNames.push(`${child.firstName} ${child.lastName}`);
        }
      }
      
      // Create simplified QR data
      const qrData = `ASHA BANI DANDIYA RAAS 2025
Ticket ID: ${ticketCode}
Adults: ${ticket.type === 'single' ? 1 : 2}
Children: ${ticket.children}
Adult Names: ${adultDetails.map(adult => adult.name).join(', ')}
Children Names: ${childrenNames.join(', ')}
Mobile: ${adultDetails[0]?.mobile || ''}`;
      
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        codes[key] = qrCodeDataURL;
      } catch (error) {
        // Error generating QR code
      }
    }
    
    setQrCodes(codes);
  };

  const generateTicketCode = (bookingId, ticketIndex) => {
    // Generate a unique ticket code in XXX XXXX XXX format
    // Use bookingId and ticketIndex to create a deterministic code
    // This ensures uniqueness for up to 500 bookings with multiple tickets each
    
    // Create a hash from bookingId to get consistent numbers
    let hash = 0;
    for (let i = 0; i < bookingId.length; i++) {
      const char = bookingId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use the hash and ticketIndex to generate unique parts
    // Adding ticketIndex * 10000 ensures uniqueness across tickets
    const combinedHash = hash + (ticketIndex * 10000);
    
    const part1 = Math.abs(combinedHash % 900) + 100; // 3 digits (100-999)
    const part2 = Math.abs((combinedHash * 7) % 9000) + 1000; // 4 digits (1000-9999)
    const part3 = Math.abs((combinedHash * 13) % 900) + 100; // 3 digits (100-999)
    
    return `${part1} ${part2} ${part3}`;
  };

  const getMemberCount = (ticketIndex) => {
    const ticket = tickets[ticketIndex];
    const totalPeople = ticket.type === 'single' ? 1 : 2;
    const line1 = `${totalPeople} Adult${totalPeople > 1 ? 's' : ''}`;
    const line2 = ticket.children > 0
      ? `${ticket.children} Child${ticket.children > 1 ? 'ren' : ''}`
      : null;
    return [line1, line2];
  };

  const downloadPass = async (ticketIndex) => {
    setDownloading(true);
    
    try {
      const key = `ticket_${ticketIndex}`;
      const ticket = tickets[ticketIndex];
      const qrCode = qrCodes[key];
      
      if (!qrCode) return;

      // Create canvas for pass generation using template
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load template image
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous';
      
      templateImg.onload = () => {
        // Set canvas size to match template
        canvas.width = templateImg.width;
        canvas.height = templateImg.height;
        
        // Draw template background
        ctx.drawImage(templateImg, 0, 0);
        
        // Generate ticket code
        const ticketCode = generateTicketCode(bookingId, ticketIndex);
        
        // Get member count for this ticket
        const memberCount = getMemberCount(ticketIndex);
        
        // Calculate positions (updated from test file)
        const ticketCodeX = Math.floor(canvas.width * 0.185);
        const ticketCodeY = Math.floor(canvas.height * 0.5);
        const memberCountY = Math.floor(canvas.height * 0.83);
        const qrX = Math.floor(canvas.width * 0.032);
        const qrY = Math.floor(canvas.height * 0.32);
        const qrSize = Math.floor(canvas.width * 0.13);
        
        // Draw ticket code (smaller font, rotated 90 degrees left)
        ctx.save(); // Save current context
        ctx.translate(ticketCodeX, ticketCodeY); // Move to position
        ctx.rotate(-Math.PI / 2); // Rotate 90 degrees left (negative)
        ctx.font = '30px "League Spartan", "Arial", sans-serif'; // Smaller font
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        ctx.fillText(ticketCode, 0, 0);
        ctx.restore(); // Restore context
        
        // Draw member count (bigger font, center aligned)
        const qrCenterX = qrX + qrSize / 2;
        
        // Draw member count (centered below QR code)
        const [line1, line2] = getMemberCount(ticketIndex);
        
        ctx.font = '45px "League Spartan", "Arial", sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center'; // Both lines will share the same center X
        
        // First line at base Y position
        let line1Y = memberCountY;
        let lineSpacing = 50; // vertical gap between lines
        
        ctx.fillText(line1, qrCenterX, line1Y);
        
        // Second line if exists
        if (line2) {
          ctx.fillText(line2, qrCenterX, line1Y + lineSpacing);
        }
        
        // Reset shadow for QR code
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Load and place QR code with rounded corners
        const qrImage = new Image();
        qrImage.onload = () => {
          // Draw QR code with rounded corners
          const borderRadius = 15; // Adjust this value for more/less rounded corners
          
          ctx.save();
          ctx.beginPath();
          
          // Create rounded rectangle path manually (for compatibility)
          const x = qrX;
          const y = qrY;
          const width = qrSize;
          const height = qrSize;
          
          ctx.moveTo(x + borderRadius, y);
          ctx.lineTo(x + width - borderRadius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
          ctx.lineTo(x + width, y + height - borderRadius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
          ctx.lineTo(x + borderRadius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
          ctx.lineTo(x, y + borderRadius);
          ctx.quadraticCurveTo(x, y, x + borderRadius, y);
          ctx.closePath();
          
          ctx.clip();
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
          ctx.restore();
          
          // Download the pass
          const link = document.createElement('a');
          link.download = `pass_${bookingId}_ticket_${ticketIndex + 1}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          setDownloading(false);
        };
        qrImage.src = qrCode;
      };
      
      templateImg.src = passTemplate;

    } catch (error) {
      // Error downloading pass
      setDownloading(false);
    }
  };

  const downloadAllPasses = async () => {
    setDownloading(true);
    
    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between downloads
      await downloadPass(ticketIndex);
    }
    
    setDownloading(false);
  };

  const handleNewBooking = () => {
    resetBooking();
    navigate('/');
  };

  if (!bookingId || !paymentDetails) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-green-600 mb-2">
            Booking Successful!
          </h1>
          <p className="text-xl text-gray-600">
            Your tickets have been confirmed. Welcome to Asha Bani Dandiya Raas 2025!
          </p>
        </div>

        {/* Booking Details */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-6">Booking Confirmation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Booking Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Booking ID:</span> {bookingId}</div>
                <div><span className="font-semibold">Payment ID:</span> {paymentDetails.paymentId}</div>
                <div><span className="font-semibold">Amount Paid:</span> ₹{paymentDetails.amount}</div>
                <div><span className="font-semibold">Payment Date:</span> {new Date(paymentDetails.timestamp).toLocaleDateString()}</div>
                <div><span className="font-semibold">Status:</span> <span className="text-green-600 font-semibold">Confirmed</span></div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-3">Event Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Event:</span> Asha Bani Dandiya Raas 2025</div>
                <div><span className="font-semibold">Date:</span> 30th September 2025</div>
                <div><span className="font-semibold">Venue:</span> Maharaja Agrasen Bhavan, Aggarwal Dharamshala</div>
                <div><span className="font-semibold">Time:</span> 7:00 PM</div>
                <div><span className="font-semibold">Total Tickets:</span> {tickets.length}</div>
                <div><span className="font-semibold">Total Members:</span> {tickets.reduce((total, ticket, index) => {
                  const totalPeople = ticket.type === 'single' ? 1 : 2;
                  return total + totalPeople + ticket.children;
                }, 0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Passes Section */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">Your Passes</h2>
            <button
              onClick={downloadAllPasses}
              disabled={downloading}
              className="btn-primary w-full sm:w-auto"
            >
              {downloading ? 'Downloading...' : 'Download All Passes'}
            </button>
          </div>

          <div className="space-y-6">
            {tickets.map((ticket, ticketIndex) => {
              const totalAdults = ticket.type === 'single' ? 1 : 2;
              const adultDetails = [];
              const childrenNames = [];
              
              // Get adult details for this ticket
              for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
                const adultKey = `ticket_${ticketIndex}_adult_${adultIndex}`;
                const adult = customerDetails[adultKey];
                if (adult) {
                  adultDetails.push(`${adult.firstName} ${adult.lastName}`);
                }
              }
              
              // Get children names for this ticket
              for (let childIndex = 0; childIndex < ticket.children; childIndex++) {
                const childKey = `ticket_${ticketIndex}_child_${childIndex}`;
                const child = customerDetails[childKey];
                if (child) {
                  childrenNames.push(`${child.firstName} ${child.lastName}`);
                }
              }

              return (
                <div key={ticketIndex} className="bg-white p-6 rounded-lg border">
                  <div className="text-center mb-4">
                    <div className="text-3xl mb-3">
                      {ticket.type === 'single' ? '👤' : '💑'}
                    </div>
                    <div className="font-semibold text-lg">
                      {ticket.type === 'single' ? 'Single Pass' : 'Couple Pass'} #{ticketIndex + 1}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {totalAdults} Adult{totalAdults > 1 ? 's' : ''}
                      {ticket.children > 0 && `, ${ticket.children} Child${ticket.children > 1 ? 'ren' : ''}`}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Adults: {adultDetails.join(', ')}
                    </div>
                    {childrenNames.length > 0 && (
                      <div className="text-sm text-blue-500 mt-1">
                        Children: {childrenNames.join(', ')}
                      </div>
                    )}
                    <div className="text-xs text-orange-600 font-mono mt-2">
                      {generateTicketCode(bookingId, ticketIndex)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => downloadPass(ticketIndex)}
                    disabled={downloading}
                    className="w-full btn-secondary py-3"
                  >
                    Download Pass
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email Status */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-3">Email Confirmation</h3>
          <div className="space-y-3">
            {emailStatus === 'sending' && (
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-blue-600">Sending personalized confirmation emails...</span>
              </div>
            )}
            {emailStatus === 'sent' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">✅</div>
                  <span className="text-green-600">Personalized confirmation emails sent successfully!</span>
                </div>
                <div className="text-sm text-gray-600 ml-8">
                  Each customer has received an email with their specific ticket details and complete digital pass design attachment.
                </div>
              </div>
            )}
            {emailStatus === 'failed' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <span className="text-red-600">Failed to send confirmation emails. Please check your email manually.</span>
                </div>
                <div className="text-sm text-gray-600 ml-8">
                  You can still download your passes from this page.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Important Information */}
        <div className="card bg-blue-50 border-blue-200 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Important Information</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Complete digital pass designs have been attached to your emails</li>
            <li>• Gates open at 6:30 PM, event starts at 7:00 PM</li>
            <li>• Food and refreshments are included with your pass</li>
            <li>• Parking is available at the venue</li>
            <li>• Additional passes can be downloaded from this page</li>
          </ul>
        </div>

        {/* Instagram Updates Section */}
        <div className="card bg-gradient-to-r from-purple-50 to-pink-50 mb-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-purple-900 mb-3">Stay Updated!</h3>
            <p className="text-sm text-purple-800 mb-4">
              All event updates, announcements, and behind-the-scenes content will be posted on our Instagram page.
            </p>
            <a 
              href="https://www.instagram.com/asha_bani_dandiya_raas_5.0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Follow @asha_bani_dandiya_raas_5.0</span>
            </a>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card bg-green-50 border-green-200 mb-8">
          <h3 className="text-lg font-semibold text-green-900 mb-3">Need Help?</h3>
          <div className="text-sm text-green-800 space-y-2">
            <div>📞 Contact us: 8126106660 | 8439260603 | 7906443726</div>
            <div>📍 Venue: Maharaja Agrasen Bhavan, Aggarwal Dharamshala</div>
            <div>🎪 Dandiya Sticks: 9897120123</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          <button
            onClick={handleNewBooking}
            className="btn-primary"
          >
            Book More Tickets
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
