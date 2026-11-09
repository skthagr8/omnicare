'use client';

import { useState } from 'react';
import { apiClient } from '../../services/api';

// --- AssessmentForm ---
const formComponents: Record<string, any> = {
  tug: TUGForm,
  cmai: CMAIForm,
  braden: BradenForm,
  delirium: TUGForm, // Placeholder
};

export function AssessmentForm({ type }: { type: string }) {
  const FormComponent = formComponents[type] || TUGForm;
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">
        {type.toUpperCase()} Assessment
      </h2>
      <FormComponent />
    </div>
  );
}

// --- BradenForm ---
const categories = [
  { name: 'Sensory Perception', key: 'sensory_perception', min: 1, max: 4 },
  { name: 'Moisture', key: 'moisture', min: 1, max: 4 },
  { name: 'Activity', key: 'activity', min: 1, max: 4 },
  { name: 'Mobility', key: 'mobility', min: 1, max: 4 },
  { name: 'Nutrition', key: 'nutrition', min: 1, max: 4 },
  { name: 'Friction/Shear', key: 'friction_shear', min: 1, max: 3 },
];

export function BradenForm() {
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
          <label className="block text-sm font-medium text-slate-700 mb-2">
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
          <div className="text-center text-lg font-semibold text-teal-600">
            {scores[category.key]}
          </div>
        </div>
      ))}

      <div className="bg-teal-50 rounded-lg p-4 text-center">
        <p className="text-lg font-semibold text-teal-900">
          Total Score: {totalScore}
        </p>
        <p className="text-sm text-teal-600">
          {totalScore >= 18 ? 'Low risk' : totalScore >= 13 ? 'Moderate risk' : 'High risk'}
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Assessment'}
      </button>
    </form>
  );
}

// --- CMAIForm ---
export function CMAIForm() {
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
        <label className="block text-sm font-medium text-slate-700 mb-1">
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
        <div className="text-center text-sm text-slate-600">{frequencyScore}</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
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
        <div className="text-center text-sm text-slate-600">{disruptivenessScore}</div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Assessment'}
      </button>
    </form>
  );
}

// --- TUGForm ---
export function TUGForm() {
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
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Time (seconds)
        </label>
        <input
          type="number"
          step="0.1"
          required
          value={timeSeconds}
          onChange={(e) => setTimeSeconds(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-xl"
          placeholder="e.g., 12.5"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
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
        <div className="flex justify-between text-xs text-slate-500">
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
          <span className="text-sm text-slate-700">Assistance required</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Assessment'}
      </button>
    </form>
  );
}
