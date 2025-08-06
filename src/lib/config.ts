// Application URLs and configuration
const isProd = window.location.hostname === 'app.gradelab.io';
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Supabase project URL
const supabaseProjectUrl = 'https://mfnhgldghrnjrwlhtvor.supabase.co';

export const config = {
  // Base application URL
  appUrl: isProd ? 'https://app.gradelab.io' : 'http://localhost:8080',
  
  // Auth redirect URLs
  auth: {
    // Default redirect after login
    defaultRedirect: '/dashboard',
    
    // OAuth redirect URL (for Google sign-in)
    oauthRedirect: isProd 
      ? 'https://app.gradelab.io/dashboard'
      : `${window.location.origin}/dashboard`,
    
    // Sign up confirmation redirect
    signUpRedirect: isProd
      ? 'https://app.gradelab.io/dashboard'
      : `${window.location.origin}/dashboard`,
    
    // Password reset URLs
    passwordReset: {
      // URL to send in email for password reset
      requestUrl: isProd
        ? 'https://app.gradelab.io/reset-password'
        : `${window.location.origin}/reset-password`,
      
      // Verification endpoint
      verifyUrl: `${supabaseProjectUrl}/auth/v1/verify`,
      
      // Page to show password reset form
      resetPage: '/reset-password',
    },

    // Email templates site URL
    siteUrl: isProd ? 'app.gradelab.io' : 'localhost:8080'
  },
  
  // Environment checks
  env: {
    isProd,
    isDev,
  }
}; 