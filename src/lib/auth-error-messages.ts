type AuthContext = 'sign-in' | 'sign-up' | 'onboarding' | 'profile' | 'general';

function normalize(raw?: string | null): string {
  return (raw ?? '').toLowerCase();
}

export function describeAuthError(rawMessage?: string | null, context: AuthContext = 'general'): string {
  const message = normalize(rawMessage);

  if (!message) {
    if (context === 'sign-in') {
      return 'We could not sign you in right now. Please check your details and try again.';
    }
    if (context === 'sign-up') {
      return 'We could not finish creating your account. Please check the information and try again.';
    }
    if (context === 'onboarding') {
      return 'We could not complete your onboarding. Please review the details and try again.';
    }
    if (context === 'profile') {
      return 'We could not save your profile details. Please check the information and try again.';
    }
    return 'Something went wrong. Please check your details and try again.';
  }

  if (message.includes('already') && (message.includes('exists') || message.includes('registered') || message.includes('used') || message.includes('taken'))) {
    return 'This looks like it may be because you already created an account with these details. Please sign in instead, or use a different email or phone number.';
  }

  if (message.includes('member of a chama') || message.includes('already a member')) {
    return 'This account is already connected to a chama. You can only join one chama at a time, so this step is blocked until that is resolved.';
  }

  if (message.includes('invalid') && (message.includes('code') || message.includes('otp') || message.includes('verification'))) {
    return 'The code may be wrong or it may have expired. Please request a new code and enter the latest one carefully.';
  }

  if (message.includes('expired') || message.includes('time out') || message.includes('timed out')) {
    return 'The verification code expired before it was used. Please request a fresh code and try again.';
  }

  if (message.includes('password') && (message.includes('weak') || message.includes('too short') || message.includes('at least 6') || message.includes('must contain'))) {
    return 'Your password needs to be stronger. Use at least 6 characters with a mix of letters and numbers.';
  }

  if (message.includes('email') && (message.includes('not found') || message.includes('does not exist') || message.includes('no account'))) {
    return 'We could not find an account with that email. Double-check the email address or create a new account.';
  }

  if (message.includes('phone') && (message.includes('not found') || message.includes('does not exist') || message.includes('no account'))) {
    return 'We could not find an account with that phone number. Double-check the number or create a new account.';
  }

  if (message.includes('not signed in') || message.includes('must be signed in') || message.includes('unauthorized')) {
    return 'Your session may have expired. Please sign in again and then continue.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('request failed') || message.includes('failed to fetch')) {
    return 'The connection was interrupted while we were trying to complete this step. Please try again in a moment.';
  }

  if (message.includes('rate limit') || message.includes('too many attempts') || message.includes('too many requests')) {
    return 'We saw too many attempts in a short time. Please wait a moment and try again.';
  }

  if (message.includes('duplicate') || message.includes('already created') || message.includes('already registered')) {
    return 'This may be because you already created an account with these details. Please sign in instead, or use different details.';
  }

  if (context === 'sign-in') {
    return 'We could not sign you in. Please check your email/phone and password, then try again. If you have multiple accounts, sign in to the correct one.';
  }

  if (context === 'sign-up') {
    return 'We could not finish creating your account. Please check the details and try again. If this is a duplicate account, sign in instead.';
  }

  if (context === 'onboarding') {
    return 'We could not complete your setup. This usually happens when your details are incomplete or you already have an account set up for this chama. Please review the information and try again.';
  }

  if (context === 'profile') {
    return 'We could not save your profile details. Please check that the information is correct and try again.';
  }

  return 'Something went wrong while we were setting this up. Please review your details and try again.';
}
