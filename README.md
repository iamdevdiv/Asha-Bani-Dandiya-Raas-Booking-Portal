# Asha Bani Dandiya Raas 2025 Booking Portal

A ticketing, pass generation, and entry management portal built for the Asha Bani Dandiya Raas 2025 event in Saharanpur. The application handles direct UPI payments, automated digital pass generation with verification QR codes, offline counter bookings, and on-site entry scanning.

## Live Website

Production URL: [ashabani.iamdevdiv.com](https://ashabani.iamdevdiv.com)

## Features

- **Online Booking**: Multi-tier pass selection (Ladies Pass, Couple Pass, Stall Pass, Dandiya Sticks) with real-time pricing phases.
- **Direct UPI Payments**: Dynamic UPI QR code generation linked to booking reference numbers, with WhatsApp screenshot confirmation.
- **Pass Generation**: Server-rendered entry passes using Node Canvas, generating unique ticket codes and verification QR codes onto branded event artwork.
- **Email Delivery**: Automated ticket pass dispatch via Mailgun and Nodemailer.
- **Admin Dashboard**: Protected management panel to monitor bookings, record offline counter sales, view revenue metrics, and export attendee lists.
- **Entry Scanner**: Integrated camera scanner in the admin panel to validate ticket QR codes at the gate and prevent duplicate entries.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Vite, React Router
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Pass Engine**: Canvas, QRCode
- **Email Delivery**: Nodemailer with Mailgun Transport
- **QR Scanner**: HTML5-QRCode, ZXing

## Architecture Overview

```
User Selects Pass -> Booking Created (Pending) -> UPI QR Generated
                                                      |
User Submits Verification <----------------------------+
       |
Admin Confirms Payment / Direct Auto-confirm
       |
Node Canvas Renders Pass Image + Ticket Code + QR Code
       |
Mailgun Sends Email with Attached Pass -> Attendee Receives Ticket
                                                      |
At Event Gate: Admin Scans QR via /admin -> Validates & Flags as Scanned
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/iamdevdiv/Asha-Bani-Dandiya-Raas-Booking-Portal.git
   cd Asha-Bani-Dandiya-Raas-Booking-Portal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your Mailgun, UPI, and admin credentials.

4. Start development server:
   ```bash
   npm run dev:full
   ```
   This runs the Express backend on port 5000 and the Vite frontend dev server concurrently.

### Scripts

- `npm run dev` - Start Vite frontend development server
- `npm run server` - Start Express backend server
- `npm run dev:full` - Run backend and frontend concurrently
- `npm run build` - Build production frontend assets
- `npm run export:ladies` - Export attendee records to CSV

## License

This project is licensed under the [MIT License](LICENSE).
