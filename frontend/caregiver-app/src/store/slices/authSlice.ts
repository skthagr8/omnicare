interface AuthState {
  user: any | null;
  setUser: (user: any) => void;
  clearUser: () => void;
}

export const createAuthSlice = (set: any, get: any): AuthState => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
});