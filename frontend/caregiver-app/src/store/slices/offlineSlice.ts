interface OfflineState {
  isOnline: boolean;
  pendingActions: any[];
  setOnlineStatus: (isOnline: boolean) => void;
  setPendingActions: (actions: any[]) => void;
}

export const createOfflineSlice = (set: any, get: any): OfflineState => ({
  isOnline: true,
  pendingActions: [],
  setOnlineStatus: (isOnline) => set({ isOnline }),
  setPendingActions: (pendingActions) => set({ pendingActions }),
});