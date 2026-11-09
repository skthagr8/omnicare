'use client';

import { notFound, useParams } from 'next/navigation';
import { IntakeStep, TOTAL_STEPS } from '../../../../components/intake/Intake';

// Handles /intake/step-1 … /intake/step-5.
export default function IntakeStepPage() {
  const { step } = useParams();
  const match = /^step-(\d)$/.exec(step ?? '');
  const n = match ? Number(match[1]) : NaN;
  if (!(n >= 1 && n <= TOTAL_STEPS)) notFound();
  return <IntakeStep step={n} />;
}
