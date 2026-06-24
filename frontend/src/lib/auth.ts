const TOKEN_KEY = "lifeos-token";
const USER_KEY = "lifeos-user";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  xp?: number;
  level?: number;
  streak?: number;
  badges?: string[];
};

export const authStore = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser: (): AuthUser | null => {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  setUser: (user: AuthUser) => {
    const value = JSON.stringify(user);
    sessionStorage.setItem(USER_KEY, value);
    localStorage.setItem(USER_KEY, value);
  },
  clearUser: () => {
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
  },
  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
