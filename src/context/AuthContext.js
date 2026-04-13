import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';

const TOKEN_KEY = 'campuslyToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const storedToken = (await AsyncStorage.getItem(TOKEN_KEY)) || '';
        if (!storedToken) {
          setLoading(false);
          return;
        }

        setToken(storedToken);
        const me = await apiRequest('/api/auth/me', { token: storedToken });
        setUser(me.user || null);
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  const refreshMe = async (currentToken = token) => {
    if (!currentToken) return null;
    const me = await apiRequest('/api/auth/me', { token: currentToken });
    setUser(me.user || null);
    return me.user || null;
  };

  const login = async ({ email, password }) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (!data.token) {
      throw new Error('Login succeeded but token is missing');
    }

    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user || null);

    return data;
  };

  const register = async (payload) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: payload,
    });
  };

  const verifyOtp = async ({ email, otp }) => {
    const data = await apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: { email, otp },
    });

    if (!data.token) {
      throw new Error('OTP verification succeeded but token is missing');
    }

    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user || null);

    return data;
  };

  const resendOtp = async ({ email }) => {
    return apiRequest('/api/auth/resend-otp', {
      method: 'POST',
      body: { email },
    });
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
  };

  const value = useMemo(
    () => ({
      loading,
      token,
      user,
      login,
      register,
      verifyOtp,
      resendOtp,
      refreshMe,
      logout,
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
