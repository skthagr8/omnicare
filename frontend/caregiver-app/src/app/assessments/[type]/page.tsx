'use client';

import { useParams } from 'next/navigation';
import AssessmentForm from '@/components/assessments/AssessmentForm';

export default function AssessmentFormPage() {
  const params = useParams();
  const assessmentType = params.type as string;

  return <AssessmentForm type={assessmentType} />;
}