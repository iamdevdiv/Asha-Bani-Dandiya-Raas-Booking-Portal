// Usage: node setTicketNotScanned.js <ticket_code>
// This script sets the scan status of an event ticket to 'not scanned' in the database by ticket code.


import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'bookings.db');
const ticketCode = process.argv[2];

if (!ticketCode) {
  console.error('Usage: node setTicketNotScanned.js <ticket_code>');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Could not connect to database: ${err.message}`);
    process.exit(1);
  }
});

const query = 'DELETE FROM ticket_scans WHERE ticket_code = ?';
db.run(query, [ticketCode], function(err) {
  if (err) {
    console.error(`Error updating scan status: ${err.message}`);
    process.exit(1);
  }
  if (this.changes > 0) {
    console.log(`Scan status reset for ticket code: ${ticketCode}`);
  } else {
    console.log(`No scan record found for ticket code: ${ticketCode}`);
  }
  db.close();
});
