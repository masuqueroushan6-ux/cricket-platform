import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — inject access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  verifyOTP: (userId: string, otp: string) =>
    api.post('/auth/verify-otp', { userId, otp }),
  setupTOTP: (setupToken: string) =>
    api.post('/auth/setup-totp', {}, {
      headers: { Authorization: `Bearer ${setupToken}` },
    }),
  verifyTOTP: (totpCode: string, pendingToken: string) =>
    api.post('/auth/verify-totp', { totpCode, pendingToken }),
  resendOTP: (userId: string) =>
    api.post('/auth/resend-otp', { userId }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// ─── Public API ───────────────────────────────────────────────────────────────
export const publicAPI = {
  getTournaments: () => api.get('/public/tournaments'),
  getTournament: (id: string) => api.get(`/public/tournaments/${id}`),
  getLiveMatches: () => api.get('/public/matches/live'),
  getMatches: (tournamentId: string, status?: string) =>
    api.get(`/public/tournaments/${tournamentId}/matches${status ? `?status=${status}` : ''}`),
  getMatch: (id: string) => api.get(`/public/matches/${id}`),
  getTeams: (tournamentId: string) => api.get(`/public/tournaments/${tournamentId}/teams`),
  getTeam: (id: string) => api.get(`/public/teams/${id}`),
  getPlayers: (teamId: string) => api.get(`/public/teams/${teamId}/players`),
  getLeaderboard: (tournamentId: string, type: 'batting' | 'bowling' = 'batting') =>
    api.get(`/public/tournaments/${tournamentId}/leaderboard?type=${type}`),
};

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  // Tournaments
  getTournaments: () => api.get('/admin/tournaments'),
  updateTournament: (id: string, data: object) => api.put(`/admin/tournaments/${id}`, data),

  // Teams
  getTeams: (tournamentId: string) => api.get(`/admin/tournaments/${tournamentId}/teams`),
  createTeam: (data: object) => api.post('/admin/teams', data),
  updateTeam: (id: string, data: object) => api.put(`/admin/teams/${id}`, data),
  deleteTeam: (id: string) => api.delete(`/admin/teams/${id}`),

  // Players
  getPlayers: (teamId: string) => api.get(`/admin/teams/${teamId}/players`),
  createPlayer: (data: object) => api.post('/admin/players', data),
  updatePlayer: (id: string, data: object) => api.put(`/admin/players/${id}`, data),
  deletePlayer: (id: string) => api.delete(`/admin/players/${id}`),

  // Matches
  getMatches: (tournamentId: string) => api.get(`/admin/tournaments/${tournamentId}/matches`),
  createMatch: (data: object) => api.post('/admin/matches', data),
  recordToss: (matchId: string, data: object) => api.post(`/admin/matches/${matchId}/toss`, data),
  addBall: (matchId: string, data: object) => api.post(`/admin/matches/${matchId}/ball`, data),
  startInnings2: (matchId: string) => api.post(`/admin/matches/${matchId}/innings2/start`),
  setPlayers: (matchId: string, data: object) => api.put(`/admin/matches/${matchId}/players`, data),
};

// ─── Super Admin API ──────────────────────────────────────────────────────────
export const superAdminAPI = {
  getStats: () => api.get('/super-admin/stats'),
  getAdmins: () => api.get('/super-admin/admins'),
  createAdmin: (data: object) => api.post('/super-admin/admins', data),
  toggleAdmin: (id: string) => api.patch(`/super-admin/admins/${id}/toggle`),
  deleteAdmin: (id: string) => api.delete(`/super-admin/admins/${id}`),
  createTournament: (data: object) => api.post('/super-admin/tournaments', data),
  deleteTournament: (id: string) => api.delete(`/super-admin/tournaments/${id}`),
  assignAdmin: (tournamentId: string, userId: string) =>
    api.post(`/super-admin/tournaments/${tournamentId}/assign-admin`, { userId }),
  getAuditLogs: (page?: number) => api.get(`/super-admin/audit-logs?page=${page || 1}`),
};

export default api;
