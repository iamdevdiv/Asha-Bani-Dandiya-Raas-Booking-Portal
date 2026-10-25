import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OfflineBookingForm from './OfflineBookingForm';
import QRScanner from './QRScanner';
import API_BASE_URL from '../config/api';
import { 
  getCurrentPhase, 
  getCurrentLadiesPrice, 
  getChildPrice, 
  calculateTotal as calculateTotalUtil 
} from '../utils/pricing';

const AdminPanel = () => {
  const [allBookings, setAllBookings] = useState([]); // Store all bookings
  const [filteredBookings, setFilteredBookings] = useState([]); // Store filtered results
  const [allDandiyaBookings, setAllDandiyaBookings] = useState([]); // Store all dandiya bookings
  const [filteredDandiyaBookings, setFilteredDandiyaBookings] = useState([]); // Store filtered dandiya results
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all'); // 'all', 'paid', 'pending'
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all'); // 'all', 'ladies', 'stall', 'dandiya'
  const [expandedBookings, setExpandedBookings] = useState(new Set());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [ticketScanStatus, setTicketScanStatus] = useState({}); // Track scan status for tickets
  const [ticketScanHistory, setTicketScanHistory] = useState({}); // Track scan history for tickets
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, ticket: null, booking: null });
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

  const handleTicketScanned = () => {
    // Refresh scan status when a ticket is scanned
    fetchBookings();
  };

  const handleQRScannerClose = () => {
    setShowQRScanner(false);
    // Refresh scan status when scanner is closed
    fetchBookings();
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
      
      // Fetch regular bookings
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
        // Fetch scan status for all tickets
        await fetchTicketScanStatus(data.bookings);
      } else {
        console.error('Failed to fetch bookings:', data.error);
      }
      
      // Fetch dandiya bookings
      const dandiyaResponse = await fetch(`${API_BASE_URL}/api/admin/dandiya-bookings`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (dandiyaResponse.status === 401) {
        // Token expired or invalid
        handleLogout();
        return;
      }
      
      const dandiyaData = await dandiyaResponse.json();
      
      if (dandiyaData.success) {
        setAllDandiyaBookings(dandiyaData.bookings);
        setFilteredDandiyaBookings(dandiyaData.bookings);
      } else {
        console.error('Failed to fetch dandiya bookings:', dandiyaData.error);
      }
      
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketScanStatus = async (bookings) => {
    try {
      const scanStatus = {};
      const scanHistory = {};
      
      // Create an array of all ticket codes to fetch
      const ticketCodes = [];
      for (const booking of bookings) {
        for (const ticket of booking.tickets) {
          ticketCodes.push(ticket.ticket_code);
        }
      }
      
      // Fetch scan status for all tickets in parallel
      const scanPromises = ticketCodes.map(async (ticketCode) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/admin/ticket-scans/${ticketCode}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            return { ticketCode, data };
          }
          return { ticketCode, data: null };
        } catch (error) {
          console.error(`Error fetching scan status for ${ticketCode}:`, error);
          return { ticketCode, data: null };
        }
      });
      
      // Wait for all requests to complete
      const results = await Promise.all(scanPromises);
      
      // Process results
      results.forEach(({ ticketCode, data }) => {
        if (data && data.success && data.scans.length > 0) {
          scanStatus[ticketCode] = {
            isScanned: true,
            lastScanned: data.scans[0].scanned_at,
            scanCount: data.scans.length
          };
          scanHistory[ticketCode] = data.scans;
        } else {
          scanStatus[ticketCode] = {
            isScanned: false,
            scanCount: 0
          };
          scanHistory[ticketCode] = [];
        }
      });
      
      setTicketScanStatus(scanStatus);
      setTicketScanHistory(scanHistory);
    } catch (error) {
      console.error('Error fetching scan status:', error);
    }
  };

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleDeleteTicket = (ticket, booking) => {
    setDeleteConfirmation({ show: true, ticket, booking });
  };

  const confirmDeleteTicket = async () => {
    const { ticket, booking } = deleteConfirmation;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/delete-ticket`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          bookingId: booking.booking_id,
          ticketId: ticket.id
        })
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        handleLogout();
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state immediately instead of refetching everything
        setAllBookings(prevBookings => 
          prevBookings.map(bookingItem => {
            if (bookingItem.booking_id === booking.booking_id) {
              // Remove the deleted ticket from this booking
              const updatedTickets = bookingItem.tickets.filter(t => t.id !== ticket.id);
              
              // If no tickets left, remove the entire booking
              if (updatedTickets.length === 0) {
                return null;
              }
              
              return {
                ...bookingItem,
                tickets: updatedTickets
              };
            }
            return bookingItem;
          }).filter(bookingItem => bookingItem !== null) // Remove null bookings
        );
        
        // Update filtered bookings as well
        setFilteredBookings(prevFiltered => 
          prevFiltered.map(bookingItem => {
            if (bookingItem.booking_id === booking.booking_id) {
              const updatedTickets = bookingItem.tickets.filter(t => t.id !== ticket.id);
              
              if (updatedTickets.length === 0) {
                return null;
              }
              
              return {
                ...bookingItem,
                tickets: updatedTickets
              };
            }
            return bookingItem;
          }).filter(bookingItem => bookingItem !== null)
        );
        
        // Remove scan status for the deleted ticket
        setTicketScanStatus(prevStatus => {
          const newStatus = { ...prevStatus };
          delete newStatus[ticket.ticket_code];
          return newStatus;
        });
        
        setTicketScanHistory(prevHistory => {
          const newHistory = { ...prevHistory };
          delete newHistory[ticket.ticket_code];
          return newHistory;
        });
        
        // Remove from expanded bookings if it was expanded
        setExpandedBookings(prevExpanded => {
          const newExpanded = new Set(prevExpanded);
          newExpanded.delete(`${booking.booking_id}-${ticket.id}`);
          return newExpanded;
        });
        
        showNotification('Ticket deleted successfully', 'success');
      } else {
        showNotification(`Failed to delete ticket: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      showNotification('Failed to delete ticket. Please try again.', 'error');
    } finally {
      setDeleteConfirmation({ show: false, ticket: null, booking: null });
    }
  };

  const cancelDeleteTicket = () => {
    setDeleteConfirmation({ show: false, ticket: null, booking: null });
  };

  const handleShareTicket = async (booking, ticket) => {
    if (!ticket.adults || ticket.adults.length === 0 || !ticket.adults[0].mobile) {
      showNotification('No mobile number found for this ticket.', 'error');
      return;
    }
  
    const mobile = ticket.adults[0].mobile;
    const bookingId = booking.booking_id;
    const ticketIndex = ticket.ticket_index;
  
    // Trigger the pass download first
    await downloadPass(bookingId, ticketIndex);
  
    // Construct WhatsApp message (emojis included safely)
    const fullName = `${ticket.adults[0].first_name || ''} ${ticket.adults[0].last_name || ''}`.trim();
    const message = `Hey *${fullName}*!
  
📩 Booking Confirmation – Asha Bani Dandiya Raas 5.0  

Dear Guest,  
Your booking has been successfully confirmed. Please present this pass at the entry gate, where it will be verified by our security team.  

⚠ Important Instructions:  
1. This pass contains a unique, system-generated code/QR that is directly linked to your name, identity, and booking details.  
2. Even if your name is not printed on the pass, the code already carries your information in our system.  
3. Please do not share or forward this pass to anyone.  
4. If the same pass is presented by more than one person, entry for both individuals will be immediately cancelled at the gate.  
5. Any attempt to copy, duplicate, or tamper with this pass will be easily detected, and entry will be strictly denied.  

We look forward to welcoming you to an unforgettable evening at Asha Bani Dandiya Raas 5.0.  

Warm regards,  
Team Asha Bani Dandiya Raas 5.0`;
  
    // Encode the full message (including emojis) properly
    const whatsappUrl = `whatsapp://send?phone=91${mobile}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_self");
  };  

  const updatePaymentStatus = async (bookingId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/update-payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          bookingId,
          status: newStatus
        })
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        handleLogout();
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh bookings to show updated status
        await fetchBookings();
        showNotification(`Payment status updated to ${newStatus}`, 'success');
      } else {
        showNotification(`Failed to update payment status: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      showNotification('Failed to update payment status. Please try again.', 'error');
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

  const downloadDandiyaPass = async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/download-dandiya-pass/${bookingId}`, {
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
        alert(`Failed to download dandiya pass: ${errorData.error || 'Unknown error'}`);
        return;
      }
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `dandiya_pass_${bookingId}.png`;
      
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
      console.error('Error downloading dandiya pass:', error);
      alert('Failed to download dandiya pass. Please try again.');
    }
  };

  const updateDandiyaPaymentStatus = async (bookingId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/update-dandiya-payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          bookingId,
          status: newStatus
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setAllDandiyaBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.booking_id === bookingId 
              ? { ...booking, payment_status: newStatus }
              : booking
          )
        );
        
        setFilteredDandiyaBookings(prevFiltered => 
          prevFiltered.map(booking => 
            booking.booking_id === bookingId 
              ? { ...booking, payment_status: newStatus }
              : booking
          )
        );
        
        showNotification(`Dandiya payment status updated to ${newStatus}`, 'success');
      } else {
        showNotification(`Failed to update dandiya payment status: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating dandiya payment status:', error);
      showNotification('Failed to update dandiya payment status. Please try again.', 'error');
    }
  };

  const deleteDandiyaBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this dandiya booking? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/delete-dandiya-booking/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setAllDandiyaBookings(prevBookings => 
          prevBookings.filter(booking => booking.booking_id !== bookingId)
        );
        
        setFilteredDandiyaBookings(prevFiltered => 
          prevFiltered.filter(booking => booking.booking_id !== bookingId)
        );
        
        showNotification('Dandiya booking deleted successfully', 'success');
      } else {
        showNotification(`Failed to delete dandiya booking: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting dandiya booking:', error);
      showNotification('Failed to delete dandiya booking. Please try again.', 'error');
    }
  };

  // Client-side search function
  const performSearch = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      // If no search term, apply payment and ticket type filters
      if (paymentStatusFilter === 'all' && ticketTypeFilter === 'all') {
        setFilteredBookings(allBookings);
        setFilteredDandiyaBookings(allDandiyaBookings);
      } else {
        const filtered = allBookings.map(booking => {
          const filteredTickets = booking.tickets?.filter(ticket => {
            // Apply payment status filter
            if (paymentStatusFilter !== 'all' && booking.payment_status !== paymentStatusFilter) {
              return false;
            }
            
            // Apply ticket type filter
            if (ticketTypeFilter !== 'all' && ticket.ticket_type !== ticketTypeFilter) {
              return false;
            }
            
            return true;
          }) || [];
          
          if (filteredTickets.length > 0) {
            return {
              ...booking,
              tickets: filteredTickets
            };
          }
          return null;
        }).filter(booking => booking !== null);
        
        setFilteredBookings(filtered);
      }
      return;
    }

    const trimmedSearchTerm = searchTerm.trim().toLowerCase();
    const searchTermNoSpaces = trimmedSearchTerm.replace(/\s/g, '');
    
    const filtered = allBookings.map(booking => {
              // Filter tickets within each booking
        const filteredTickets = booking.tickets?.filter(ticket => {
          // Apply payment status filter
          if (paymentStatusFilter !== 'all' && booking.payment_status !== paymentStatusFilter) {
            return false;
          }
          
          // Apply ticket type filter
          if (ticketTypeFilter !== 'all' && ticket.ticket_type !== ticketTypeFilter) {
            return false;
          }
        
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
        (booking.booking_id && booking.booking_id.toLowerCase().includes(trimmedSearchTerm));
      
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
    
    // Search dandiya bookings
    const filteredDandiya = allDandiyaBookings.filter(dandiyaBooking => {
      // Apply payment status filter
      if (paymentStatusFilter !== 'all' && dandiyaBooking.payment_status !== paymentStatusFilter) {
        return false;
      }
      
      // Apply ticket type filter (dandiya)
      if (ticketTypeFilter !== 'all' && ticketTypeFilter !== 'dandiya') {
        return false;
      }
      
      // Search in dandiya booking fields
      const bookingIdMatch = dandiyaBooking.booking_id && 
        dandiyaBooking.booking_id.toLowerCase().includes(trimmedSearchTerm);
      
      const customerNameMatch = dandiyaBooking.customer_name && 
        dandiyaBooking.customer_name.toLowerCase().includes(trimmedSearchTerm);
      
      return bookingIdMatch || customerNameMatch;
    });
    
    setFilteredBookings(filtered);
    setFilteredDandiyaBookings(filteredDandiya);
  };

  const handleSearch = () => {
    performSearch(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPaymentStatusFilter('all');
    setTicketTypeFilter('all');
    setFilteredBookings(allBookings);
    setFilteredDandiyaBookings(allDandiyaBookings);
  };

  // Handle search on input change (real-time search)
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    performSearch(value);
  };

  // Handle payment status filter change
  const handlePaymentStatusFilterChange = (filter) => {
    setPaymentStatusFilter(filter);
    // Apply search, payment, and ticket type filters
    if (!searchTerm || searchTerm.trim() === '') {
      // If no search term, apply payment and ticket type filters
      if (filter === 'all' && ticketTypeFilter === 'all') {
        setFilteredBookings(allBookings);
      } else {
        const filtered = allBookings.map(booking => {
          const filteredTickets = booking.tickets?.filter(ticket => {
            // Apply payment status filter
            if (filter !== 'all' && booking.payment_status !== filter) {
              return false;
            }
            
            // Apply ticket type filter
            if (ticketTypeFilter !== 'all' && ticket.ticket_type !== ticketTypeFilter) {
              return false;
            }
            
            return true;
          }) || [];
          
          if (filteredTickets.length > 0) {
            return {
              ...booking,
              tickets: filteredTickets
            };
          }
          return null;
        }).filter(booking => booking !== null);
        
        setFilteredBookings(filtered);
      }
    } else {
      // If there's a search term, apply all filters
      performSearch(searchTerm);
    }
  };

  // Handle ticket type filter change
  const handleTicketTypeFilterChange = (filter) => {
    setTicketTypeFilter(filter);
    // Apply search, payment, and ticket type filters
    if (!searchTerm || searchTerm.trim() === '') {
      // If no search term, apply payment and ticket type filters
      if (paymentStatusFilter === 'all' && filter === 'all') {
        setFilteredBookings(allBookings);
      } else {
        const filtered = allBookings.map(booking => {
          const filteredTickets = booking.tickets?.filter(ticket => {
            // Apply payment status filter
            if (paymentStatusFilter !== 'all' && booking.payment_status !== paymentStatusFilter) {
              return false;
            }
            
            // Apply ticket type filter
            if (filter !== 'all' && ticket.ticket_type !== filter) {
              return false;
            }
            
            return true;
          }) || [];
          
          if (filteredTickets.length > 0) {
            return {
              ...booking,
              tickets: filteredTickets
            };
          }
          return null;
        }).filter(booking => booking !== null);
        
        setFilteredBookings(filtered);
      }
    } else {
      // If there's a search term, apply all filters
      performSearch(searchTerm);
    }
  };

  const toggleExpanded = (bookingId) => {
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

  // Determine booking phase from paid amount (lady only, exclude children)
  const getBookingPhaseFromAmount = (booking, ticket) => {
    if (!booking || !ticket) return 'Unknown';
    // Only applicable for event passes (non-stall, non-dandiya)
    if (ticket.ticket_type !== 'ladies' && ticket.ticket_type !== 'single') return 'N/A';
    const childrenCount = ticket.children_count || 0;
    const childUnit = getChildPrice();
    const adultAmount = (booking.amount || 0) - (childrenCount * childUnit);
    if (adultAmount === 599) return 'Phase ₹599 (Admin Only)';
    if (adultAmount === 399) return 'Early Bird';
    if (adultAmount === 429) return 'Phase 1';
    if (adultAmount === 459) return 'Phase 2';
    if (adultAmount === 499) return 'Phase 3';
    return 'Unknown';
  };

  // Calculate ticket amount based on actual paid amount from booking
  const calculateTicketAmount = (ticket, booking) => {
    // Booking data should always be available
    if (!booking || !booking.amount) {
      console.error('Booking data or amount not available for ticket:', ticket.ticket_code);
      return 0;
    }
    
    // Each booking contains exactly one ticket, so use the full booking amount
    return booking.amount;
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">Asha Bani Dandiya Raas 2025 - Booking Management</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowQRScanner(true)}
                className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
              >
                📱 QR Scanner
              </button>
              <button
                onClick={() => setShowOfflineForm(true)}
                className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Create Offline Booking
              </button>
              <button
                onClick={fetchBookings}
                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Refresh
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
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

      {/* Scan Statistics */}
      {!loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Total Tickets</p>
                    <p className="text-lg font-semibold text-blue-900">{allBookings.reduce((total, booking) => total + (booking.tickets?.length || 0), 0)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Scanned</p>
                    <p className="text-lg font-semibold text-green-900">{Object.values(ticketScanStatus).filter(status => status.isScanned).length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-600">Pending</p>
                    <p className="text-lg font-semibold text-yellow-900">{allBookings.reduce((total, booking) => total + (booking.tickets?.length || 0), 0) - Object.values(ticketScanStatus).filter(status => status.isScanned).length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Total Scans</p>
                    <p className="text-lg font-semibold text-purple-900">{Object.values(ticketScanStatus).reduce((total, status) => total + status.scanCount, 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ticket code, name, mobile, or booking ID..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
              >
                Search
              </button>
              <button
                onClick={handleClearSearch}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          
          {/* Payment Status Filter */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Payment Status:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePaymentStatusFilterChange('all')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    paymentStatusFilter === 'all'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  All ({allBookings.reduce((total, booking) => total + (booking.tickets?.length || 0), 0)})
                </button>
                <button
                  onClick={() => handlePaymentStatusFilterChange('paid')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    paymentStatusFilter === 'paid'
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Paid ({allBookings.filter(booking => booking.payment_status === 'paid').reduce((total, booking) => total + (booking.tickets?.length || 0), 0)})
                </button>
                <button
                  onClick={() => handlePaymentStatusFilterChange('pending')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    paymentStatusFilter === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Pending ({allBookings.filter(booking => booking.payment_status === 'pending').reduce((total, booking) => total + (booking.tickets?.length || 0), 0)})
                </button>
              </div>
            </div>
          </div>
          
          {/* Ticket Type Filter */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Ticket Type:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTicketTypeFilterChange('all')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    ticketTypeFilter === 'all'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  All ({allBookings.reduce((total, booking) => total + (booking.tickets?.length || 0), 0)})
                </button>
                <button
                  onClick={() => handleTicketTypeFilterChange('ladies')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    ticketTypeFilter === 'ladies'
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Ladies Pass ({allBookings.reduce((total, booking) => total + (booking.tickets?.filter(ticket => ticket.ticket_type === 'ladies').length || 0), 0)})
                </button>
                <button
                  onClick={() => handleTicketTypeFilterChange('stall')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    ticketTypeFilter === 'stall'
                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Stall Pass ({allBookings.reduce((total, booking) => total + (booking.tickets?.filter(ticket => ticket.ticket_type === 'stall').length || 0), 0)})
                </button>
                <button
                  onClick={() => handleTicketTypeFilterChange('dandiya')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    ticketTypeFilter === 'dandiya'
                      ? 'bg-pink-100 text-pink-800 border border-pink-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Dandiya Sticks ({allDandiyaBookings.length})
                </button>
              </div>
            </div>
          </div>
          
          {(searchTerm || paymentStatusFilter !== 'all' || ticketTypeFilter !== 'all') && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredBookings.reduce((total, booking) => total + (booking.tickets?.length || 0), 0) + filteredDandiyaBookings.length} of {allBookings.reduce((total, booking) => total + (booking.tickets?.length || 0), 0) + allDandiyaBookings.length} bookings
            </div>
          )}
        </div>
      </div>

      {/* Bookings List */}
      {/* Total Amount Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
          {/* Event Passes */}
          <div className="bg-white rounded-lg shadow p-4 border border-orange-200 break-words">
            <h4 className="text-lg font-semibold text-orange-700 mb-2">Event Passes</h4>
            <p className="text-2xl font-bold text-orange-600">
              ₹{allBookings.reduce((sum, booking) =>
                booking.payment_status === 'paid'
                  ? sum + booking.tickets.filter(t => ['ladies','single'].includes(t.ticket_type)).reduce((s, t) => s + (booking.amount || 0), 0)
                  : sum,
                0
              )}
            </p>
          </div>
          {/* Stall Passes */}
          <div className="bg-white rounded-lg shadow p-4 border border-purple-200 break-words">
            <h4 className="text-lg font-semibold text-purple-700 mb-2">Stall Passes</h4>
            <p className="text-2xl font-bold text-purple-600">
              ₹{allBookings.reduce((sum, booking) =>
                booking.payment_status === 'paid'
                  ? sum + booking.tickets.filter(t => t.ticket_type === 'stall').reduce((s, t) => s + (booking.amount || 0), 0)
                  : sum,
                0
              )}
            </p>
          </div>
          {/* Dandiya Passes */}
          <div className="bg-white rounded-lg shadow p-4 border border-pink-200 break-words">
            <h4 className="text-lg font-semibold text-pink-700 mb-2">Dandiya Passes</h4>
            <p className="text-2xl font-bold text-pink-600">
              ₹{allDandiyaBookings.reduce((sum, booking) =>
                booking.payment_status === 'paid' ? sum + (booking.amount || 0) : sum,
                0
              )}
            </p>
          </div>
          {/* Children Total */}
          <div className="bg-white rounded-lg shadow p-4 border border-green-200 break-words">
            <h4 className="text-lg font-semibold text-green-700 mb-2">Children</h4>
            <p className="text-2xl font-bold text-green-600">
              ₹{allBookings.reduce((sum, booking) => {
                if (booking.payment_status !== 'paid') return sum;
                const ticketChildrenTotal = (booking.tickets || []).reduce((inner, t) => inner + (t.children_count || 0), 0);
                return sum + ticketChildrenTotal * getChildPrice();
              }, 0)}
            </p>
            <p className="text-sm text-green-800 mt-1">
              Total Children: {allBookings.reduce((sum, booking) => booking.payment_status === 'paid' ? sum + (booking.tickets || []).reduce((inner, t) => inner + (t.children_count || 0), 0) : sum, 0)}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading bookings...</p>
          </div>
        ) : (filteredBookings.length === 0 && filteredDandiyaBookings.length === 0) ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'No bookings found matching your search' : 'No bookings found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Regular Bookings */}
            {filteredBookings.flatMap((booking) => 
              booking.tickets?.map((ticket, ticketIndex) => (
                <div key={`${booking.booking_id}-${ticket.id}`} className={`rounded-lg shadow overflow-hidden ${
                  ticket.ticket_type === 'stall' ? 'bg-purple-50 border-2 border-purple-200' : 'bg-white'
                }`}>
                  {/* Ticket Header */}
                  <div className={`px-4 sm:px-6 py-4 border-b ${
                    ticket.ticket_type === 'stall' ? 'border-purple-300' : 'border-gray-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 break-all">
                          Ticket Code: {ticket.ticket_code}
                          {ticket.ticket_type === 'stall' && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              🎪 Stall Pass
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {ticket.ticket_type === 'ladies' ? 'Ladies Pass' : 
                           ticket.ticket_type === 'single' ? 'Single Pass' : 
                           ticket.ticket_type === 'stall' ? 'Stall Pass' : 
                           ticket.ticket_type === 'children_only' ? 'Children Only' : 'Pass'} #{ticket.ticket_index + 1}
                        </p>
                        <p className="text-sm text-gray-600 break-all">
                          Booking ID: {booking.booking_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          Created: {formatDate(booking.created_at)} ({getBookingPhaseFromAmount(booking, ticket)})
                        </p>
                      </div>
                      
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-bold text-green-600">
                          ₹{booking && booking.amount}
                        </p>

                        <div className="flex items-center space-x-2">
                          <span className={`text-sm px-2 py-1 rounded-full font-medium ${
                            booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            booking.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                          </span>
                          <button
                            onClick={() => updatePaymentStatus(booking.booking_id, booking.payment_status === 'paid' ? 'pending' : 'paid')}
                            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            Toggle
                          </button>
                        </div>
                        {/* Scan Status */}
                        {ticketScanStatus[ticket.ticket_code] && (
                          <div className="mt-2">
                            {ticketScanStatus[ticket.ticket_code].isScanned ? (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✅ Scanned
                                </span>
                                <span className="text-xs text-gray-500">
                                  {ticketScanStatus[ticket.ticket_code].scanCount} time{ticketScanStatus[ticket.ticket_code].scanCount > 1 ? 's' : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                ⏳ Not Scanned
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                        <span>Members: {
                          ticket.ticket_type === 'ladies' ? '1 lady' : 
                          ticket.ticket_type === 'single' ? '1 adult' : 
                          ticket.ticket_type === 'stall' ? '2 adults' : 
                          ticket.ticket_type === 'children_only' ? '0 adults' : '1 adult'
                        } + {ticket.children_count || 0} {ticket.children_count === 1 ? 'child' : 'children'}</span>

                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={() => downloadPass(booking.booking_id, ticket.ticket_index)}
                          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Download Pass
                        </button>

                        <button
                          onClick={() => handleShareTicket(booking, ticket)}
                          className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
                        >
                          Share
                        </button>

                        <button
                          onClick={() => toggleExpanded(`${booking.booking_id}-${ticket.id}`)}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          {expandedBookings.has(`${booking.booking_id}-${ticket.id}`) ? 'Hide Details' : 'View Details'}
                        </button>

                        <button
                          onClick={() => handleDeleteTicket(ticket, booking)}
                          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          🗑️ Delete Ticket
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
                        
                        {/* Scan History */}
                        {ticketScanHistory[ticket.ticket_code] && ticketScanHistory[ticket.ticket_code].length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium text-gray-700 mb-2">Scan History:</h5>
                            <div className="space-y-2">
                              {ticketScanHistory[ticket.ticket_code].map((scan, index) => (
                                <div key={index} className="bg-white rounded-lg p-3 border">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        Scan #{index + 1}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        {formatDate(scan.scanned_at)}
                                      </p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      by {scan.scanned_by}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )) || []
            )}
            
            {/* Dandiya Bookings */}
            {filteredDandiyaBookings.map((dandiyaBooking) => {
              // Generate Ticket ID for dandiya pass (always ticketIndex = 0)
              const ticketId = (() => {
                let hash = 0;
                const bookingId = dandiyaBooking.booking_id;
                for (let i = 0; i < bookingId.length; i++) {
                  const char = bookingId.charCodeAt(i);
                  hash = ((hash << 5) - hash) + char;
                  hash = hash & hash;
                }
                const combinedHash = hash + (0 * 10000);
                const part1 = Math.abs(combinedHash % 900) + 100;
                const part2 = Math.abs((combinedHash * 7) % 9000) + 1000;
                const part3 = Math.abs((combinedHash * 13) % 900) + 100;
                return `${part1} ${part2} ${part3}`;
              })();

              // Scan status for dandiya pass
              const scanStatus = ticketScanStatus[ticketId];

              return (
                <div key={dandiyaBooking.booking_id} className="rounded-lg shadow overflow-hidden bg-pink-50 border-2 border-pink-200">
                  {/* Dandiya Booking Header */}
                  <div className="px-4 sm:px-6 py-4 border-b border-pink-300">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 break-all">
                          Dandiya Booking: {dandiyaBooking.booking_id}
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                            🎪 Dandiya Sticks
                          </span>
                        </h3>
                        <p className="text-sm text-gray-600">
                          Customer: {dandiyaBooking.customer_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Mobile: {dandiyaBooking.mobile}
                        </p>
                        <p className="text-sm text-gray-600">
                          Created: {formatDate(dandiyaBooking.created_at)}
                        </p>
                        {/* Dandiya Pass ID */}
                        <p className="text-sm text-pink-700 font-mono mt-2">ID: {ticketId}</p>
                        {/* Scan Status */}
                        <div className="mt-2">
                          {scanStatus && scanStatus.isScanned ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Scanned
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              ⏳ Not Scanned
                            </span>
                          )}
                        </div>
                        {/* Share Button */}
                        <div className="flex items-center mt-3">
                          <button
                            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors shadow-sm"
                            style={{ minWidth: '120px' }}
                            onClick={() => {
                              const message = `Hey *${dandiyaBooking.customer_name}*!\n\n` +
                                `This is the specific pass to avail your dandiya sticks!\n\n` +
                                `📩 Dandiya Sticks Booking Confirmation – Asha Bani Dandiya Raas 5.0\n\n` +
                                `Dear Guest,\nYour booking has been successfully confirmed. Please present this pass at the entry gate, where it will be verified by our security team.\n\n` +
                                `⚠ Important Instructions:\n` +
                                `1. This pass contains a unique, system-generated code/QR that is directly linked to your name, identity, and booking details.\n` +
                                `2. Even if your name is not printed on the pass, the code already carries your information in our system.\n` +
                                `3. Please do not share or forward this pass to anyone.\n` +
                                `4. If the same pass is presented by more than one person, the dandiya sticks for both individuals will be immediately cancelled at the gate.\n` +
                                `5. Any attempt to copy, duplicate, or tamper with this pass will be easily detected, and dadniya sticks would not be availed to you.\n\n` +
                                `We look forward to welcoming you to an unforgettable evening at Asha Bani Dandiya Raas 5.0.\n\n` +
                                `Warm regards,\nTeam Asha Bani Dandiya Raas 5.0`;
                              const whatsappUrl = `whatsapp://send?phone=91${dandiyaBooking.mobile}&text=${encodeURIComponent(message)}`;
                              window.open(whatsappUrl, "_self");
                            }}
                          >
                            <span className="mr-2">🔗</span>Share via WhatsApp
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dandiyaBooking.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {dandiyaBooking.payment_status.charAt(0).toUpperCase() + dandiyaBooking.payment_status.slice(1)}
                        </span>
                        <button
                          onClick={() => updateDandiyaPaymentStatus(dandiyaBooking.booking_id, dandiyaBooking.payment_status === 'paid' ? 'pending' : 'paid')}
                          className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                        >
                          Toggle
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={() => downloadDandiyaPass(dandiyaBooking.booking_id)}
                        className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Download Dandiya Pass
                      </button>
                      <button
                        onClick={() => deleteDandiyaBooking(dandiyaBooking.booking_id)}
                        className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete Booking
                      </button>
                      <div className="text-sm text-gray-600 flex items-center">
                        <span className="font-medium">Amount: ₹{dandiyaBooking.amount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onClose={handleQRScannerClose}
          authToken={authToken}
          onTicketScanned={handleTicketScanned}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Delete Ticket</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this ticket? This action cannot be undone.
              </p>
              
              {deleteConfirmation.ticket && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <p><strong>Ticket Code:</strong> {deleteConfirmation.ticket.ticket_code}</p>
                    <p><strong>Ticket Type:</strong> {deleteConfirmation.ticket.ticket_type === 'ladies' ? 'Ladies Pass' : 
                       deleteConfirmation.ticket.ticket_type === 'single' ? 'Single Pass' : 
                       deleteConfirmation.ticket.ticket_type === 'stall' ? 'Stall Pass' : 'Pass'}</p>
                    <p><strong>Booking ID:</strong> {deleteConfirmation.booking?.booking_id}</p>
                    <p><strong>Booking Phase:</strong> {deleteConfirmation.booking && deleteConfirmation.ticket ? getBookingPhaseFromAmount(deleteConfirmation.booking, deleteConfirmation.ticket) : 'Unknown'}</p>
                    <p><strong>Amount:</strong> {formatCurrency(calculateTicketAmount(deleteConfirmation.ticket, deleteConfirmation.booking))}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteTicket}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTicket}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="text-lg">
              {notification.type === 'success' ? '✅' : '❌'}
            </div>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
