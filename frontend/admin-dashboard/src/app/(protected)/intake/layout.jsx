'use client';

import { IntakeProvider } from '../../../components/intake/Intake';

// One provider for all steps, so the draft survives moving between /intake/step-N pages.
export default function IntakeLayout({ children }) {
  return <IntakeProvider>{children}</IntakeProvider>;
}
