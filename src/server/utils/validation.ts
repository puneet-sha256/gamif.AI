import type {
  RegisterRequest,
  LoginRequest,
  ExperienceUpdateRequest,
  ShardsUpdateRequest,
  SendOtpRequest,
  VerifyOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from '../../shared/types'

// Server-specific validation helper functions
export function isValidString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRegisterRequest(body: any): body is RegisterRequest {
  return (
    isValidString(body.username) &&
    isValidString(body.email) &&
    isValidEmail(body.email) &&
    isValidString(body.password) &&
    body.password.length >= 6
  );
}

export function validateLoginRequest(body: any): body is LoginRequest {
  return (
    isValidString(body.email) &&
    isValidEmail(body.email) &&
    isValidString(body.password)
  );
}

export function validateExperienceUpdateRequest(body: any): body is ExperienceUpdateRequest {
  return (
    isValidString(body.sessionId) &&
    (body.strengthDelta === undefined || isValidNumber(body.strengthDelta)) &&
    (body.intelligenceDelta === undefined || isValidNumber(body.intelligenceDelta)) &&
    (body.charismaDelta === undefined || isValidNumber(body.charismaDelta))
  );
}

export function validateSendOtpRequest(body: any): body is SendOtpRequest {
  return (
    isValidString(body.username) &&
    isValidString(body.email) &&
    isValidEmail(body.email) &&
    isValidString(body.password) &&
    body.password.length >= 6
  );
}

export function validateVerifyOtpRequest(body: any): body is VerifyOtpRequest {
  return (
    isValidString(body.email) &&
    isValidEmail(body.email) &&
    isValidString(body.otp) &&
    /^\d{6}$/.test(body.otp)
  );
}

export function validateForgotPasswordRequest(body: any): body is ForgotPasswordRequest {
  return (
    isValidString(body.email) &&
    isValidEmail(body.email)
  );
}

export function validateResetPasswordRequest(body: any): body is ResetPasswordRequest {
  return (
    isValidString(body.email) &&
    isValidEmail(body.email) &&
    isValidString(body.otp) &&
    /^\d{6}$/.test(body.otp) &&
    isValidString(body.newPassword) &&
    body.newPassword.length >= 6
  );
}

export function validateShardsUpdateRequest(body: any): body is ShardsUpdateRequest {
  return (
    isValidString(body.sessionId) &&
    isValidNumber(body.shardsDelta) &&
    (body.reason === undefined || isValidString(body.reason))
  );
}