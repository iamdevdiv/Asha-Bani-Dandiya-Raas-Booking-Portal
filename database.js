import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dbPath = path.join(__dirname, 'bookings.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create bookings table
      db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id TEXT UNIQUE NOT NULL,
          payment_id TEXT,
          order_id TEXT,
          amount INTEGER NOT NULL,
          payment_status TEXT DEFAULT 'success',
          payment_timestamp TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating bookings table:', err);
          reject(err);
        }
      });

      // Create tickets table
      db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id TEXT NOT NULL,
          ticket_index INTEGER NOT NULL,
          ticket_type TEXT NOT NULL,
          children_count INTEGER DEFAULT 0,
          ticket_code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating tickets table:', err);
          reject(err);
        }
      });

      // Create customers table
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id TEXT NOT NULL,
          ticket_index INTEGER NOT NULL,
          customer_type TEXT NOT NULL,
          customer_index INTEGER NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT,
          mobile TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating customers table:', err);
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  });
};

// Save booking data to database
const saveBooking = (bookingData) => {
  return new Promise((resolve, reject) => {
    const { bookingId, paymentDetails, tickets, customerDetails } = bookingData;
    
    db.serialize(() => {
      // Insert booking with current timestamp
      const currentTimestamp = new Date().toISOString();
      db.run(`
        INSERT INTO bookings (booking_id, payment_id, order_id, amount, payment_status, payment_timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        bookingId,
        paymentDetails.paymentId,
        paymentDetails.orderId,
        paymentDetails.amount,
        paymentDetails.status,
        paymentDetails.timestamp,
        currentTimestamp
      ], function(err) {
        if (err) {
          console.error('Error saving booking:', err);
          reject(err);
          return;
        }
        
        const bookingInsertId = this.lastID;
        
        // Insert tickets
        const ticketPromises = tickets.map((ticket, ticketIndex) => {
          return new Promise((resolveTicket, rejectTicket) => {
            const ticketCode = generateTicketCode(bookingId, ticketIndex);
            
            db.run(`
              INSERT INTO tickets (booking_id, ticket_index, ticket_type, children_count, ticket_code, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              bookingId,
              ticketIndex,
              ticket.type,
              ticket.children,
              ticketCode,
              currentTimestamp
            ], function(err) {
              if (err) {
                rejectTicket(err);
              } else {
                resolveTicket();
              }
            });
          });
        });
        
                 // Insert customers
         const customerPromises = [];
         
         tickets.forEach((ticket, ticketIndex) => {
           const totalAdults = ticket.type === 'single' ? 1 : 2;
           
           // Add adult customers
           for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
             const adultKey = `ticket_${ticketIndex}_adult_${adultIndex}`;
             const adult = customerDetails[adultKey];
             if (adult) {
              customerPromises.push(new Promise((resolveCustomer, rejectCustomer) => {
                db.run(`
                  INSERT INTO customers (booking_id, ticket_index, customer_type, customer_index, first_name, last_name, email, mobile, address, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  bookingId,
                  ticketIndex,
                  'adult',
                  adultIndex,
                  adult.firstName,
                  adult.lastName,
                  adult.email || '',
                  adult.mobile || '',
                  adult.address || '',
                  currentTimestamp
                ], function(err) {
                  if (err) {
                    rejectCustomer(err);
                  } else {
                    resolveCustomer();
                  }
                });
              }));
            }
          }
          
          // Add child customers
          for (let childIndex = 0; childIndex < ticket.children; childIndex++) {
            const childKey = `ticket_${ticketIndex}_child_${childIndex}`;
            const child = customerDetails[childKey];
            if (child) {
              customerPromises.push(new Promise((resolveCustomer, rejectCustomer) => {
                db.run(`
                  INSERT INTO customers (booking_id, ticket_index, customer_type, customer_index, first_name, last_name, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                  bookingId,
                  ticketIndex,
                  'child',
                  childIndex,
                  child.firstName,
                  child.lastName,
                  currentTimestamp
                ], function(err) {
                  if (err) {
                    rejectCustomer(err);
                  } else {
                    resolveCustomer();
                  }
                });
              }));
            }
          }
        });
        
        // Wait for all inserts to complete
        Promise.all([...ticketPromises, ...customerPromises])
          .then(() => {
            console.log(`Booking ${bookingId} saved successfully`);
            resolve(bookingId);
          })
          .catch(reject);
      });
    });
  });
};

// Get all bookings with details
const getAllBookings = () => {
  return new Promise((resolve, reject) => {
    // First get all bookings
    const bookingQuery = `
      SELECT * FROM bookings 
      ORDER BY created_at DESC
    `;
    
    db.all(bookingQuery, [], (err, bookings) => {
      if (err) {
        reject(err);
        return;
      }
      
      // For each booking, get its tickets and customers
      const bookingPromises = bookings.map(booking => {
        return new Promise((resolveBooking, rejectBooking) => {
          // Get tickets for this booking
          const ticketQuery = `
            SELECT * FROM tickets 
            WHERE booking_id = ?
            ORDER BY ticket_index
          `;
          
          db.all(ticketQuery, [booking.booking_id], (err, tickets) => {
            if (err) {
              rejectBooking(err);
            } else {
              // For each ticket, get its customers
              const ticketPromises = tickets.map(ticket => {
                return new Promise((resolveTicket, rejectTicket) => {
                  const customerQuery = `
                    SELECT * FROM customers 
                    WHERE booking_id = ? AND ticket_index = ?
                    ORDER BY customer_type, customer_index
                  `;
                  
                                     db.all(customerQuery, [booking.booking_id, ticket.ticket_index], (err, customers) => {
                     if (err) {
                       rejectTicket(err);
                     } else {
                       // Separate adults and children
                       const adults = customers.filter(c => c.customer_type === 'adult');
                       const children = customers.filter(c => c.customer_type === 'child');
                       
                                                                        resolveTicket({
                           ...ticket,
                           adults: adults.length > 0 ? adults : [],
                           children: children.length > 0 ? children : []
                         });
                     }
                   });
                });
              });
              
              Promise.all(ticketPromises)
                .then(ticketsWithCustomers => {
                  resolveBooking({
                    ...booking,
                    tickets: ticketsWithCustomers
                  });
                })
                .catch(rejectBooking);
            }
          });
        });
      });
      
      Promise.all(bookingPromises)
        .then(resolve)
        .catch(reject);
    });
  });
};

// Helper function to generate ticket code (same as in server.js)
const generateTicketCode = (bookingId, ticketIndex) => {
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) {
    const char = bookingId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const combinedHash = hash + (ticketIndex * 10000);
  
  const part1 = Math.abs(combinedHash % 900) + 100;
  const part2 = Math.abs((combinedHash * 7) % 9000) + 1000;
  const part3 = Math.abs((combinedHash * 13) % 900) + 100;
  
  return `${part1} ${part2} ${part3}`;
};

export { db, initDatabase, saveBooking, getAllBookings };
