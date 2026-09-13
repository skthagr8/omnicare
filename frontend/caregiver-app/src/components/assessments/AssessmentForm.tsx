'use client';

import { useState } from 'react';
import TUGForm from './TUGForm';
import CMAIForm from './CMAIForm';
import BradenForm from './BradenForm';

const formComponents: Record<string, any> = {
  tug: TUGForm,
  cmai: CMAIForm,
  braden: BradenForm,
  delirium: TUGForm, // Placeholder
};

export default function AssessmentForm({ type }: { type: string }) {
  const FormComponent = formComponents[type] || TUGForm;
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        {type.toUpperCase()} Assessment
      </h2>
      <FormComponent />
    </div>
  );
}