const AUTH_KEYS = ['token', 'role', 'fullName', 'email', 'profilePicture'];

export const clearAuthSession = () => {
  AUTH_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors in restricted environments
    }
  });
};

export const isJwtTokenValid = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  try {
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64Url.padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (typeof payload.exp === 'number') {
      const nowSeconds = Math.floor(Date.now() / 1000);
      return payload.exp > nowSeconds + 5;
    }
    return Boolean(payload.sub);
  } catch {
    return false;
  }
};

export const getAuthenticatedSession = () => {
  const token = localStorage.getItem('token');
  const role = (localStorage.getItem('role') || '').toUpperCase();
  if (!token || !isJwtTokenValid(token)) {
    if (token) {
      clearAuthSession();
    }
    return { token: null, role: '' };
  }
  return { token, role };
};

export const getTodayLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
