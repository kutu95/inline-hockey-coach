# Bot Protection Setup Guide

This guide explains how to set up bot protection for the inline hockey coach application.

## Features Added

### 1. reCAPTCHA v3 Protection
- **Invisible reCAPTCHA**: No user interaction required
- **Score-based protection**: Google provides a score (0.0 - 1.0) indicating bot likelihood
- **Action-based**: Different actions for login vs password reset

### 2. Rate Limiting
- **Login attempts**: 5 attempts per 15 minutes per email/IP
- **Password reset**: 3 attempts per hour per email
- **Client-side enforcement**: Immediate feedback to users

### 3. Honeypot Fields
- **Hidden form fields**: Catch basic bots that fill all form fields
- **CSS hidden**: Invisible to users but visible to bots
- **No JavaScript required**: Works even if JavaScript is disabled

## Setup Instructions

### 1. Get reCAPTCHA v3 Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" to add a new site
3. Choose "reCAPTCHA v3"
4. Add your domain(s):
   - `localhost` (for development)
   - Your production domain
5. Accept the terms and click "Submit"
6. Copy the **Site Key** and **Secret Key**

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# reCAPTCHA Configuration
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

### 3. Server-Side Verification (Recommended)

For maximum security, verify reCAPTCHA tokens on the server side. You can do this in your Supabase Edge Functions:

```javascript
// Example Edge Function for verifying reCAPTCHA
const verifyRecaptcha = async (token) => {
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
  })
  
  const data = await response.json()
  return data.success && data.score > 0.5 // Accept scores above 0.5
}
```

### 4. Supabase RLS Policies

Consider adding rate limiting at the database level:

```sql
-- Example: Limit failed login attempts
CREATE OR REPLACE FUNCTION check_login_attempts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has too many failed attempts
  -- Implementation depends on your specific needs
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Security Benefits

### 1. **Prevents Automated Attacks**
- Brute force password attempts
- Credential stuffing attacks
- Account enumeration

### 2. **Reduces Server Load**
- Blocks malicious requests early
- Prevents resource exhaustion
- Protects against DDoS

### 3. **Improves User Experience**
- Invisible protection (no CAPTCHA puzzles)
- Clear feedback on rate limits
- Maintains accessibility

## Monitoring and Maintenance

### 1. **Monitor reCAPTCHA Scores**
- Track average scores over time
- Adjust thresholds if needed
- Monitor for false positives

### 2. **Review Rate Limiting**
- Check if limits are appropriate for your users
- Adjust based on legitimate use patterns
- Monitor for legitimate users being blocked

### 3. **Update Security Measures**
- Keep reCAPTCHA keys secure
- Rotate keys periodically
- Monitor for new attack vectors

## Troubleshooting

### Common Issues

1. **reCAPTCHA not loading**
   - Check if site key is correct
   - Verify domain is whitelisted
   - Check browser console for errors

2. **Rate limiting too strict**
   - Adjust limits in `src/utils/rateLimiter.js`
   - Consider different limits for different user types

3. **False positives**
   - Review reCAPTCHA score thresholds
   - Check for legitimate automation tools
   - Consider whitelisting known good IPs

## Additional Recommendations

### 1. **Server-Side Rate Limiting**
- Implement rate limiting in Supabase Edge Functions
- Use Redis or similar for distributed rate limiting
- Consider IP-based blocking for repeated violations

### 2. **Monitoring and Alerting**
- Set up alerts for unusual login patterns
- Monitor for geographic anomalies
- Track failed authentication attempts

### 3. **Multi-Factor Authentication**
- Consider adding MFA for admin accounts
- Use SMS or email verification for sensitive operations
- Implement backup codes for account recovery

## Testing

### 1. **Test Bot Protection**
- Try rapid-fire login attempts
- Test with automated tools
- Verify rate limiting works correctly

### 2. **Test User Experience**
- Ensure legitimate users aren't blocked
- Test on different devices and browsers
- Verify accessibility compliance

### 3. **Test Error Handling**
- Test with invalid reCAPTCHA tokens
- Verify error messages are user-friendly
- Test recovery mechanisms 