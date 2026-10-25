import { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import API_BASE_URL from '../config/api';

const QRScanner = ({ onClose, authToken, onTicketScanned }) => {
  const [scannedTicket, setScannedTicket] = useState(null);
  const [isAlreadyScanned, setIsAlreadyScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  useEffect(() => {
    startScanner();
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (scanning && !cameraReady) {
        setError('Camera initialization timeout. Please refresh and try again.');
        setScanning(false);
      }
    }, 10000); // 10 seconds timeout
    
    return () => {
      clearTimeout(timeout);
      if (html5QrcodeScannerRef.current) {
        try {
          html5QrcodeScannerRef.current.clear();
        } catch (error) {
          console.warn('Error clearing scanner:', error);
        }
      }
    };
  }, []);

  // Clear scanner when component unmounts or when ticket is scanned
  useEffect(() => {
    if (scannedTicket && html5QrcodeScannerRef.current) {
      try {
        html5QrcodeScannerRef.current.clear();
        html5QrcodeScannerRef.current = null;
      } catch (error) {
        console.warn('Error clearing scanner after scan:', error);
      }
    }
  }, [scannedTicket]);

  const startScanner = () => {
    try {
      // Prevent multiple initializations
      if (html5QrcodeScannerRef.current) {
        console.log('Scanner already exists, skipping initialization');
        return;
      }

      setScanning(true);
      setCameraReady(false);
      setError('');
      setSuccess('');
      setScannedTicket(null);
      setIsAlreadyScanned(false);

      // Remove any existing elements with the same ID and all child elements
      const existingElement = document.getElementById('qr-reader');
      if (existingElement) {
        // Remove all child elements to clear any existing scanner UI
        while (existingElement.firstChild) {
          existingElement.removeChild(existingElement.firstChild);
        }
      }

      // Small delay to ensure DOM is clean
      setTimeout(() => {
        // Check if scanner was already created during the delay
        if (html5QrcodeScannerRef.current) {
          return;
        }

        html5QrcodeScannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true
          },
          false
        );

        html5QrcodeScannerRef.current.render(onScanSuccess, onScanFailure);
        
        // Set camera as ready after a short delay
        setTimeout(() => {
          setCameraReady(true);
        }, 2000);
      }, 200);
    } catch (error) {
      console.error('Error starting scanner:', error);
      setError('Failed to start camera. Please check camera permissions.');
      setScanning(false);
    }
  };

  const onScanSuccess = async (decodedText) => {
    try {
      // Stop scanning immediately to prevent multiple scans
      if (html5QrcodeScannerRef.current) {
        try {
          html5QrcodeScannerRef.current.clear();
          html5QrcodeScannerRef.current = null;
        } catch (error) {
          console.warn('Error clearing scanner on success:', error);
        }
      }
      
      setScanning(false);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/scan-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ qrData: decodedText })
      });

      const data = await response.json();

      if (data.success) {
        setScannedTicket(data.ticket);
        setIsAlreadyScanned(data.isAlreadyScanned);
        setSuccess(data.message);
        setError('');
        
        // Call callback to refresh scan status in parent component
        if (onTicketScanned && !data.isAlreadyScanned) {
          onTicketScanned();
        }
      } else {
        setError(data.error || 'Failed to process ticket');
        setScannedTicket(null);
        setIsAlreadyScanned(false);
        setScanning(false);
        // Restart scanner if there was an error
        setTimeout(() => {
          startScanner();
        }, 2000);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      setScannedTicket(null);
      setIsAlreadyScanned(false);
      setScanning(false);
      // Restart scanner if there was an error
      setTimeout(() => {
        startScanner();
      }, 2000);
    }
  };

  const onScanFailure = (error) => {
    // Handle scan failure silently
    console.warn(`QR scan failure: ${error}`);
  };

  const handleScanAnother = () => {
    setScannedTicket(null);
    setIsAlreadyScanned(false);
    setSuccess('');
    setError('');
    
    // Clear the existing scanner reference
    html5QrcodeScannerRef.current = null;
    
    // Small delay to ensure state is reset before starting scanner
    setTimeout(() => {
      startScanner();
    }, 100);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getTicketTypeDisplay = (type) => {
    switch (type) {
      case 'ladies': return 'Ladies Pass';
      case 'single': return 'Single Pass';
      case 'stall': return 'Stall Pass';
      case 'children_only': return 'Children Only';
      default: return 'Pass';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">QR Code Scanner</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!scannedTicket ? (
            /* Scanner View */
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Position the QR code within the scanner frame to scan a ticket
                </p>
              </div>

                             {/* QR Scanner */}
               <div className="flex justify-center">
                 <div id="qr-reader" className="w-full max-w-md"></div>
               </div>

                             {error && (
                 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                   <div className="flex">
                     <div className="flex-shrink-0">
                       <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                       </svg>
                     </div>
                     <div className="ml-3 flex-1">
                       <p className="text-sm text-red-800">{error}</p>
                                               {(error.includes('timeout') || error.includes('permissions')) && (
                          <button
                            onClick={() => {
                              // Clear existing scanner before retrying
                              if (html5QrcodeScannerRef.current) {
                                try {
                                  html5QrcodeScannerRef.current.clear();
                                } catch (error) {
                                  console.warn('Error clearing scanner on retry:', error);
                                }
                              }
                              html5QrcodeScannerRef.current = null;
                              startScanner();
                            }}
                            className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            Retry Camera
                          </button>
                        )}
                     </div>
                   </div>
                 </div>
               )}

                             {scanning && !cameraReady && !scannedTicket && (
                 <div className="text-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                   <p className="mt-2 text-gray-600">Initializing camera...</p>
                 </div>
               )}
               
               {cameraReady && !scannedTicket && (
                 <div className="text-center">
                   <p className="text-sm text-green-600">Camera ready - Position QR code in frame</p>
                 </div>
               )}
            </div>
          ) : (
            /* Ticket Details View */
            <div className="space-y-6">
              {/* Success/Already Scanned Message */}
              {success && (
                <div className={`border rounded-lg p-4 ${
                  isAlreadyScanned 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {isAlreadyScanned ? (
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        isAlreadyScanned ? 'text-yellow-800' : 'text-green-800'
                      }`}>
                        {success}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ticket Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ticket Code:</span>
                          <span className="font-medium">{scannedTicket.ticket_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{getTicketTypeDisplay(scannedTicket.ticket_type)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Children:</span>
                          <span className="font-medium">{scannedTicket.children_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Booking ID:</span>
                          <span className="font-medium text-sm">{scannedTicket.booking_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Status:</span>
                          <span className={`font-medium ${
                            scannedTicket.payment_status === 'success' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {scannedTicket.payment_status.charAt(0).toUpperCase() + scannedTicket.payment_status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-medium">{formatCurrency(scannedTicket.amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Customer Details */}
                  <div className="space-y-4">
                    {/* Dandiya pass: show customer name and mobile */}
                    {scannedTicket.type === 'dandiya' ? (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Details</h3>
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="font-medium">Name: {scannedTicket.customer_name}</p>
                          <p className="text-sm text-gray-600">Mobile: {scannedTicket.mobile}</p>
                        </div>
                        {/* Scan Status */}
                        <div className="mt-4">
                          {isAlreadyScanned ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ✅ Already Scanned
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ⏳ Not Scanned
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Details</h3>
                        {/* Adults */}
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-700 mb-2">Adults:</h4>
                          {scannedTicket.adults && scannedTicket.adults.length > 0 ? (
                            <div className="space-y-2">
                              {scannedTicket.adults.map((adult, index) => (
                                <div key={index} className="bg-white rounded-lg p-3 border">
                                  <p className="font-medium">
                                    {adult.first_name} {adult.last_name}
                                  </p>
                                  {adult.email && (
                                    <p className="text-sm text-gray-600">Email: {adult.email}</p>
                                  )}
                                  {adult.mobile && (
                                    <p className="text-sm text-gray-600">Mobile: {adult.mobile}</p>
                                  )}
                                  {adult.address && (
                                    <p className="text-sm text-gray-600">Address: {adult.address}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No adult data</p>
                          )}
                        </div>
                        {/* Children */}
                        {scannedTicket.children && scannedTicket.children.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">Children:</h4>
                            <div className="space-y-2">
                              {scannedTicket.children.map((child, index) => (
                                <div key={index} className="bg-white rounded-lg p-3 border">
                                  <p className="font-medium">
                                    {child.first_name} {child.last_name}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleScanAnother}
                  className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition-colors"
                >
                  Scan Another Ticket
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
