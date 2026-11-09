import { redirect } from 'next/navigation';

// No landing UI: the caregiver's home is the shift dashboard.
export default function HomePage() {
  redirect('/dashboard');
}
