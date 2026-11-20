import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://atupxmpyhednaigfvgfi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim().length > 10);
};

// Create a singleton Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey && supabaseAnonKey.trim().length > 0 ? supabaseAnonKey : 'sb_anon_placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit'
    }
  }
);

/**
 * Trigger Google OAuth SSO with Supabase
 * Redirects user to Google OAuth consent screen and returns to clinic auth suite
 */
export const signInWithGoogleSSO = async (redirectPath = '/auth') => {
  const origin = window.location.origin;
  const redirectTo = `${origin}${redirectPath}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) throw error;
  return data;
};

/**
 * Self-Registration via Supabase Auth
 * Dispatches 6-digit confirmation OTP email directly via Supabase HTTPS mailer
 */
export const signUpWithSupabase = async (email, password, fullName, phone) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : ''
      }
    }
  });

  if (error) throw error;
  return data;
};

/**
 * Verify 6-digit Email OTP via Supabase Auth
 */
export const verifySupabaseOtp = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'signup'
  });

  if (error) throw error;
  return data;
};

/**
 * Password Recovery via Supabase Auth
 * Dispatches secure password recovery link to user's inbox
 */
export const requestSupabasePasswordReset = async (email, redirectPath = '/client/reset-password') => {
  const origin = window.location.origin;
  const redirectTo = `${origin}${redirectPath}`;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo
  });

  if (error) throw error;
  return data;
};

/**
 * Update Password in Supabase Auth
 */
export const updateSupabasePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
  return data;
};

export default supabase;
