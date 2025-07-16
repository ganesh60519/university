const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const pool = require('../db');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'University server is running',
    timestamp: new Date().toISOString()
  });
});

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Email configuration
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    console.log('⚠️  Email not configured - Running in demo mode');
    return null; // Return null if not configured for demo mode
  }
  
  // Determine email service
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  
  const config = {
    service: emailService,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };
  
  // For custom SMTP or other configurations
  if (emailService === 'custom') {
    config.host = process.env.EMAIL_HOST;
    config.port = process.env.EMAIL_PORT || 587;
    config.secure = process.env.EMAIL_SECURE === 'true';
    delete config.service;
  }
  
  try {
    const transporter = nodemailer.createTransport(config);
    console.log(`✅ Email transporter configured for ${emailService}`);
    
    // Test the connection (but don't block app startup)
    transporter.verify((error, success) => {
      if (error) {
        console.error('⚠️  Email transporter verification failed:', error.message);
        console.log('💡 Email will work in demo mode. Check EMAIL_SETUP_GUIDE.md for configuration help.');
      } else {
        console.log('✅ Email transporter verified successfully - ready to send emails!');
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error);
    return null;
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, name = 'User') => {
  const transporter = createTransporter();
  
  // If no transporter (demo mode), just log the OTP
  if (!transporter) {
    console.log(`📧 DEMO MODE - OTP for ${email}: ${otp}`);
    console.log('⚠️  To enable email sending, configure EMAIL_USER and EMAIL_PASS in .env file');
    return Promise.resolve(); // Simulate successful email sending
  }
  
  const mailOptions = {
    from: `"University App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset OTP - University App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">University App</h1>
            <p style="color: #6b7280; margin: 5px 0;">Password Reset Request</p>
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${name},</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password. Use the following 6-digit OTP to complete your password reset:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #2563eb; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            This OTP will expire in <strong>10 minutes</strong>. If you didn't request this password reset, please ignore this email.
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              For security reasons, never share this OTP with anyone. Our team will never ask for your OTP.
            </p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    return result;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw new Error('Failed to send OTP email. Please check your email configuration.');
  }
};

// Login endpoint (existing functionality)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check in students table
    let [rows] = await pool.query('SELECT * FROM students WHERE email = ?', [email]);
    let userType = 'student';

    // If not found in students, check faculty
    if (rows.length === 0) {
      [rows] = await pool.query('SELECT * FROM faculty WHERE email = ?', [email]);
      userType = 'faculty';
    }

    // If not found in faculty, check admin
    if (rows.length === 0) {
      [rows] = await pool.query('SELECT * FROM admin WHERE email = ?', [email]);
      userType = 'admin';
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in any table
    let user = null;
    let userType = null;

    // Check students
    let [rows] = await pool.query('SELECT * FROM students WHERE email = ?', [normalizedEmail]);
    if (rows.length > 0) {
      user = rows[0];
      userType = 'student';
    }

    // Check faculty if not found in students
    if (!user) {
      [rows] = await pool.query('SELECT * FROM faculty WHERE email = ?', [normalizedEmail]);
      if (rows.length > 0) {
        user = rows[0];
        userType = 'faculty';
      }
    }

    // Check admin if not found in faculty
    if (!user) {
      [rows] = await pool.query('SELECT * FROM admin WHERE email = ?', [normalizedEmail]);
      if (rows.length > 0) {
        user = rows[0];
        userType = 'admin';
      }
    }

    if (!user) {
      return res.json({ 
        success: false, 
        error: 'email_not_found',
        message: 'No account found with this email address' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      userType,
      attempts: 0
    });

    // Send OTP email
    try {
      await sendOTPEmail(normalizedEmail, otp, user.name);
      
      console.log(`🔢 OTP generated for ${normalizedEmail}: ${otp}`); // For development

      res.json({
        success: true,
        message: 'OTP sent to your email address successfully'
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // Don't delete the OTP from store in case of email failure
      // User might still be able to use it if they saw it in logs
      
      // Provide user-friendly error message
      let userMessage = 'Unable to send OTP email. Please check your internet connection and try again.';
      
      if (emailError.code === 'EAUTH') {
        userMessage = 'Email service temporarily unavailable. Please try again in a few minutes.';
      } else if (emailError.code === 'ECONNECTION' || emailError.code === 'ETIMEDOUT') {
        userMessage = 'Network connection error. Please check your internet connection and try again.';
      }
      
      res.status(500).json({
        success: false,
        error: userMessage,
        message: userMessage
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpData = otpStore.get(normalizedEmail);

    if (!otpData) {
      return res.json({ 
        success: false, 
        error: 'otp_not_found',
        message: 'Please reenter correct OTP.' 
      });
    }

    // Check if OTP is expired
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.json({ 
        success: false, 
        error: 'otp_expired',
        message: 'Please reenter correct OTP.' 
      });
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      otpStore.delete(normalizedEmail);
      return res.json({ 
        success: false, 
        error: 'too_many_attempts',
        message: 'Too many failed attempts. Please request a new OTP.' 
      });
    }

    // Verify OTP
    if (otpData.otp !== otp.trim()) {
      otpData.attempts += 1;
      otpStore.set(normalizedEmail, otpData);
      return res.json({ 
        success: false, 
        error: 'invalid_otp',
        message: 'Please reenter correct OTP.' 
      });
    }

    // Mark as verified
    otpData.verified = true;
    otpStore.set(normalizedEmail, otpData);

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpData = otpStore.get(normalizedEmail);

    if (!otpData) {
      return res.status(400).json({ error: 'OTP not found or expired. Please start the process again.' });
    }

    // Check if OTP is expired
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP has expired. Please start the process again.' });
    }

    // Check if OTP is verified and matches
    if (!otpData.verified || otpData.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid or unverified OTP. Please verify your OTP first.' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in appropriate table
    const tableName = otpData.userType === 'student' ? 'students' : 
                     otpData.userType === 'faculty' ? 'faculty' : 'admin';

    await pool.query(`UPDATE ${tableName} SET password = ? WHERE email = ?`, [hashedPassword, normalizedEmail]);

    // Clear OTP from store
    otpStore.delete(normalizedEmail);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// Clean up expired OTPs (run periodically)
setInterval(() => {
  const now = Date.now();
  for (const [email, otpData] of otpStore.entries()) {
    if (now > otpData.expiresAt) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

module.exports = router;