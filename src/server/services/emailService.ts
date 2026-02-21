import { EmailClient } from '@azure/communication-email'
import { logger } from '../../utils/logger'

const connectionString = process.env.ACS_CONNECTION_STRING || ''
const senderAddress = process.env.ACS_SENDER_ADDRESS || ''

let emailClient: EmailClient | null = null

function getEmailClient(): EmailClient {
  if (!emailClient) {
    if (!connectionString) {
      throw new Error('ACS_CONNECTION_STRING environment variable is not set')
    }
    emailClient = new EmailClient(connectionString)
  }
  return emailClient
}

export async function sendOtpEmail(
  toEmail: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!senderAddress) {
      logger.error('ACS_SENDER_ADDRESS environment variable is not set')
      return { success: false, error: 'Email sender not configured' }
    }

    const client = getEmailClient()

    const message = {
      senderAddress,
      recipients: {
        to: [{ address: toEmail }]
      },
      content: {
        subject: `${otp} — Your GAMIF.AI Verification Code`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #f8fafc;">
            <div style="background: white; border-radius: 12px; padding: 40px 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 28px; font-weight: 800; margin: 0; background: linear-gradient(135deg, #3b82f6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                  GAMIF.AI
                </h1>
                <p style="color: #3b82f6; font-size: 12px; font-weight: 600; letter-spacing: 2px; margin: 4px 0 0; text-transform: uppercase;">
                  Life Operating System
                </p>
              </div>

              <p style="color: #334155; font-size: 16px; margin: 0 0 8px; text-align: center;">
                Your verification code is:
              </p>

              <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e293b; background: #f1f5f9; padding: 16px 32px; border-radius: 8px; border: 2px solid #e2e8f0;">
                  ${otp}
                </span>
              </div>

              <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0 0 24px;">
                This code expires in <strong>5 minutes</strong>.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
          </div>
        `
      }
    }

    const poller = await client.beginSend(message)
    const result = await poller.pollUntilDone()

    if (result.status === 'Succeeded') {
      logger.custom('📧', `OTP email sent to ${toEmail}`)
      return { success: true }
    } else {
      logger.error('ACS email send failed:', result.error)
      return { success: false, error: result.error?.message || 'Email send failed' }
    }
  } catch (err) {
    logger.error('Failed to send OTP email:', err)
    return { success: false, error: 'Failed to send verification email' }
  }
}
