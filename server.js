import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import mailgunTransport from 'nodemailer-mailgun-transport';
import QRCode from 'qrcode';
import path from "path";
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import { initDatabase, saveBooking, getAllBookings } from './database.js';

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

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
    const totalAdults = ticket.type === 'single' ? 1 : 2;
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
    
    ticketsHTML += `
      <div style="background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ed7519;">
        <h3 style="color: #ed7519; margin: 0 0 10px 0;">${ticket.type === 'single' ? 'Single Pass' : 'Couple Pass'} #${displayTicketNumber}</h3>
        <p style="margin: 5px 0;"><strong>Adults:</strong> ${adultDetails.join(', ')}</p>
        ${childrenNames.length > 0 ? `<p style="margin: 5px 0;"><strong>Children:</strong> ${childrenNames.join(', ')}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Type:</strong> ${ticket.type === 'single' ? 'Single Pass' : 'Couple Pass'}</p>
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
              const totalPeople = ticket.type === 'single' ? 1 : 2;
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
    const totalAdults = ticket.type === 'single' ? 1 : 2;
    
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
    const qrData = `ASHA BANI DANDIYA RAAS 2025
Ticket ID: ${ticketCode}
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
  const totalPeople = ticket.type === 'single' ? 1 : 2;
  const line1 = `${totalPeople} Adult${totalPeople > 1 ? 's' : ''}`;
  const line2 = ticket.children > 0
    ? `${ticket.children} Child${ticket.children > 1 ? 'ren' : ''}`
    : null;
  return [line1, line2];
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
      const totalAdults = ticket.type === 'single' ? 1 : 2;
      
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
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, bookingId } = req.body;
    
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: bookingId,
      notes: {
        booking_id: bookingId,
        event: 'Asha Bani Dandiya Raas 2025',
        date: '30th September 2025'
      }
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

// Verify Payment API
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData } = req.body;
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
});

// Send Confirmation Email API (backup endpoint)
app.post('/api/send-confirmation-email', async (req, res) => {
  try {
    const { bookingData } = req.body;
    
    if (!bookingData) {
      return res.status(400).json({
        success: false,
        error: 'Booking data is required'
      });
    }

    // Save booking to database
    try {
      await saveBooking(bookingData);
    } catch (dbError) {
      console.error('Error saving booking to database:', dbError);
      // Continue with email sending even if database save fails
    }

    const emailSent = await sendConfirmationEmail(bookingData);
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Personalized confirmation emails sent successfully',
        details: {
          totalTickets: bookingData.tickets.length,
          totalEmails: bookingData.tickets.reduce((total, ticket) => {
            const totalAdults = ticket.type === 'single' ? 1 : 2;
            return total + totalAdults;
          }, 0)
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send confirmation emails'
      });
    }
  } catch (error) {
    console.error('Error sending confirmation emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send confirmation emails'
    });
  }
});

// Get Razorpay configuration endpoint
app.get('/api/razorpay-config', (req, res) => {
  res.json({
    success: true,
    config: {
      key: process.env.RAZORPAY_KEY_ID,
      currency: 'INR',
      name: 'Asha Bani Dandiya Raas 2025'
    }
  });
});

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

// Create offline booking (admin only)
app.post('/api/admin/create-offline-booking', requireAdminAuth, async (req, res) => {
  try {
    const { ticketType, childrenCount, adults, children, amount } = req.body;
    
    // Validate required fields
    if (!ticketType || !adults || !Array.isArray(adults)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Validate adult count
    const expectedAdultCount = ticketType === 'single' ? 1 : 2;
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
        amount: amount,
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
