'use client';

export default function IntakeProgress({ currentStep = 1, totalSteps = 5 }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-8 pt-5">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        <span>Intake Flow</span>
        <span>Step {currentStep} of {totalSteps}</span>
      </div>
      <div className="mt-3 flex gap-1.5" aria-label={`Step ${currentStep} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <span key={index} className={`h-1 flex-1 rounded-full ${index < currentStep ? 'bg-[#0F6B72]' : 'bg-slate-200'}`} />
        ))}
      </div>
    </div>
  );
}
