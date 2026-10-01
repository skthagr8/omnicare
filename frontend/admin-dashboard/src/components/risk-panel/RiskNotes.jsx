'use client';

import { BarChart3, ShieldCheck, TriangleAlert } from 'lucide-react';

export default function RiskNotes() {
  return (
    <><div className="mt-10 grid grid-cols-3 gap-8 border-t border-slate-200 pt-6 text-xs text-slate-500"><div><p className="mb-1 flex items-center gap-1.5 font-semibold text-[#0F6B72]"><BarChart3 className="h-3.5 w-3.5" />Predictive Methodology</p><p>Risk scores are generated via ensemble modeling of gait stability sensors, EHR diagnosis flags, and recent behavioral anomalies.</p></div><div><p className="mb-1 flex items-center gap-1.5 font-semibold text-amber-600"><TriangleAlert className="h-3.5 w-3.5" />Actionable Escalation</p><p>The Recommend Escalation trigger bypasses standard queuing, notifying the floor lead and facility administrator immediately via secure push notification and H7 system alert.</p></div><div><p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-600"><ShieldCheck className="h-3.5 w-3.5" />Model Confidence</p><p>Current model accuracy is rated at 94.2% for fall prediction. Exempt cases involve patients under pediatric care or with insufficient historical data for accurate scoring.</p></div></div><div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-[11px] text-slate-400"><span>AI Inference: Active &nbsp;•&nbsp; Data Privacy: HIPAA Compliant</span><span>© 2026 OmniCare Operations. All analytical results are for clinical decision support and should be verified by a medical professional.</span></div></>
  );
}
