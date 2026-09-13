'use client';

import { useState } from 'react';
import { apiClient } from '@/services/api';

const categories = [
  { name: 'Sensory Perception', key: 'sensory_perception', min: 1, max: 4 },
  { name: 'Moisture', key: 'moisture', min: 1, max: 4 },
  { name: 'Activity', key: 'activity', min: 1, max: 4 },
  { name: 'Mobility', key: 'mobility', min: 1, max: 4 },
  { name: 'Nutrition', key: 'nutrition', min: 1, max: 4 },
  { name: 'Friction/Shear', key: 'friction_shear', min: 1, max: 3 },
];

export default function BradenForm() {
  const [scores, setScores] = useState<Record<string, number>>({
    sensory_perception: 4,
    moisture: 4,
    activity: 4,
    mobility: 4,
    nutrition: 4,
    friction_shear: 3,
  });
  const [submitting, setSubmitting] = useState(false);

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post('/assessments/braden', {
        ...scores,
        total_score: totalScore,
      });
      alert('Assessment submitted successfully');
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {categories.map((category) => (
        <div key={category.key} className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {category.name} ({category.min}-{category.max})
          </label>
          <input
            type="range"
            min={category.min}
            max={category.max}
            value={scores[category.key]}
            onChange={(e) => setScores(prev => ({
              ...prev,
              [category.key]: parseInt(e.target.value)
            }))}
            className="w-full"
          />
          <div className="text-center text-lg font-bold text-indigo-600">
            {scores[category.key]}
          </div>
        </div>
      ))}

      <div className="bg-indigo-50 rounded-lg p-4 text-center">
        <p className="text-lg font-bold text-indigo-900">
          Total Score: {totalScore}
        </p>
        <p className="text-sm text-indigo-600">
          {totalScore >= 18 ? 'Low risk' : totalScore >= 13 ? 'Moderate risk' : 'High risk'}
        </p>
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