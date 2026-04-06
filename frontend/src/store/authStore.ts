import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  // Pending 2FA state
  pendingUserId: string | null;
  pendingToken: string | null;
  loginStep: 'credentials' | 'verify_otp' | 'verify_totp' | 'setup_totp';

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setPendingOTP: (userId: string) => void;
  setPendingTOTP: (pendingToken: string) => void;
  setPendingTOTPSetup: (setupToken: string) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      pendingUserId: null,
      pendingToken: null,
      loginStep: 'credentials',

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          pendingUserId: null,
          pendingToken: null,
          loginStep: 'credentials',
        });
      },

      setPendingOTP: (userId) => {
        set({ pendingUserId: userId, loginStep: 'verify_otp' });
      },

      setPendingTOTP: (pendingToken) => {
        set({ pendingToken, loginStep: 'verify_totp' });
      },

      setPendingTOTPSetup: (setupToken) => {
        set({ pendingToken: setupToken, loginStep: 'setup_totp' });
      },

      updateTokens: (accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ accessToken, refreshToken });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          pendingUserId: null,
          pendingToken: null,
          loginStep: 'credentials',
        });
      },
    }),
    {
      name: 'cricket-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
