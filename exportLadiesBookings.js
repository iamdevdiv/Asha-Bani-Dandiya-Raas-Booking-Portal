// exportLadiesBookings.js
// Script to export all Ladies Pass bookings from bookings.db to CSV.
// Can be run locally or directly on VPS: node exportLadiesBookings.js
// Optional flags:
//   --paid-only       Export only confirmed/paid bookings
//   --out=<filename>  Specify output CSV path (default: ladies_bookings_export.csv)
//   --db=<path>       Specify path to bookings.db (default: ./bookings.db)

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const paidOnly = args.includes('--paid-only');

const dbArg = args.find(arg => arg.startsWith('--db='));
const dbPath = dbArg ? dbArg.split('=')[1] : path.join(__dirname, 'bookings.db');

const outArg = args.find(arg => arg.startsWith('--out='));
const defaultOut = path.join(__dirname, 'ladies_bookings_export.csv');
const outputPath = outArg ? path.resolve(outArg.split('=')[1]) : defaultOut;

// Validate database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Determine pricing phase from ticket price, child count, and booking date
const determinePhase = (amount, childrenCount, createdAt) => {
  const childPrice = 199;
  const basePrice = amount - (childrenCount * childPrice);

  if (basePrice === 399) return 'Early Bird';
  if (basePrice === 429) return 'Phase 1';
  if (basePrice === 459) return 'Phase 2';
  if (basePrice === 499) return 'Phase 3';
  if (basePrice === 599) return 'Phase ₹599 (Admin Only)';

  // Date-based fallback if base price doesn't match standard tiers
  const date = new Date(createdAt);
  const earlyBirdEnd = new Date('2025-08-29T23:59:59.999Z');
  const phase1End = new Date('2025-09-15T23:59:59.999Z');
  const phase2End = new Date('2025-09-21T23:59:59.999Z');

  if (date <= earlyBirdEnd) return 'Early Bird';
  if (date <= phase1End) return 'Phase 1';
  if (date <= phase2End) return 'Phase 2';
  return 'Phase 3';
};

// RFC 4180 CSV value escaping
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Format date nicely
const formatDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const runExport = async () => {
  console.log('='.repeat(60));
  console.log('  Asha Bani Dandiya Raas 2025 - Ladies Pass Bookings Export');
  console.log('='.repeat(60));
  console.log(`Database:    ${dbPath}`);
  console.log(`Output File: ${outputPath}`);
  console.log(`Filter:      ${paidOnly ? 'Paid Bookings Only (--paid-only)' : 'All Bookings (Paid & Pending)'}`);
  console.log('-'.repeat(60));

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error(`❌ Could not connect to database: ${err.message}`);
      process.exit(1);
    }
  });

  // Query all ladies tickets joined with booking details and scan info
  const ticketsQuery = `
    SELECT 
      b.booking_id,
      b.amount,
      b.payment_status,
      b.payment_id,
      b.order_id,
      b.created_at as booking_date,
      t.ticket_index,
      t.ticket_code,
      t.ticket_type,
      t.children_count,
      ts.scan_count,
      ts.first_scanned_at,
      ts.last_scanned_at
    FROM tickets t
    JOIN bookings b ON t.booking_id = b.booking_id
    LEFT JOIN (
      SELECT 
        ticket_code, 
        COUNT(*) as scan_count,
        MIN(scanned_at) as first_scanned_at,
        MAX(scanned_at) as last_scanned_at
      FROM ticket_scans
      GROUP BY ticket_code
    ) ts ON ts.ticket_code = t.ticket_code
    WHERE t.ticket_type = 'ladies'
    ${paidOnly ? "AND b.payment_status = 'paid'" : ''}
    ORDER BY b.created_at ASC
  `;

  const customersQuery = `
    SELECT booking_id, ticket_index, customer_type, customer_index, first_name, last_name, email, mobile, address
    FROM customers
    ORDER BY booking_id, ticket_index, customer_type, customer_index
  `;

  try {
    const [tickets, customers] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(ticketsQuery, [], (err, rows) => err ? reject(err) : resolve(rows));
      }),
      new Promise((resolve, reject) => {
        db.all(customersQuery, [], (err, rows) => err ? reject(err) : resolve(rows));
      })
    ]);

    db.close();

    // Map customer details by booking_id + ticket_index
    const customerMap = new Map();
    for (const c of customers) {
      const key = `${c.booking_id}_${c.ticket_index}`;
      if (!customerMap.has(key)) {
        customerMap.set(key, { adults: [], children: [] });
      }
      const entry = customerMap.get(key);
      if (c.customer_type === 'adult') {
        entry.adults.push(c);
      } else if (c.customer_type === 'child') {
        entry.children.push(c);
      }
    }

    // CSV Headers
    const headers = [
      'S.No.',
      'Booking ID',
      'Ticket Code',
      'Booking Channel',
      'Adult Name',
      'Mobile Number',
      'Email',
      'Address',
      'Children Count',
      'Children Names',
      'Phase',
      'Amount (INR)',
      'Payment Status',
      'Scan Status',
      'Scanned At (IST)',
      'Booking Date (IST)'
    ];

    // Stats accumulators
    let totalPaid = 0;
    let totalPending = 0;
    let totalOnline = 0;
    let totalOffline = 0;
    let totalScanned = 0;
    let totalNotScanned = 0;
    let totalChildren = 0;
    const phaseCounts = {};

    const csvRows = [headers.map(escapeCSV).join(',')];

    tickets.forEach((t, idx) => {
      const custData = customerMap.get(`${t.booking_id}_${t.ticket_index}`) || { adults: [], children: [] };
      const adult = custData.adults[0] || {};

      const adultName = [adult.first_name, adult.last_name].filter(Boolean).join(' ').trim();
      const mobile = (adult.mobile || '').trim();
      const email = (adult.email || '').trim();
      const address = (adult.address || '').replace(/\r?\n+/g, ', ').replace(/\s+/g, ' ').trim();

      const childrenNames = custData.children
        .map(c => [c.first_name, c.last_name].filter(Boolean).join(' ').trim())
        .filter(Boolean)
        .join(', ');

      const isOffline = t.booking_id.startsWith('OFFLINE_') || t.payment_id === 'OFFLINE_PAYMENT';
      const bookingChannel = isOffline ? 'Offline' : 'Online';

      const phase = determinePhase(t.amount, t.children_count || 0, t.booking_date);
      const isScanned = (t.scan_count || 0) > 0;
      const scanStatus = isScanned ? 'Scanned' : 'Not Scanned';
      const scannedAtFormatted = isScanned ? formatDate(t.last_scanned_at || t.first_scanned_at) : '';
      const bookingDateFormatted = formatDate(t.booking_date);

      // Track statistics
      if (t.payment_status === 'paid') totalPaid++;
      else totalPending++;

      if (isOffline) totalOffline++;
      else totalOnline++;

      if (isScanned) totalScanned++;
      else totalNotScanned++;

      const childCountNum = t.children_count || custData.children.length || 0;
      totalChildren += childCountNum;

      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;

      const rowValues = [
        idx + 1,
        t.booking_id,
        t.ticket_code,
        bookingChannel,
        adultName,
        mobile,
        email,
        address,
        childCountNum,
        childrenNames,
        phase,
        t.amount,
        t.payment_status,
        scanStatus,
        scannedAtFormatted,
        bookingDateFormatted
      ];

      csvRows.push(rowValues.map(escapeCSV).join(','));
    });

    // Write file with UTF-8 BOM so Excel opens Indian names and symbols correctly
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    console.log(`\nExport Completed Successfully!`);
    console.log(`Saved To:        ${outputPath}`);
    console.log(`Total Tickets:   ${tickets.length}`);
    console.log(`  - Online:      ${totalOnline}`);
    console.log(`  - Offline:     ${totalOffline}`);
    console.log(`  - Paid:        ${totalPaid}`);
    console.log(`  - Pending:     ${totalPending}`);
    console.log(`  - Scanned:     ${totalScanned}`);
    console.log(`  - Not Scanned: ${totalNotScanned}`);
    console.log(`  - Children:    ${totalChildren}`);
    console.log('\nPhases Breakdown:');
    Object.entries(phaseCounts).forEach(([ph, count]) => {
      console.log(`  - ${ph.padEnd(25)}: ${count}`);
    });
    console.log('='.repeat(60));

    if (!paidOnly && totalPending > 0) {
      console.log(`\nNote: Export includes ${totalPending} pending bookings.`);
      console.log('To export paid bookings only, run:');
      console.log('  node exportLadiesBookings.js --paid-only\n');
    }
  } catch (err) {
    console.error('❌ Error exporting ladies bookings:', err);
    process.exit(1);
  }
};

runExport();
