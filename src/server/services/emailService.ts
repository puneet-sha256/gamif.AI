import nodemailer from 'nodemailer'
import { logger } from '../../utils/logger'

// Email configuration from environment variables
const EMAIL_USER = process.env.EMAIL_USER || ''
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || ''
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com'
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587')

// Create transporter
let transporter: nodemailer.Transporter | null = null

export function initializeEmailService() {
  try {
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      logger.warn('Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env')
      return false
    }

    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    })

    logger.success('Email service initialized')
    return true
  } catch (error) {
    logger.error('Failed to initialize email service:', error)
    return false
  }
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP email
export async function sendOTPEmail(email: string, otp: string, username: string): Promise<boolean> {
  if (!transporter) {
    logger.error('Email service not initialized')
    return false
  }

  try {
    const mailOptions = {
      from: `"Gamif.AI - Solo Leveling" <${EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - Gamif.AI Registration',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #3b82f6, #06b6d4);
              padding: 30px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              font-size: 22px;
              margin-bottom: 20px;
            }
            .content p {
              color: #666;
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .otp-box {
              background-color: #f0f9ff;
              border: 2px dashed #3b82f6;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #3b82f6;
              letter-spacing: 8px;
              margin: 10px 0;
            }
            .warning {
              background-color: #fff7ed;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
            }
            .warning p {
              margin: 0;
              color: #92400e;
              font-size: 14px;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px 30px;
              text-align: center;
              color: #9ca3af;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 GAMIF.AI - SOLO LEVELING</h1>
              <p style="margin: 10px 0 0 0;">Player System Verification</p>
            </div>
            <div class="content">
              <h2>Welcome, ${username}!</h2>
              <p>You're one step closer to starting your personal development journey.</p>
              <p>To complete your registration, please verify your email address using the OTP code below:</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your Verification Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Valid for 10 minutes</p>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong> Never share this code with anyone. Gamif.AI staff will never ask for your OTP code.</p>
              </div>
              
              <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>© 2025 Gamif.AI - Level Up Your Life</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    await transporter.sendMail(mailOptions)
    logger.success(`OTP email sent to ${email}`)
    return true
  } catch (error) {
    logger.error('Failed to send OTP email:', error)
    return false
  }
}
