export const ENDPOINTS = {
  todaySchedule: '/scheduling/sessions/today',          // verify
  client: (id: string) => `/clients/${id}`,             // verify
  visitTasks: (id: string) => `/tasks/sessions/${id}`,  // verify
  visitAssessments: (id: string) => `/assessments/sessions/${id}`, // verify
  visitMedications: (id: string) => `/medications/sessions/${id}`, // verify
  observations: '/assessments/observations',
} as const;