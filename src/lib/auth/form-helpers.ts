export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Signup: ASCII letters and digits only (no symbols), 8+ characters */
export function isSignupPasswordOk(password: string): boolean {
  return /^[A-Za-z0-9]{8,}$/.test(password);
}

export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email or password does not match our records.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email first. Open the link in the message we sent when you signed up, then try signing in again.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (m.includes("password")) {
    return "Check your password format (letters and numbers only, at least 8 characters).";
  }
  if (m.includes("rate limit") || m.includes("too many requests") || m.includes("email rate limit")) {
    return "Confirmation emails are temporarily rate-limited. Wait a few minutes, then use \"Resend confirmation email\" below.";
  }
  if (
    m.includes("redirect") &&
    (m.includes("not allowed") || m.includes("disallowed") || m.includes("invalid url") || m.includes("invalid redirect"))
  ) {
    return "The confirmation redirect URL is not on Supabase’s allow list. In the dashboard, go to Authentication → URL configuration and add this environment’s https://…/auth/callback (including the port for local dev).";
  }
  if (
    m.includes("error sending") ||
    m.includes("unable to send") ||
    m.includes("sending confirmation") ||
    m.includes("confirmation email") ||
    m.includes("email provider") ||
    m.includes("smtp")
  ) {
    return "We could not send the confirmation email. Check Supabase → Project Settings → Authentication → SMTP (default mail can be blocked as spam) and Logs → Auth for errors.";
  }
  return "Something went wrong with authentication. Please try again in a moment.";
}
