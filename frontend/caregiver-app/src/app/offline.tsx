export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream p-6">
      <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">You're Offline</h1>
      <p className="text-slate-600 text-center mb-6">
        Don't worry! Your data is saved locally and will sync when you're back online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold"
      >
        Try Again
      </button>
    </div>
  );
}