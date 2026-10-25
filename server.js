import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import mailgunTransport from 'nodemailer-mailgun-transport';
import QRCode from 'qrcode';
import path from "path";
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import { initDatabase, saveBooking, getAllBookings, isTicketScanned, recordTicketScan, getTicketByQRData, updatePaymentStatus, saveDandiyaBooking, getAllDandiyaBookings, updateDandiyaPaymentStatus, getDandiyaBookingById, deleteDandiyaBooking } from './database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Initialize database
initDatabase().catch(console.error);

// Middleware
app.use(cors());
app.use(express.json());

// Admin Authentication Middleware
const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // For now, we'll use a simple token check
  // In production, you might want to use JWT tokens
  if (token === 'admin-authenticated') {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
};

// Payment configuration
const PAYMENT_CONFIG = {
  upiUrl: process.env.PAYMENT_UPI_URL,
  whatsappNumber: process.env.SCREENSHOT_WHATSAPP_NUMBER
};

// Email Configuration with Mailgun Transport
const auth = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  }
};

const transporter = nodemailer.createTransport(mailgunTransport(auth));

// Email template function
const generateEmailHTML = (bookingData) => {
  const { bookingId, paymentDetails, tickets, customerDetails, ticketIndex } = bookingData;
  
  let ticketsHTML = '';
  tickets.forEach((ticket, index) => {
    let totalAdults;
    if (ticket.type === 'ladies') {
      totalAdults = 1;
    } else if (ticket.type === 'single') {
      totalAdults = 1;
    } else if (ticket.type === 'stall') {
      totalAdults = 2;
    } else if (ticket.type === 'children_only') {
      totalAdults = 0;
    } else {
      totalAdults = 1;
    }
    const adultDetails = [];
    const childrenNames = [];
    
    // Get adult details for this ticket
    for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
      const adultKey = `ticket_${index}_adult_${adultIndex}`;
      const adult = customerDetails[adultKey];
      if (adult) {
        adultDetails.push(`${adult.firstName} ${adult.lastName}`);
      }
    }
    
    // Get children names for this ticket
    for (let childIndex = 0; childIndex < ticket.children; childIndex++) {
      const childKey = `ticket_${index}_child_${childIndex}`;
      const child = customerDetails[childKey];
      if (child) {
        childrenNames.push(`${child.firstName} ${child.lastName}`);
      }
    }
    
    // Use the original ticket index if available, otherwise use the current index
    const displayTicketNumber = ticketIndex !== undefined ? ticketIndex + 1 : index + 1;
    
    const ticketTypeDisplay = ticket.type === 'ladies' ? 'Ladies Pass' : 
                             ticket.type === 'single' ? 'Single Pass' : 
                             ticket.type === 'stall' ? 'Stall Pass' : 
                             ticket.type === 'children_only' ? 'Children Only' : 'Pass';
    
    ticketsHTML += `
      <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ed7519;">
        <h3 style="color: #ed7519; margin: 0 0 10px 0;">${ticketTypeDisplay} #${displayTicketNumber}</h3>
        <p style="margin: 5px 0;"><strong>Adults:</strong> ${adultDetails.join(', ')}</p>
        ${childrenNames.length > 0 ? `<p style="margin: 5px 0;"><strong>Children:</strong> ${childrenNames.join(', ')}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Type:</strong> ${ticketTypeDisplay}</p>
        <p style="margin: 5px 0;"><strong>Children Included:</strong> ${ticket.children}</p>
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Confirmation - Asha Bani Dandiya Raas 2025</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ed7519, #ff8c42); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .success-icon { font-size: 48px; margin-bottom: 20px; }
        .booking-details { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .event-info { background: #e3f2fd; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .important { background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107; }
        .contact { background: #d4edda; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #28a745; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">🎉</div>
          <h1 style="margin: 0;">Booking Confirmed!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Welcome to Asha Bani Dandiya Raas 2025</p>
        </div>
        
        <div class="content">
          <p>Dear Customer,</p>
          
          <p>Your booking has been successfully confirmed! We're excited to welcome you to our grand celebration.</p>
          
          <div class="booking-details">
            <h3 style="color: #ed7519; margin-top: 0;">Booking Information</h3>
            <p><strong>Booking ID:</strong> ${bookingId}</p>
            <p><strong>Payment ID:</strong> ${paymentDetails.paymentId}</p>
            <p><strong>Amount Paid:</strong> ₹${paymentDetails.amount}</p>
            <p><strong>Payment Date:</strong> ${new Date(paymentDetails.timestamp).toLocaleDateString('en-IN')}</p>
            <p><strong>Your Ticket:</strong> ${tickets.length} ${tickets.length === 1 ? 'Pass' : 'Passes'}</p>
            <p><strong>Total Members in Your Ticket:</strong> ${tickets.reduce((total, ticket) => {
              const totalPeople = ticket.type === 'ladies' ? 1 : (ticket.type === 'single' ? 1 : 2);
              return total + totalPeople + ticket.children;
            }, 0)}</p>
          </div>
          
          <div class="event-info">
            <h3 style="color: #1976d2; margin-top: 0;">Event Details</h3>
            <p><strong>Event:</strong> Asha Bani Dandiya Raas 2025</p>
            <p><strong>Date:</strong> 30th September 2025</p>
            <p><strong>Time:</strong> 7:00 PM</p>
            <p><strong>Venue:</strong> Maharaja Agrasen Bhavan, Aggarwal Dharamshala</p>
          </div>
          
          <h3 style="color: #ed7519;">Your Tickets</h3>
          ${ticketsHTML}
          
          <div style="background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4caf50;">
            <h4 style="color: #2e7d32; margin: 0 0 10px 0;">📎 Digital Pass Attached</h4>
            <p style="margin: 0; color: #2e7d32;">
              Your digital pass with QR code has been attached to this email. 
              Please save it on your phone or print it for entry to the event.
            </p>
          </div>
          
          <div class="important">
            <h3 style="color: #856404; margin-top: 0;">Important Information</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Gates open at 6:30 PM, event starts at 7:00 PM</li>
              <li>Food and refreshments are included with your pass</li>
              <li>Parking is available at the venue</li>
              <li>Your digital pass is attached to this email</li>
            </ul>
          </div>
          
          <div class="contact">
            <h3 style="color: #155724; margin-top: 0;">Contact Information</h3>
            <p><strong>Phone:</strong> 8126106660 | 8439260603 | 7906443726</p>
            <p><strong>Venue:</strong> Maharaja Agrasen Bhavan, Aggarwal Dharamshala</p>
            <p><strong>Dandiya Sticks:</strong> 9897120123</p>
            <p><strong>Instagram:</strong> @asha_bani_dandiya_raas_5.0</p>
          </div>
          
          <p>We look forward to celebrating with you!</p>
          
          <p>Best regards,<br>
          Team Asha Bani Dandiya Raas 2025</p>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply to this email.</p>
          <p>For any queries, please contact us at the numbers provided above.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Function to generate pass image (exact same as frontend)
const generatePassImage = async (bookingData, ticketIndex) => {
  try {
    const { bookingId, tickets, customerDetails } = bookingData;
    const ticket = tickets[ticketIndex];
    
    // Generate QR code for this ticket
    const ticketCode = generateTicketCode(bookingId, ticketIndex);
    let totalAdults;
    if (ticket.type === 'ladies') {
      totalAdults = 1;
    } else if (ticket.type === 'single') {
      totalAdults = 1;
    } else if (ticket.type === 'couple') {
      totalAdults = 2; // Deprecated: couple not used; kept for backward compatibility
    } else if (ticket.type === 'stall') {
      totalAdults = 2; // Stall pass is for 2 adults
    } else {
      totalAdults = 1; // Default fallback
    }
    
    // Get adult details for this ticket
    const adultDetails = [];
    for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
      const adultKey = `ticket_${ticketIndex}_adult_${adultIndex}`;
      const adult = customerDetails[adultKey];
      if (adult) {
        adultDetails.push({
          name: `${adult.firstName} ${adult.lastName}`,
          mobile: adult.mobile
        });
      }
    }
    
    // Get children names for this ticket
    const childrenNames = [];
    for (let childIndex = 0; childIndex < ticket.children; childIndex++) {
      const childKey = `ticket_${ticketIndex}_child_${childIndex}`;
      const child = customerDetails[childKey];
      if (child) {
        childrenNames.push(`${child.firstName} ${child.lastName}`);
      }
    }
    
    // Create QR data
    const ticketTypeDisplay = ticket.type === 'ladies' ? 'Ladies Pass' : 
                             ticket.type === 'single' ? 'Single Pass' : 
                             ticket.type === 'stall' ? 'Stall Pass' : 
                             ticket.type === 'children_only' ? 'Children Only' : 'Pass';
    
    const qrData = `ASHA BANI DANDIYA RAAS 2025
Ticket ID: ${ticketCode}
Type: ${ticketTypeDisplay}
Adults: ${totalAdults}
Children: ${ticket.children}
Adult Names: ${adultDetails.map(adult => adult.name).join(', ')}
Children Names: ${childrenNames.join(', ')}
Mobile: ${adultDetails[0]?.mobile || ''}`;
    
    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Load template image
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join(__dirname, 'src', 'assets', 'pass-template.jpg');
    
    const templateImg = await loadImage(templatePath);
    
    // Create canvas with template dimensions
    const canvas = createCanvas(templateImg.width, templateImg.height);
    const ctx = canvas.getContext('2d');
    
    // Draw template background
    ctx.drawImage(templateImg, 0, 0);
    
    // Get member count for this ticket
    const memberCount = getMemberCount(ticket, ticketIndex);
    
    // Calculate positions (same as frontend)
    const ticketCodeX = Math.floor(canvas.width * 0.185);
    const ticketCodeY = Math.floor(canvas.height * 0.5);
    const memberCountY = Math.floor(canvas.height * 0.83);
    const qrX = Math.floor(canvas.width * 0.032);
    const qrY = Math.floor(canvas.height * 0.32);
    const qrSize = Math.floor(canvas.width * 0.13);
    
    // Draw ticket code (smaller font, rotated 90 degrees left)
    ctx.save();
    ctx.translate(ticketCodeX, ticketCodeY);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '30px "League Spartan", "Arial", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(ticketCode, 0, 0);
    ctx.restore();
    
    // Draw member count (bigger font, center aligned)
    const qrCenterX = qrX + qrSize / 2;
    
    // Draw member count (centered below QR code)
    const [line1, line2] = memberCount;
    
    ctx.font = '45px "League Spartan", "Arial", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    
    // First line at base Y position
    let line1Y = memberCountY;
    let lineSpacing = 50; // vertical gap between lines
    
    ctx.fillText(line1, qrCenterX, line1Y);
    
    // Second line if exists
    if (line2) {
      ctx.fillText(line2, qrCenterX, line1Y + lineSpacing);
    }
    
    // Reset shadow for QR code
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Load and place QR code with rounded corners
    const qrImage = await loadImage(qrCodeDataURL);
    
    // Draw QR code with rounded corners
    const borderRadius = 15;
    
    ctx.save();
    ctx.beginPath();
    
    // Create rounded rectangle path manually
    const x = qrX;
    const y = qrY;
    const width = qrSize;
    const height = qrSize;
    
    ctx.moveTo(x + borderRadius, y);
    ctx.lineTo(x + width - borderRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
    ctx.lineTo(x + width, y + height - borderRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
    ctx.lineTo(x + borderRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
    ctx.lineTo(x, y + borderRadius);
    ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    ctx.closePath();
    
    ctx.clip();
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    ctx.restore();
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');
    
    return {
      filename: `pass_${bookingId}_ticket_${ticketIndex + 1}.png`,
      content: buffer,
      contentType: 'image/png'
    };
  } catch (error) {
    console.error('Error generating pass image:', error);
    return null;
  }
};

// Helper function to get member count (same as frontend)
const getMemberCount = (ticket, ticketIndex) => {
  let totalPeople;
  if (ticket.type === 'ladies') {
    totalPeople = 1;
  } else if (ticket.type === 'single') {
    totalPeople = 1;
  } else if (ticket.type === 'stall') {
    totalPeople = 2; // Stall pass is for 2 adults
  } else if (ticket.type === 'children_only') {
    totalPeople = 0;
  } else {
    totalPeople = 1; // Default fallback
  }
  
  const line1 = `${totalPeople} Adult${totalPeople > 1 ? 's' : ''}`;
  const line2 = ticket.children > 0
    ? `${ticket.children} Child${ticket.children > 1 ? 'ren' : ''}`
    : null;
  return [line1, line2];
};

// Function to generate dandiya pass image
const generateDandiyaPassImage = async (dandiyaBookingData) => {
  try {
    // Handle both database format (booking_id, customer_name, amount) and API format (bookingId, customerName, totalAmount)
    const bookingId = dandiyaBookingData.bookingId || dandiyaBookingData.booking_id;
    if (!bookingId) {
      throw new Error('Booking ID is required for dandiya pass generation');
    }

    // Generate a unique Ticket ID for dandiya pass (same as event pass logic)
    // Always use ticketIndex = 0 for dandiya (since only one pass per booking)
    const ticketIndex = 0;
    const ticketId = generateTicketCode(bookingId, ticketIndex);

    // Create QR data for dandiya pass - store all required info
    const qrData = JSON.stringify({
      type: 'dandiya',
      ticketId,
      bookingId,
      customerName: dandiyaBookingData.customerName || dandiyaBookingData.customer_name,
      mobile: dandiyaBookingData.mobile,
      amount: dandiyaBookingData.totalAmount || dandiyaBookingData.amount
    });

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Load dandiya template image
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join(__dirname, 'src', 'assets', 'dandiya-pass-template.jpg');

    const templateImg = await loadImage(templatePath);

    // Create canvas with template dimensions
    const canvas = createCanvas(templateImg.width, templateImg.height);
    const ctx = canvas.getContext('2d');

    // Draw template background
    ctx.drawImage(templateImg, 0, 0);

    // Use updated positions and styles from test-dandiya-template.js
    const qrX = Math.floor(canvas.width * 0.25); // Right side
    const qrY = Math.floor(canvas.height * 0.46); // Top area
    const qrSize = Math.floor(canvas.width * 0.5); // 50% of width

    const idX = Math.floor(canvas.width * 0.4); // Left side
    const idY = Math.floor(canvas.height * 0.323); // Top area

    // Draw Ticket ID value (no label, white color, large font)
    ctx.font = '45px "League Spartan", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(ticketId, idX + 50, idY);

    // Load and place QR code
    const qrImage = await loadImage(qrCodeDataURL);

    // Draw QR code with rounded corners
    const borderRadius = 15;

    ctx.save();
    ctx.beginPath();

    // Create rounded rectangle path
    const x = qrX;
    const y = qrY;
    const width = qrSize;
    const height = qrSize;

    ctx.moveTo(x + borderRadius, y);
    ctx.lineTo(x + width - borderRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
    ctx.lineTo(x + width, y + height - borderRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
    ctx.lineTo(x + borderRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
    ctx.lineTo(x, y + borderRadius);
    ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    ctx.closePath();

    ctx.clip();
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    ctx.restore();

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    return {
      filename: `dandiya_pass_${bookingId}.png`,
      content: buffer,
      contentType: 'image/png'
    };
  } catch (error) {
    console.error('Error generating dandiya pass image:', error);
    return null;
  }
};

// Function to generate ticket code (same as in frontend)
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

// Function to send confirmation email to all customers
const sendConfirmationEmail = async (bookingData) => {
  try {
    const { tickets, customerDetails } = bookingData;
    const emailPromises = [];

    // Process each ticket and send emails to all customers in that ticket
    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
      const ticket = tickets[ticketIndex];
      const totalAdults = ticket.type === 'ladies' ? 1 : (ticket.type === 'single' ? 1 : 2);
      
      // Get all email addresses for this ticket
      const ticketEmails = new Set();
      
      // Add adult emails for this ticket
      for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
        const adultKey = `ticket_${ticketIndex}_adult_${adultIndex}`;
        const adult = customerDetails[adultKey];
        if (adult && adult.email && adult.email.trim()) {
          ticketEmails.add(adult.email.trim());
        }
      }
      
      // Create personalized booking data for this ticket
      const personalizedBookingData = {
        ...bookingData,
        tickets: [ticket], // Only include this specific ticket
        customerDetails: {},
        ticketIndex: ticketIndex // Add ticket index for reference
      };
      
      // Add only the customer details for this ticket
      for (let adultIndex = 0; adultIndex < totalAdults; adultIndex++) {
        const adultKey = `ticket_${ticketIndex}_adult_${adultIndex}`;
        const newKey = `ticket_0_adult_${adultIndex}`; // Rename to ticket_0 for template
        if (customerDetails[adultKey]) {
          personalizedBookingData.customerDetails[newKey] = customerDetails[adultKey];
        }
      }
      
      // Add children details for this ticket
      for (let childIndex = 0; childIndex < ticket.children; childIndex++) {
        const childKey = `ticket_${ticketIndex}_child_${childIndex}`;
        const newKey = `ticket_0_child_${childIndex}`; // Rename to ticket_0 for template
        if (customerDetails[childKey]) {
          personalizedBookingData.customerDetails[newKey] = customerDetails[childKey];
        }
      }
      
      // Generate pass image for this ticket
      const passImage = await generatePassImage(bookingData, ticketIndex);
      
      // Send email to each email address for this ticket
      // Each ticket gets its own email, even if the same email is used across tickets
      for (const email of ticketEmails) {
        const mailOptions = {
          from: process.env.MAILGUN_FROM_EMAIL,
          to: email,
          subject: '🎉 Booking Confirmed - Asha Bani Dandiya Raas 2025',
          html: generateEmailHTML(personalizedBookingData),
          attachments: passImage ? [passImage] : []
        };
        
        emailPromises.push(
          transporter.sendMail(mailOptions)
            .then(info => {
              console.log(`Email sent successfully to ${email} for ticket ${ticketIndex + 1}:`, info.messageId);
              return { success: true, email, ticketIndex, messageId: info.messageId };
            })
            .catch(error => {
              console.error(`Failed to send email to ${email} for ticket ${ticketIndex + 1}:`, error);
              return { success: false, email, ticketIndex, error: error.message };
            })
        );
      }
    }
    
    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);
    
    // Count successful and failed emails
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Email sending completed: ${successful} successful, ${failed} failed`);
    console.log(`Total emails sent: ${results.length}`);
    
    return successful > 0; // Return true if at least one email was sent successfully
  } catch (error) {
    console.error('Error sending emails:', error);
    return false;
  }
};

// Create Order API
// Create booking without payment (pending payment)
app.post('/api/create-booking', async (req, res) => {
  try {
    // Event booking deadline: 28 September 2025, 23:59:59
    const bookingDeadline = new Date('2025-09-28T23:59:59');
    const now = new Date();
    if (now > bookingDeadline) {
      return res.status(403).json({
        success: false,
        error: 'Event booking is closed. No new bookings are accepted.'
      });
    }

    const { bookingData } = req.body;
    if (!bookingData) {
      return res.status(400).json({
        success: false,
        error: 'Booking data is required'
      });
    }

    // Save booking to database with pending status
    try {
      await saveBooking(bookingData);
    } catch (dbError) {
      console.error('Error saving booking to database:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save booking'
      });
    }

    res.json({
      success: true,
      message: 'Booking created successfully. Please complete payment to receive your passes.',
      bookingId: bookingData.bookingId,
      paymentInfo: {
        upiUrl: PAYMENT_CONFIG.upiUrl,
        whatsappNumber: PAYMENT_CONFIG.whatsappNumber
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking'
    });
  }
});

// Create Dandiya Booking API
app.post('/api/create-dandiya-booking', async (req, res) => {
  try {
    const { bookingData } = req.body;
    
    if (!bookingData) {
      return res.status(400).json({
        success: false,
        error: 'Dandiya booking data is required'
      });
    }

    // Validate required fields
    if (!bookingData.bookingId || !bookingData.customerName || !bookingData.totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, customerName, totalAmount'
      });
    }

    // Save dandiya booking to database with pending status
    try {
      await saveDandiyaBooking(bookingData);
    } catch (dbError) {
      console.error('Error saving dandiya booking to database:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save dandiya booking'
      });
    }

    res.json({
      success: true,
      message: 'Dandiya booking created successfully. Please complete payment to receive your pass.',
      bookingId: bookingData.bookingId,
      paymentInfo: {
        upiUrl: PAYMENT_CONFIG.upiUrl,
        whatsappNumber: PAYMENT_CONFIG.whatsappNumber
      }
    });
  } catch (error) {
    console.error('Error creating dandiya booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create dandiya booking'
    });
  }
});

// Get payment configuration
app.get('/api/payment-config', (req, res) => {
  res.json({
    success: true,
    config: {
      upiUrl: PAYMENT_CONFIG.upiUrl,
      whatsappNumber: PAYMENT_CONFIG.whatsappNumber
    }
  });
});



// Admin endpoint to update dandiya payment status
app.post('/api/admin/update-dandiya-payment-status', requireAdminAuth, async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    
    if (!bookingId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and status are required'
      });
    }
    
    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be pending, paid, or cancelled'
      });
    }
    
    const result = await updateDandiyaPaymentStatus(bookingId, status);
    
    if (result.changes > 0) {
      res.json({
        success: true,
        message: `Dandiya payment status updated to ${status}`,
        bookingId,
        status
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Dandiya booking not found'
      });
    }
  } catch (error) {
    console.error('Error updating dandiya payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update dandiya payment status'
    });
  }
});

// Admin endpoint to delete dandiya booking
app.delete('/api/admin/delete-dandiya-booking/:bookingId', requireAdminAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required'
      });
    }
    
    const result = await deleteDandiyaBooking(bookingId);
    
    if (result.changes > 0) {
      res.json({
        success: true,
        message: 'Dandiya booking deleted successfully',
        bookingId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Dandiya booking not found'
      });
    }
  } catch (error) {
    console.error('Error deleting dandiya booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete dandiya booking'
    });
  }
});

// Admin endpoint to update payment status
app.post('/api/admin/update-payment-status', requireAdminAuth, async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    
    if (!bookingId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and status are required'
      });
    }
    
    if (!['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be pending, paid, or cancelled'
      });
    }
    
    const result = await updatePaymentStatus(bookingId, status);
    
    if (result.changes > 0) {
      res.json({
        success: true,
        message: `Payment status updated to ${status}`,
        bookingId,
        status
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  }
});

// Admin Authentication endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }
    
    // Check password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (password === adminPassword) {
      res.json({
        success: true,
        message: 'Login successful',
        token: 'admin-authenticated' // Simple token for now
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Incorrect password'
      });
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Download individual ticket pass endpoint (protected)
app.get('/api/admin/download-pass/:bookingId/:ticketIndex', requireAdminAuth, async (req, res) => {
  try {
    const { bookingId, ticketIndex } = req.params;
    const ticketIndexNum = parseInt(ticketIndex);
    
    // Get booking data from database
    const bookings = await getAllBookings();
    const booking = bookings.find(b => b.booking_id === bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    if (ticketIndexNum < 0 || ticketIndexNum >= booking.tickets.length) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }
    
    const ticket = booking.tickets[ticketIndexNum];
    
    // Prepare booking data in the format expected by generatePassImage
    const bookingData = {
      bookingId: booking.booking_id,
      tickets: booking.tickets.map(t => ({
        type: t.ticket_type,
        children: t.children_count || 0
      })),
      customerDetails: {}
    };
    
    // Get adults for this ticket
    const adults = ticket.adults || [];
    for (let adultIndex = 0; adultIndex < adults.length; adultIndex++) {
      const adultKey = `ticket_${ticketIndexNum}_adult_${adultIndex}`;
      const adult = adults[adultIndex];
      if (adult) {
        bookingData.customerDetails[adultKey] = {
          firstName: adult.first_name,
          lastName: adult.last_name,
          mobile: adult.mobile
        };
      }
    }
    
    // Add children details
    const children = ticket.children || [];
    for (let childIndex = 0; childIndex < children.length; childIndex++) {
      const childKey = `ticket_${ticketIndexNum}_child_${childIndex}`;
      const child = children[childIndex];
      if (child) {
        bookingData.customerDetails[childKey] = {
          firstName: child.first_name,
          lastName: child.last_name
        };
      }
    }
    
    // Generate pass image
    const passImage = await generatePassImage(bookingData, ticketIndexNum);
    
    if (!passImage) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate pass image'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', passImage.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${passImage.filename}"`);
    
    // Send the image buffer
    res.send(passImage.content);
    
  } catch (error) {
    console.error('Error downloading pass:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download pass'
    });
  }
});

// Download dandiya pass endpoint (protected)
app.get('/api/admin/download-dandiya-pass/:bookingId', requireAdminAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Get dandiya booking data from database
    const dandiyaBooking = await getDandiyaBookingById(bookingId);
    
    if (!dandiyaBooking) {
      return res.status(404).json({
        success: false,
        error: 'Dandiya booking not found'
      });
    }
    
    // Generate dandiya pass image
    const passImage = await generateDandiyaPassImage(dandiyaBooking);
    
    if (!passImage) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate dandiya pass image'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', passImage.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${passImage.filename}"`);
    
    // Send the image buffer
    res.send(passImage.content);
    
  } catch (error) {
    console.error('Error downloading dandiya pass:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download dandiya pass'
    });
  }
});

// Create offline dandiya booking (admin only)
app.post('/api/admin/create-dandiya-booking', requireAdminAuth, async (req, res) => {
  try {
  const bookingData = req.body.bookingData || {};
  const { customerName, mobile, totalAmount } = bookingData;
    
    // Validate required fields
    if (!customerName || !mobile || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Customer name, mobile, and total amount are required'
      });
    }
    
    // Generate booking ID
    const generateDandiyaBookingId = () => {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substr(2, 5).toUpperCase();
      return `DANDIYA${timestamp.slice(-6)}${random}`;
    };
    
    const bookingId = generateDandiyaBookingId();
    
    // Create dandiya booking data
    const dandiyaBookingData = {
      bookingId,
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      totalAmount,
      type: 'dandiya',
      timestamp: new Date().toISOString()
    };
    
    // Save dandiya booking to database
    await saveDandiyaBooking(dandiyaBookingData);
    
    // Generate dandiya pass
    const passImage = await generateDandiyaPassImage(dandiyaBookingData);
    
    res.json({
      success: true,
      message: 'Dandiya booking created successfully',
      booking: {
        bookingId,
        customerName,
        mobile,
        totalAmount,
        type: 'dandiya',
        passGenerated: !!passImage
      }
    });
    
  } catch (error) {
    console.error('Error creating offline dandiya booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create dandiya booking'
    });
  }
});

// Create offline booking (admin only)
app.post('/api/admin/create-offline-booking', requireAdminAuth, async (req, res) => {
  try {
    const { ticketType, childrenCount, adults, children, totalAmount, selectedPhase } = req.body;
    
    // Validate required fields
    if (!ticketType || !adults || !Array.isArray(adults) || !totalAmount || isNaN(totalAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields or invalid amount'
      });
    }
        
    // Validate adult count based on ticket type
    let expectedAdultCount;
    if (ticketType === 'ladies') {
      expectedAdultCount = 1;
    } else if (ticketType === 'single') {
      expectedAdultCount = 1;
    } else if (ticketType === 'stall') {
      expectedAdultCount = 2; // Stall pass is for 2 adults
    } else if (ticketType === 'children_only') {
      expectedAdultCount = 0; // Children only booking has no adults
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket type'
      });
    }
    
    if (adults.length !== expectedAdultCount) {
      return res.status(400).json({
        success: false,
        error: `Expected ${expectedAdultCount} adults for ${ticketType} ticket`
      });
    }
    
    // Validate children count
    if (childrenCount > 0 && (!children || children.length !== childrenCount)) {
      return res.status(400).json({
        success: false,
        error: 'Children count does not match provided children data'
      });
    }
    
    // Generate booking ID and ticket code
    const bookingId = 'OFFLINE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const ticketCode = 'OFFLINE_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Create booking data in the format expected by saveBooking
    const bookingData = {
      bookingId: bookingId,
      paymentDetails: {
        paymentId: 'OFFLINE_PAYMENT',
        orderId: 'OFFLINE_ORDER',
        amount: totalAmount,
        status: 'success',
        timestamp: new Date().toISOString()
      },
      tickets: [{
        type: ticketType,
        children: childrenCount || 0
      }],
      customerDetails: {}
    };
    
    // Add adult details to customerDetails
    adults.forEach((adult, adultIndex) => {
      const adultKey = `ticket_0_adult_${adultIndex}`;
      bookingData.customerDetails[adultKey] = {
        firstName: adult.first_name,
        lastName: adult.last_name,
        email: adult.email || '',
        mobile: adult.mobile || '',
        address: adult.address || ''
      };
    });
    
    // Add children details to customerDetails
    if (children && children.length > 0) {
      children.forEach((child, childIndex) => {
        const childKey = `ticket_0_child_${childIndex}`;
        bookingData.customerDetails[childKey] = {
          firstName: child.first_name,
          lastName: child.last_name
        };
      });
    }
    
    // Save to database
    await saveBooking(bookingData);
    
    // Send confirmation emails for each adult with email
    const allEmailsSent = new Set();
    
    // Get all adults with email addresses
    Object.keys(bookingData.customerDetails).forEach(key => {
      if (key.startsWith('ticket_0_adult_')) {
        const adult = bookingData.customerDetails[key];
        if (adult.email && adult.email.trim() && !allEmailsSent.has(adult.email.toLowerCase())) {
          allEmailsSent.add(adult.email.toLowerCase());
          
          // Send email asynchronously (don't await to avoid blocking)
          sendConfirmationEmail(bookingData, 0, adult.email).catch(emailError => {
            console.error('Error sending email:', emailError);
          });
        }
      }
    });
    
    res.json({
      success: true,
      booking: bookingData,
      message: 'Offline booking created successfully'
    });
    
  } catch (error) {
    console.error('Error creating offline booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create offline booking'
    });
  }
});

// Admin API endpoints (protected)
app.get('/api/admin/bookings', requireAdminAuth, async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
});

// Get all dandiya bookings (admin only)
app.get('/api/admin/dandiya-bookings', requireAdminAuth, async (req, res) => {
  try {
    const bookings = await getAllDandiyaBookings();
    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching dandiya bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dandiya bookings'
    });
  }
});

// QR Code Scanner API endpoints



app.post('/api/admin/scan-ticket', requireAdminAuth, async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR code data is required'
      });
    }
    
    // Parse QR data to check if it's a dandiya pass
    let qrDataParsed;
    try {
      qrDataParsed = JSON.parse(qrData);
    } catch (parseError) {
      // If it's not JSON, treat it as a regular ticket QR code
      qrDataParsed = null;
    }
    
    // Check if it's a dandiya pass
    if (qrDataParsed && qrDataParsed.type === 'dandiya') {
      // Handle dandiya pass scanning
      const { getDandiyaBookingById, isTicketScanned, recordTicketScan } = await import('./database.js');
      const bookingId = qrDataParsed.bookingId;
      const ticketId = qrDataParsed.ticketId;
      const dandiyaBooking = await getDandiyaBookingById(bookingId);
      if (!dandiyaBooking) {
        return res.status(404).json({
          success: false,
          error: 'Dandiya booking not found'
        });
      }
      // Check scan status for dandiya pass (use ticketId as code, ticketIndex=0)
      let scanRecord = await isTicketScanned(ticketId);
      let isAlreadyScanned = !!scanRecord;
      if (!isAlreadyScanned) {
        await recordTicketScan(bookingId, 0, ticketId);
        scanRecord = {
          scanned_at: new Date().toISOString(),
          scanned_by: 'admin'
        };
      }
      res.json({
        success: true,
        ticket: {
          type: 'dandiya',
          booking_id: dandiyaBooking.booking_id,
          customer_name: dandiyaBooking.customer_name,
          mobile: dandiyaBooking.mobile,
          amount: dandiyaBooking.amount,
          payment_status: dandiyaBooking.payment_status,
          created_at: dandiyaBooking.created_at,
          ticket_code: ticketId
        },
        isAlreadyScanned,
        scanRecord,
        message: isAlreadyScanned ? 'Dandiya pass already scanned' : 'Dandiya pass scanned successfully'
      });
      
    } else {
      // Handle regular ticket scanning
      const { getTicketByQRData, isTicketScanned, recordTicketScan } = await import('./database.js');
      
      // Get ticket details from QR data
      const ticket = await getTicketByQRData(qrData);
      
      // Check if ticket has already been scanned
      const existingScan = await isTicketScanned(ticket.ticket_code);
      
      let isAlreadyScanned = false;
      let scanRecord = null;
      
      if (existingScan) {
        isAlreadyScanned = true;
        scanRecord = existingScan;
      } else {
        // Record the scan
        await recordTicketScan(ticket.booking_id, ticket.ticket_index, ticket.ticket_code);
        scanRecord = {
          scanned_at: new Date().toISOString(),
          scanned_by: 'admin'
        };
      }
      
      res.json({
        success: true,
        ticket,
        isAlreadyScanned,
        scanRecord,
        message: isAlreadyScanned ? 'Ticket already scanned' : 'Ticket scanned successfully'
      });
    }
    
  } catch (error) {
    console.error('Error scanning ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scan ticket'
    });
  }
});

// Get scan history for a ticket
app.get('/api/admin/ticket-scans/:ticketCode', requireAdminAuth, async (req, res) => {
  try {
    const { ticketCode } = req.params;
    
    // Import the database functions
    const { db } = await import('./database.js');
    
    const scans = await new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM ticket_scans 
        WHERE ticket_code = ?
        ORDER BY scanned_at DESC
      `, [ticketCode], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    
    res.json({
      success: true,
      scans
    });
    
  } catch (error) {
    console.error('Error fetching scan history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scan history'
    });
  }
});



// Delete a ticket
app.delete('/api/admin/delete-ticket', requireAdminAuth, async (req, res) => {
  try {
    const { bookingId, ticketId } = req.body;
    
    if (!bookingId || !ticketId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and Ticket ID are required'
      });
    }
    
    // Import the database functions
    const { deleteTicket } = await import('./database.js');
    
    // Delete the ticket and all related data
    const result = await deleteTicket(bookingId, ticketId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found or could not be deleted'
      });
    }
    
    res.json({
      success: true,
      message: 'Ticket deleted successfully',
      changes: result.changes
    });
    
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete ticket'
    });
  }
});

// Serve React build
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// SPA fallback for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
