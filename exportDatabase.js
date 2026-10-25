// exportDatabase.js
import sqlite3 from 'sqlite3';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path (same as in database.js)
const dbPath = path.join(__dirname, 'bookings.db');

// Output Excel file path
const excelPath = path.join(__dirname, 'database_export.xlsx');

// Create SQLite connection
const db = new sqlite3.Database(dbPath);

// Function to export database into Excel
const exportDatabaseToExcel = async () => {
  const workbook = new ExcelJS.Workbook();

  // Get all tables
  const tables = await new Promise((resolve, reject) => {
    db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.name));
      }
    );
  });

  // For each table, create a sheet
  for (const table of tables) {
    const worksheet = workbook.addWorksheet(table);

    // Get table rows
    const rows = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM ${table}`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (rows.length > 0) {
      // Add header row
      worksheet.addRow(Object.keys(rows[0]));

      // Add data rows
      rows.forEach(row => {
        worksheet.addRow(Object.values(row));
      });
    }
  }

  // Save workbook
  await workbook.xlsx.writeFile(excelPath);
  console.log(`✅ Database exported successfully to ${excelPath}`);
};

// Run the export
exportDatabaseToExcel()
  .then(() => db.close())
  .catch(err => {
    console.error("Error exporting database:", err);
    db.close();
  });
