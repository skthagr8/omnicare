'use client';

import { useState } from 'react';
import { apiClient } from '@/services/api';

export default function CMAIForm() {
  const [frequencyScore, setFrequencyScore] = useState(4);
  const [disruptivenessScore, setDisruptivenessScore] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post('/assessments/cmai', {
        frequency_score: frequencyScore,
        disruptiveness_score: disruptivenessScore,
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
          Frequency Score (1-7)
        </label>
        <input
          type="range"
          min="1"
          max="7"
          value={frequencyScore}
          onChange={(e) => setFrequencyScore(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-center text-sm text-gray-600">{frequencyScore}</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Disruptiveness Score (1-5)
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={disruptivenessScore}
          onChange={(e) => setDisruptivenessScore(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-center text-sm text-gray-600">{disruptivenessScore}</div>
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