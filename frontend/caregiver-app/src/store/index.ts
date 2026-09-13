import { create } from 'zustand';
import { createAuthSlice } from './slices/authSlice';
import { createVisitsSlice } from './slices/visitsSlice';
import { createOfflineSlice } from './slices/offlineSlice';

export const useStore = create((set, get) => ({
  ...createAuthSlice(set, get),
  ...createVisitsSlice(set, get),
  ...createOfflineSlice(set, get),
}));