import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim().length > 10);
};

// Create a singleton Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey && supabaseAnonKey.trim().length > 0 ? supabaseAnonKey : 'unconfigured',
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
 * Resend Signup Verification OTP via Supabase Auth (without passing any password)
 */
export const resendSupabaseSignupOtp = async (email) => {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase()
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
 * Note: Password reset strictly uses the clinic 6-digit email OTP system.
 * We do not dispatch any external reset links via Supabase.
 */
export const requestSupabasePasswordReset = async () => {
  return { message: 'OTP dispatched via clinic security service' };
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

export const extractSupabaseErrorFromUrl = () => {
  try {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    return (
      hashParams.get('error_description') ||
      searchParams.get('error_description') ||
      hashParams.get('error') ||
      searchParams.get('error') ||
      ''
    );
  } catch {
    return '';
  }
};

export const hasOAuthCallbackParams = () => {
  try {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return (
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('error=') ||
      search.includes('code=') ||
      search.includes('error=')
    );
  } catch {
    return false;
  }
};

let activeSyncPromise = null;
let lastSyncedAccessToken = null;

export const syncSupabaseSessionWithBackend = async (API, session) => {
  if (!session?.user || !session?.access_token) {
    return null;
  }

  // Ensure token is fresh if expired or within 10s of expiry
  let activeSession = session;
  if (activeSession.expires_at && activeSession.expires_at * 1000 <= Date.now() + 10_000) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed?.session?.access_token) {
      activeSession = refreshed.session;
    }
  }

  if (activeSyncPromise && lastSyncedAccessToken === activeSession.access_token) {
    return activeSyncPromise;
  }

  const user = activeSession.user;
  const userMeta = user.user_metadata || {};
  const detectedFullName = userMeta.full_name || userMeta.name || 'Valued Client';
  const detectedPhone = userMeta.phone || user.phone || '';
  const provider = user.app_metadata?.provider || 'google';

  lastSyncedAccessToken = activeSession.access_token;
  activeSyncPromise = (async () => {
    try {
      const res = await API.post('/auth/sync-supabase-user', {
        accessToken: activeSession.access_token,
        fullName: detectedFullName,
        phone: detectedPhone,
        provider
      });

      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role || 'CUSTOMER');
        localStorage.setItem('fullName', res.data.fullName || detectedFullName);
        localStorage.setItem('email', res.data.email || user.email || '');
        if (res.data.profilePicture) {
          localStorage.setItem('profilePicture', res.data.profilePicture);
        } else {
          localStorage.removeItem('profilePicture');
        }
        if (window.location.hash || window.location.search.includes('code=')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
      throw err;
    } finally {
      activeSyncPromise = null;
      lastSyncedAccessToken = null;
    }
  })();

  return activeSyncPromise;
};

export default supabase;
