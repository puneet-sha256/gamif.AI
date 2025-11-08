# Email OTP Verification

This document explains the email OTP verification feature implemented for user registration.

## Overview

Email OTP (One-Time Password) verification adds an extra layer of security to the user registration process. After creating an account, users must verify their email address using a 6-digit code sent to their inbox.

## User Flow

1. **Registration**: User enters username, email, and password
2. **OTP Email**: System generates and sends a 6-digit OTP to the email
3. **Verification**: User enters the OTP code on the verification screen
4. **Activation**: Email is verified and user can now login

## Technical Details

### OTP Properties
- **Length**: 6 digits
- **Expiry**: 10 minutes
- **Storage**: Temporarily stored in user record
- **Cleanup**: Removed after successful verification

### Security Features
- OTP expires after 10 minutes
- Email must be verified before login
- OTP cleared after verification
- XSS prevention in email content
- ReDoS-safe email validation

### Email Template
- Professional HTML design
- Responsive layout
- Clear instructions
- Security notice included
- Branding consistent with app

## API Endpoints

### POST /api/register
Creates new user and sends OTP email.

### POST /api/auth/verify-otp
Verifies OTP and activates account.

### POST /api/auth/resend-otp
Resends OTP if expired or not received.

### POST /api/login
Checks email verification before login.

## Configuration

Required environment variables:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

For Gmail, use an App Password instead of account password.

## Testing

Run the test script to verify the OTP flow:
```bash
node /tmp/test-complete-otp-flow.js
```

This tests:
- User registration
- OTP generation
- OTP verification
- Login after verification

## Troubleshooting

**OTP not received?**
- Check spam/junk folder
- Verify SMTP credentials
- Use resend OTP button

**OTP expired?**
- OTPs expire after 10 minutes
- Request a new OTP using resend

**Gmail not working?**
- Ensure 2-Step Verification is enabled
- Generate an App Password
- Use App Password, not account password
