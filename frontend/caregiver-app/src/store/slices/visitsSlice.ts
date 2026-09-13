interface VisitsState {
  visits: any[];
  setVisits: (visits: any[]) => void;
  updateVisit: (visitId: string, updates: any) => void;
}

export const createVisitsSlice = (set: any, get: any): VisitsState => ({
  visits: [],
  setVisits: (visits) => set({ visits }),
  updateVisit: (visitId, updates) => {
    const visits = get().visits.map((visit: any) =>
      visit.id === visitId ? { ...visit, ...updates } : visit
    );
    set({ visits });
  },
});