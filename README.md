# Asha Bani Dandiya Raas Booking Portal

A complete event booking system with online payments, offline booking management, and automated pass generation. This project was primarily built using Cursor over a couple of days, with some parts completed manually when Cursor wasn't performing optimally.

## 🌐 Live Demo

**Live Application:** [ashabani.iamdevdiv.com](https://ashabani.iamdevdiv.com)

## ✨ Features

- **Online Booking**: Razorpay payment integration
- **Offline Booking**: Admin panel for cash payments
- **Email Automation**: Automatic confirmation emails with passes
- **Pass Generation**: QR-coded digital passes
- **Admin Panel**: Complete booking management system
- **Mobile Responsive**: Works on all devices

## 🚀 Quick Setup

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iamdevdiv/Asha-Bani-Dandiya-Raas-Booking-Portal
   cd Asha-Bani-Dandiya-Raas-Booking-Portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```env
   # API Configuration
   VITE_API_BASE_URL=https://your-domain.com

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_secret_key

   # Mailgun Configuration
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=your-domain.com
   MAILGUN_FROM_EMAIL=noreply@your-domain.com

   # Admin Configuration
   ADMIN_PASSWORD=your_admin_password
   ```

4. **Start development server**
   ```bash
   npm run dev:full
   ```

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   ├── context/            # React context for state management
│   └── config/             # Configuration files
├── server.js               # Express.js backend server
├── database.js             # SQLite database operations
└── public/                 # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start frontend development server
- `npm run server` - Start backend server
- `npm run dev:full` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Payment**: Razorpay
- **Email**: Mailgun
- **Pass Generation**: Canvas, QRCode

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
