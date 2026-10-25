import { createCanvas, loadImage } from 'canvas';
import QRCode from 'qrcode';

// Test script for dandiya template positioning
const testDandiyaTemplate = async () => {
  try {
    // Load the dandiya template image
    const templatePath = './src/assets/dandiya-pass-template.jpg';
    const template = await loadImage(templatePath);
    
    // Create canvas with template dimensions
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the template
    ctx.drawImage(template, 0, 0);
    
    // Test data
    const testData = {
      bookingId: 'DANDIYA123456',
      customerName: 'John Doe',
      mobile: '9876543210',
      amount: 50
    };

    // Generate Ticket ID (exact hash logic from server.js)
    function generateTicketCode(bookingId, ticketIndex) {
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
    }
    const ticketIndex = 0;
    const ticketId = generateTicketCode(testData.bookingId, ticketIndex);

    // Generate QR code with all required fields
    const qrData = JSON.stringify({
      type: 'dandiya',
      ticketId,
      bookingId: testData.bookingId,
      customerName: testData.customerName,
      mobile: testData.mobile,
      amount: testData.amount
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 500,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Load QR code image
    const qrImage = await loadImage(qrCodeDataURL);

    // Use same positions as server.js
    const qrX = Math.floor(canvas.width * 0.25); // Right side
    const qrY = Math.floor(canvas.height * 0.46); // Top area
    const qrSize = Math.floor(canvas.width * 0.5); // 20% of width

    const idX = Math.floor(canvas.width * 0.4); // Left side
    const idY = Math.floor(canvas.height * 0.323); // Top area

    // Create canvas for preview
    const previewCanvas = createCanvas(template.width, template.height);
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.drawImage(template, 0, 0);

    // Draw Ticket ID label and value
    previewCtx.font = '45px "League Spartan", "Arial", sans-serif';
    previewCtx.fillStyle = '#ffffff';
    previewCtx.textAlign = 'left';
    previewCtx.fillText(ticketId, idX + 50, idY);

    // Draw QR code with rounded corners
    const borderRadius = 15;
    previewCtx.save();
    previewCtx.beginPath();
    const x = qrX;
    const y = qrY;
    const width = qrSize;
    const height = qrSize;
    previewCtx.moveTo(x + borderRadius, y);
    previewCtx.lineTo(x + width - borderRadius, y);
    previewCtx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
    previewCtx.lineTo(x + width, y + height - borderRadius);
    previewCtx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
    previewCtx.lineTo(x + borderRadius, y + height);
    previewCtx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
    previewCtx.lineTo(x, y + borderRadius);
    previewCtx.quadraticCurveTo(x, y, x + borderRadius, y);
    previewCtx.closePath();
    previewCtx.clip();
    previewCtx.drawImage(qrImage, x, y, width, height);
    previewCtx.restore();

    // Save preview image
    const fs = await import('fs');
    const buffer = previewCanvas.toBuffer('image/png');
    fs.writeFileSync('dandiya-pass-preview.png', buffer);

    console.log('Dandiya pass preview image generated as dandiya-pass-preview.png');
    
  } catch (error) {
    console.error('Error testing dandiya template:', error);
  }
};

// Run the test
testDandiyaTemplate();
