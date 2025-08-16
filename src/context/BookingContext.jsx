import { createContext, useContext, useReducer } from 'react';

const BookingContext = createContext();

const initialState = {
  currentStep: 1,
  tickets: [],
  customerDetails: [],
  paymentDetails: null,
  totalAmount: 0,
  bookingId: null,
};

const bookingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'ADD_TICKET':
      return {
        ...state,
        tickets: [...state.tickets, action.payload],
        totalAmount: calculateTotal([...state.tickets, action.payload])
      };
    
    case 'UPDATE_TICKET':
      const updatedTickets = state.tickets.map((ticket, index) =>
        index === action.payload.index ? action.payload.ticket : ticket
      );
      return {
        ...state,
        tickets: updatedTickets,
        totalAmount: calculateTotal(updatedTickets)
      };
    
    case 'REMOVE_TICKET':
      const filteredTickets = state.tickets.filter((_, index) => index !== action.payload);
      return {
        ...state,
        tickets: filteredTickets,
        totalAmount: calculateTotal(filteredTickets)
      };
    
    case 'SET_CUSTOMER_DETAILS':
      return { ...state, customerDetails: action.payload };
    
    case 'SET_PAYMENT_DETAILS':
      return { ...state, paymentDetails: action.payload };
    
    case 'SET_BOOKING_ID':
      return { ...state, bookingId: action.payload };
    
    case 'RESET_BOOKING':
      return initialState;
    
    default:
      return state;
  }
};

const calculateTotal = (tickets) => {
  return tickets.reduce((total, ticket) => {
    let ticketPrice = ticket.type === 'single' ? 399 : 799;
    let childrenPrice = ticket.children * 199;
    return total + ticketPrice + childrenPrice;
  }, 0);
};

export const BookingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const value = {
    ...state,
    dispatch,
    addTicket: (ticket) => dispatch({ type: 'ADD_TICKET', payload: ticket }),
    updateTicket: (index, ticket) => dispatch({ type: 'UPDATE_TICKET', payload: { index, ticket } }),
    removeTicket: (index) => dispatch({ type: 'REMOVE_TICKET', payload: index }),
    setStep: (step) => dispatch({ type: 'SET_STEP', payload: step }),
    setCustomerDetails: (details) => dispatch({ type: 'SET_CUSTOMER_DETAILS', payload: details }),
    setPaymentDetails: (details) => dispatch({ type: 'SET_PAYMENT_DETAILS', payload: details }),
    setBookingId: (id) => dispatch({ type: 'SET_BOOKING_ID', payload: id }),
    resetBooking: () => dispatch({ type: 'RESET_BOOKING' }),
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

