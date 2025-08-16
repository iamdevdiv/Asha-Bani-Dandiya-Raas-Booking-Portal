import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OfflineBookingForm from './OfflineBookingForm';
import API_BASE_URL from '../config/api';

const AdminPanel = () => {
  const [allBookings, setAllBookings] = useState([]); // Store all bookings
  const [filteredBookings, setFilteredBookings] = useState([]); // Store filtered results
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBookings, setExpandedBookings] = useState(new Set());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setLoginError('Password is required');
      return;
    }
    
    try {
      setIsLoggingIn(true);
      setLoginError('');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        setAuthToken(data.token);
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminToken', data.token);
        setPassword('');
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (error) {
      setLoginError('Network error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthToken('');
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminToken');
  };

  const handleOfflineBookingCreated = (newBooking) => {
    // Refresh the bookings list
    fetchBookings();
    // Show success message
    setSuccessMessage('Offline booking created successfully! Passes have been generated and emails sent.');
    setTimeout(() => setSuccessMessage(''), 5000); // Hide after 5 seconds
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('adminAuthenticated');
    const token = localStorage.getItem('adminToken');
    if (authStatus === 'true' && token) {
      setIsAuthenticated(true);
      setAuthToken(token);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/bookings`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        handleLogout();
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAllBookings(data.bookings);
        setFilteredBookings(data.bookings);
      } else {
        console.error('Failed to fetch bookings:', data.error);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPass = async (bookingId, ticketIndex) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/download-pass/${bookingId}/${ticketIndex}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        handleLogout();
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to download pass: ${errorData.error || 'Unknown error'}`);
        return;
      }
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `pass_${bookingId}_ticket_${parseInt(ticketIndex) + 1}.png`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error downloading pass:', error);
      alert('Failed to download pass. Please try again.');
    }
  };

  // Client-side search function
  const performSearch = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setFilteredBookings(allBookings);
      return;
    }

    const trimmedSearchTerm = searchTerm.trim().toLowerCase();
    const searchTermNoSpaces = trimmedSearchTerm.replace(/\s/g, '');
    
    const filtered = allBookings.map(booking => {
      // Filter tickets within each booking
      const filteredTickets = booking.tickets?.filter(ticket => {
        // Search in ticket code (with and without spaces)
        if (ticket.ticket_code) {
          const ticketCodeNoSpaces = ticket.ticket_code.replace(/\s/g, '');
          if (ticket.ticket_code.toLowerCase().includes(trimmedSearchTerm) ||
              ticketCodeNoSpaces.toLowerCase().includes(searchTermNoSpaces)) {
            return true;
          }
        }
        
        // Search in adult names and details
        if (ticket.adults && ticket.adults.length > 0) {
          for (const adult of ticket.adults) {
            const fullName = `${adult.first_name || ''} ${adult.last_name || ''}`.toLowerCase();
            if (fullName.includes(trimmedSearchTerm) ||
                (adult.first_name && adult.first_name.toLowerCase().includes(trimmedSearchTerm)) ||
                (adult.last_name && adult.last_name.toLowerCase().includes(trimmedSearchTerm)) ||
                (adult.mobile && adult.mobile.includes(trimmedSearchTerm))) {
              return true;
            }
          }
        }
        
        // Search in children names
        if (ticket.children && ticket.children.length > 0) {
          for (const child of ticket.children) {
            const fullName = `${child.first_name || ''} ${child.last_name || ''}`.toLowerCase();
            if (fullName.includes(trimmedSearchTerm) ||
                (child.first_name && child.first_name.toLowerCase().includes(trimmedSearchTerm)) ||
                (child.last_name && child.last_name.toLowerCase().includes(trimmedSearchTerm))) {
              return true;
            }
          }
        }
        
        return false;
      }) || [];
      
      // Search in booking-level fields
      const bookingMatches = 
        (booking.booking_id && booking.booking_id.toLowerCase().includes(trimmedSearchTerm)) ||
        (booking.payment_id && booking.payment_id.toLowerCase().includes(trimmedSearchTerm)) ||
        (booking.order_id && booking.order_id.toLowerCase().includes(trimmedSearchTerm));
      
      // Return booking with filtered tickets, or all tickets if booking matches
      if (bookingMatches) {
        return booking;
      } else if (filteredTickets.length > 0) {
        return {
          ...booking,
          tickets: filteredTickets
        };
      }
      
      return null;
    }).filter(booking => booking !== null);
    
    setFilteredBookings(filtered);
  };

  const handleSearch = () => {
    performSearch(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredBookings(allBookings);
  };

  // Handle search on input change (real-time search)
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    performSearch(value);
  };

  const toggleBookingExpansion = (bookingId) => {
    const newExpanded = new Set(expandedBookings);
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId);
    } else {
      newExpanded.add(bookingId);
    }
    setExpandedBookings(newExpanded);
  };

  const formatDate = (dateString) => {
    // Convert to Indian timezone (IST)
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Calculate ticket amount based on members (not divided by ticket count)
  const calculateTicketAmount = (ticket) => {
    const adultCount = ticket.ticket_type === 'single' ? 1 : 2;
    const childCount = ticket.children_count || 0;
    
    // Correct pricing based on HomePage.jsx and TicketSelection.jsx
    let totalAmount = 0;
    
    if (adultCount === 1) {
      // Single pass: ₹399 base price
      totalAmount = 399;
    } else if (adultCount === 2) {
      // Couple pass: ₹799 base price
      totalAmount = 799;
    }
    
    // Add children price: ₹199 per child
    totalAmount += childCount * 199;
    
    return totalAmount;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-orange-600 mb-2">Admin Panel</h1>
            <p className="text-gray-600">Asha Bani Dandiya Raas 2025</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter admin password"
                required
              />
              {loginError && (
                <p className="mt-2 text-red-500 text-sm">{loginError}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Logging In...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-orange-600 hover:text-orange-700 text-sm"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">Asha Bani Dandiya Raas 2025 - Booking Management</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowOfflineForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Create Offline Booking
              </button>
              <button
                onClick={fetchBookings}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchInputChange}
                placeholder="Search by ticket code, booking ID, name, or mobile..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition-colors"
            >
              Search
            </button>
            <button
              onClick={handleClearSearch}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              Showing {filteredBookings.reduce((total, booking) => total + (booking.tickets?.length || 0), 0)} of {allBookings.reduce((total, booking) => total + (booking.tickets?.length || 0), 0)} tickets
            </div>
          )}
        </div>
      </div>

      {/* Bookings List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'No bookings found matching your search' : 'No bookings found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.flatMap((booking) => 
              booking.tickets?.map((ticket, ticketIndex) => (
                <div key={`${booking.booking_id}-${ticket.id}`} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Ticket Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Ticket Code: {ticket.ticket_code}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {ticket.ticket_type === 'single' ? 'Single Pass' : 'Couple Pass'} #{ticket.ticket_index + 1}
                        </p>
                        <p className="text-sm text-gray-600">
                          Booking ID: {booking.booking_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          Created: {formatDate(booking.created_at)}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(calculateTicketAmount(ticket))}
                        </p>
                        <p className="text-sm text-gray-600">
                          Order ID: {booking.order_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          Status: {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Members: {ticket.ticket_type === 'single' ? '1 adult' : '2 adults'} + {ticket.children_count || 0} {ticket.children_count === 1 ? 'child' : 'children'}</span>
                        <span>Payment ID: {booking.payment_id}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadPass(booking.booking_id, ticket.ticket_index)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Download Pass
                        </button>
                        <button
                          onClick={() => toggleBookingExpansion(`${booking.booking_id}-${ticket.id}`)}
                          className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                        >
                          {expandedBookings.has(`${booking.booking_id}-${ticket.id}`) ? 'Hide Details' : 'Show Details'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedBookings.has(`${booking.booking_id}-${ticket.id}`) && (
                    <div className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Adults */}
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Adults:</h5>
                          {ticket.adults && ticket.adults.length > 0 ? (
                            <div className="space-y-2">
                              {ticket.adults.map((adult, index) => (
                                <div key={`adult-${ticket.id}-${index}`} className="bg-white rounded-lg p-3 border">
                                  <p className="font-medium">
                                    {adult.first_name} {adult.last_name}
                                  </p>
                                  {adult.email && (
                                    <p className="text-sm text-gray-600">
                                      Email: {adult.email}
                                    </p>
                                  )}
                                  {adult.mobile && (
                                    <p className="text-sm text-gray-600">
                                      Mobile: {adult.mobile}
                                    </p>
                                  )}
                                  {adult.address && (
                                    <p className="text-sm text-gray-600">
                                      Address: {adult.address}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No adult data</p>
                          )}
                        </div>
                        
                        {/* Children */}
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">
                            Children ({ticket.children_count}):
                          </h5>
                          {ticket.children && ticket.children.length > 0 ? (
                            <div className="space-y-2">
                              {ticket.children.map((child, index) => (
                                <div key={`child-${ticket.id}-${index}`} className="bg-white rounded-lg p-3 border">
                                  <p className="font-medium">
                                    {child.first_name} {child.last_name}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No children</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )) || []
            )}
          </div>
        )}
      </div>

      {/* Offline Booking Form Modal */}
      {showOfflineForm && (
        <OfflineBookingForm
          onClose={() => setShowOfflineForm(false)}
          onBookingCreated={handleOfflineBookingCreated}
        />
      )}
    </div>
  );
};

export default AdminPanel;
