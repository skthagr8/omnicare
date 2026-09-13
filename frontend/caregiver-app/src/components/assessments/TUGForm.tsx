'use client';

import { useState } from 'react';
import { apiClient } from '@/services/api';

export default function TUGForm() {
  const [timeSeconds, setTimeSeconds] = useState('');
  const [gaitStability, setGaitStability] = useState(3);
  const [assistanceRequired, setAssistanceRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post('/assessments/tug', {
        time_seconds: parseFloat(timeSeconds),
        gait_stability: gaitStability,
        assistance_required: assistanceRequired,
      });
      alert('Assessment submitted successfully');
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Time (seconds)
        </label>
        <input
          type="number"
          step="0.1"
          required
          value={timeSeconds}
          onChange={(e) => setTimeSeconds(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., 12.5"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gait Stability (1-5)
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={gaitStability}
          onChange={(e) => setGaitStability(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Very Unstable</span>
          <span>Very Stable</span>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={assistanceRequired}
            onChange={(e) => setAssistanceRequired(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Assistance required</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Assessment'}
      </button>
    </form>
  );
}