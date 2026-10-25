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
          payment_status TEXT DEFAULT 'pending',
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
        }
      });

      // Create ticket_scans table for tracking QR code scans
      db.run(`
        CREATE TABLE IF NOT EXISTS ticket_scans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id TEXT NOT NULL,
          ticket_index INTEGER NOT NULL,
          ticket_code TEXT NOT NULL,
          scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          scanned_by TEXT DEFAULT 'admin',
          FOREIGN KEY (booking_id) REFERENCES bookings (booking_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating ticket_scans table:', err);
          reject(err);
        }
      });

      // Create dandiya_bookings table
      db.run(`
        CREATE TABLE IF NOT EXISTS dandiya_bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id TEXT UNIQUE NOT NULL,
          customer_name TEXT NOT NULL,
          mobile TEXT NOT NULL,
          amount INTEGER NOT NULL,
          payment_status TEXT DEFAULT 'pending',
          payment_timestamp TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating dandiya_bookings table:', err);
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
    const { bookingId, tickets, customerDetails } = bookingData;
    
    console.log('Saving booking with amount:', bookingData.paymentDetails?.amount || bookingData.totalAmount || 0);
    
    db.serialize(() => {
      // Insert booking with current timestamp
      const currentTimestamp = new Date().toISOString();
      db.run(`
        INSERT INTO bookings (booking_id, payment_id, order_id, amount, payment_status, payment_timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        bookingId,
        null, // payment_id
        null, // order_id
        bookingData.paymentDetails?.amount || bookingData.totalAmount || 0,
        'pending', // payment_status
        null, // payment_timestamp
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
           let totalAdults;
           if (ticket.type === 'single') {
             totalAdults = 1;
           } else if (ticket.type === 'stall') {
             totalAdults = 2; // Stall pass is for 2 adults
           } else if (ticket.type === 'children_only') {
             totalAdults = 0;
           } else {
             totalAdults = 1; // Default fallback
           }
           
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

// Function to check if a ticket has been scanned
const isTicketScanned = (ticketCode) => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT * FROM ticket_scans 
      WHERE ticket_code = ?
      ORDER BY scanned_at DESC
      LIMIT 1
    `, [ticketCode], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
};

// Function to record a ticket scan
const recordTicketScan = (bookingId, ticketIndex, ticketCode) => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO ticket_scans (booking_id, ticket_index, ticket_code, scanned_at, scanned_by)
      VALUES (?, ?, ?, ?, ?)
    `, [bookingId, ticketIndex, ticketCode, new Date().toISOString(), 'admin'], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
};

// Function to get ticket details by QR code data
const getTicketByQRData = (qrData) => {
  return new Promise((resolve, reject) => {
    // Parse QR data to extract ticket code
    const lines = qrData.split('\n');
    let ticketCode = null;
    
    for (const line of lines) {
      if (line.startsWith('Ticket ID:')) {
        ticketCode = line.replace('Ticket ID:', '').trim();
        break;
      }
    }
    
    if (!ticketCode) {
      reject(new Error('Invalid QR code data'));
      return;
    }
    
    // Find the ticket in the database
    db.get(`
      SELECT t.*, b.booking_id, b.amount, b.payment_status
      FROM tickets t
      JOIN bookings b ON t.booking_id = b.booking_id
      WHERE t.ticket_code = ?
    `, [ticketCode], (err, ticket) => {
      if (err) {
        reject(err);
      } else if (!ticket) {
        reject(new Error('Ticket not found'));
      } else {
        // Get customer details for this ticket
        db.all(`
          SELECT * FROM customers 
          WHERE booking_id = ? AND ticket_index = ?
          ORDER BY customer_type, customer_index
        `, [ticket.booking_id, ticket.ticket_index], (err, customers) => {
          if (err) {
            reject(err);
          } else {
            // Separate adults and children
            const adults = customers.filter(c => c.customer_type === 'adult');
            const children = customers.filter(c => c.customer_type === 'child');
            
            resolve({
              ...ticket,
              adults: adults.length > 0 ? adults : [],
              children: children.length > 0 ? children : []
            });
          }
        });
      }
    });
  });
};

// Update payment status
const updatePaymentStatus = (bookingId, status) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE bookings 
      SET payment_status = ?, payment_timestamp = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE payment_timestamp END
      WHERE booking_id = ?
    `;
    
    db.run(query, [status, status, bookingId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

// Delete a specific ticket from a booking
const deleteTicket = (bookingId, ticketId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // First, get the ticket details to find the ticket_index
      db.get(`
        SELECT ticket_index FROM tickets 
        WHERE id = ? AND booking_id = ?
      `, [ticketId, bookingId], (err, ticket) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!ticket) {
          reject(new Error('Ticket not found'));
          return;
        }
        
        const ticketIndex = ticket.ticket_index;
        
        // Delete related customer records
        db.run(`
          DELETE FROM customers 
          WHERE booking_id = ? AND ticket_index = ?
        `, [bookingId, ticketIndex], (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Delete related ticket scan records
          db.run(`
            DELETE FROM ticket_scans 
            WHERE booking_id = ? AND ticket_index = ?
          `, [bookingId, ticketIndex], (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Delete the ticket itself
            db.run(`
              DELETE FROM tickets 
              WHERE id = ? AND booking_id = ?
            `, [ticketId, bookingId], function(err) {
              if (err) {
                reject(err);
              } else {
                resolve({ changes: this.changes });
              }
            });
          });
        });
      });
    });
  });
};

// Save dandiya booking
const saveDandiyaBooking = (bookingData) => {
  return new Promise((resolve, reject) => {
  const { bookingId, customerName, mobile, totalAmount } = bookingData;
    
    console.log('Saving dandiya booking:', bookingId, customerName, totalAmount);
    
    const currentTimestamp = new Date().toISOString();
    db.run(`
      INSERT INTO dandiya_bookings (booking_id, customer_name, mobile, amount, payment_status, payment_timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      bookingId,
      customerName,
      mobile,
      totalAmount,
      'pending', // payment_status
      null, // payment_timestamp
      currentTimestamp
    ], function(err) {
      if (err) {
        console.error('Error saving dandiya booking:', err);
        reject(err);
      } else {
        console.log('Dandiya booking saved successfully');
        resolve();
      }
    });
  });
};

// Get all dandiya bookings
const getAllDandiyaBookings = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT * FROM dandiya_bookings 
      ORDER BY created_at DESC
    `, (err, rows) => {
      if (err) {
        console.error('Error fetching dandiya bookings:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Update dandiya booking payment status
const updateDandiyaPaymentStatus = (bookingId, status) => {
  return new Promise((resolve, reject) => {
    const paymentTimestamp = status === 'paid' ? new Date().toISOString() : null;
    
    db.run(`
      UPDATE dandiya_bookings 
      SET payment_status = ?, payment_timestamp = ?
      WHERE booking_id = ?
    `, [status, paymentTimestamp, bookingId], function(err) {
      if (err) {
        console.error('Error updating dandiya payment status:', err);
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

// Get dandiya booking by ID
const getDandiyaBookingById = (bookingId) => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT * FROM dandiya_bookings 
      WHERE booking_id = ?
    `, [bookingId], (err, row) => {
      if (err) {
        console.error('Error fetching dandiya booking:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Delete dandiya booking
const deleteDandiyaBooking = (bookingId) => {
  return new Promise((resolve, reject) => {
    db.run(`
      DELETE FROM dandiya_bookings 
      WHERE booking_id = ?
    `, [bookingId], function(err) {
      if (err) {
        console.error('Error deleting dandiya booking:', err);
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

export { db, initDatabase, saveBooking, getAllBookings, isTicketScanned, recordTicketScan, getTicketByQRData, updatePaymentStatus, deleteTicket, saveDandiyaBooking, getAllDandiyaBookings, updateDandiyaPaymentStatus, getDandiyaBookingById, deleteDandiyaBooking };
