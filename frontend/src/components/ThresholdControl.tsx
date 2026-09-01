import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, ArrowDownRight, Shield, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface PRCurvePoint {
  threshold: number;
  review_rate: number;
  fraud_capture: number;
  precision: number;
}

interface LastScoredTxn {
  transaction_id: number;
  risk_probability: number;
  threshold: number;
  decision: string;
}

interface Props {
  activeThreshold: number;
  setActiveThreshold: (t: number) => void;
  prCurve: PRCurvePoint[];
  lastScoredTxn: LastScoredTxn | null;
}

const THRESHOLD_PRESETS = [
  { value: 0.035, label: 'High capture', category: 'aggressive' as const },
  { value: 0.045, label: 'High capture', category: 'aggressive' as const },
  { value: 0.050, label: 'Balanced', category: 'balanced' as const },
  { value: 0.070, label: 'Tight ops', category: 'conservative' as const },
  { value: 0.090, label: 'High precision', category: 'conservative' as const },
  { value: 0.100, label: 'High precision', category: 'conservative' as const },
  { value: 0.150, label: 'Strict', category: 'conservative' as const },
];

const FROZEN_THRESHOLD = 0.05;

export default function ThresholdControl({ activeThreshold, setActiveThreshold, prCurve, lastScoredTxn }: Props) {
  const [expanded, setExpanded] = useState(false);
  
  let activeStats = { review_rate: 0, fraud_capture: 0, precision: 0 };
  if (prCurve.length > 0) {
    let closest = prCurve[0];
    let minDist = Math.abs(prCurve[0].threshold - activeThreshold);
    for (const p of prCurve) {
      const dist = Math.abs(p.threshold - activeThreshold);
      if (dist < minDist) { minDist = dist; closest = p; }
    }
    activeStats = closest;
  }

  const currentPreset = THRESHOLD_PRESETS.find(p => Math.abs(p.value - activeThreshold) < 0.001);
  const whatIfDecision = lastScoredTxn ? (lastScoredTxn.risk_probability >= activeThreshold ? 'FLAG' : 'PASS') : null;
  const productionDecision = lastScoredTxn?.decision || null;
  const decisionsMatch = whatIfDecision === productionDecision;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gradient-to-r from-white via-purple-50/30 to-indigo-50/50 border border-purple-100/50 rounded-2xl shadow-sm relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-black/5">
        <Activity className="w-5 h-5 text-black/60 shrink-0" />
        <h2 className="text-lg font-semibold text-black" style={{ letterSpacing: '-0.02em' }}>Operating Threshold</h2>
        <span className="text-[10px] bg-black/5 text-black/50 px-2 py-0.5 rounded-full font-mono font-medium">what-if only</span>
        <button onClick={() => setExpanded(!expanded)} className="ml-auto flex items-center gap-1.5 text-xs text-black/40 hover:text-black transition-colors">
          {expanded ? 'Collapse' : 'Why this panel?'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main: Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-black/5">
        
        {/* LEFT: Controls */}
        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-black/35 font-semibold mb-2">Select Threshold</div>
            <div className="flex flex-wrap gap-2">
              {THRESHOLD_PRESETS.map((p) => {
                const isActive = Math.abs(activeThreshold - p.value) < 0.001;
                const activeBg = p.category === 'aggressive' ? 'bg-orange-50 text-orange-700 border-orange-200' : p.category === 'balanced' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200';
                return (
                  <button key={p.value} onClick={() => setActiveThreshold(p.value)}
                    className={`px-3 py-1.5 text-xs font-mono border rounded-lg transition-all ${isActive ? `${activeBg} font-semibold` : 'border-black/10 text-black/40 hover:bg-gray-50 hover:text-black/60'}`}
                  >
                    {(p.value * 100).toFixed(1)}%
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-black/40 mt-2 font-medium">{currentPreset?.label || 'Custom Strategy'}</div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 border border-black/5 rounded-xl p-3 text-center">
              <div className="text-[9px] text-black/35 uppercase tracking-wider mb-1 font-semibold">Review Rate</div>
              <motion.div key={activeStats.review_rate} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-base font-semibold text-orange-600">
                {(activeStats.review_rate * 100).toFixed(1)}%
              </motion.div>
            </div>
            <div className="bg-gray-50 border border-black/5 rounded-xl p-3 text-center">
              <div className="text-[9px] text-black/35 uppercase tracking-wider mb-1 font-semibold">Fraud Capture</div>
              <motion.div key={activeStats.fraud_capture} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-base font-semibold text-red-600">
                {(activeStats.fraud_capture * 100).toFixed(1)}%
              </motion.div>
            </div>
            <div className="bg-gray-50 border border-black/5 rounded-xl p-3 text-center">
              <div className="text-[9px] text-black/35 uppercase tracking-wider mb-1 font-semibold">Precision</div>
              <motion.div key={activeStats.precision} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-base font-semibold text-green-700">
                {(activeStats.precision * 100).toFixed(1)}%
              </motion.div>
            </div>
          </div>

          {/* Decision comparison */}
          <AnimatePresence>
            {lastScoredTxn && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="bg-gray-50 border border-black/5 rounded-xl p-3 space-y-2">
                  <div className="text-[9px] uppercase tracking-wider text-black/35 font-semibold">
                    Last scored: Txn #{lastScoredTxn.transaction_id} · p = {lastScoredTxn.risk_probability.toFixed(4)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-black/30 shrink-0" />
                    <span className="text-[11px] text-black/50 font-medium">Production ({(FROZEN_THRESHOLD * 100).toFixed(1)}%):</span>
                    <span className={`ml-auto text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${productionDecision === 'FLAG' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                      {productionDecision}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-3 h-3 text-black/30 shrink-0" />
                    <span className="text-[11px] text-black/50 font-medium">Your threshold ({(activeThreshold * 100).toFixed(1)}%):</span>
                    <span className={`ml-auto text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${whatIfDecision === 'FLAG' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                      would be {whatIfDecision}
                    </span>
                  </div>
                  {!decisionsMatch && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pt-1.5 border-t border-black/5">
                      <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
                      <span className="text-[10px] text-orange-600 font-medium">Decision would change at this threshold</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Explanation */}
        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-black/35 font-semibold mb-3">What is This?</div>
            <p className="text-[13px] text-black/50 leading-relaxed">
              The <strong className="text-black/70">threshold</strong> is the cutoff point that turns a continuous risk probability into a binary PASS or FLAG decision. Every transaction above the threshold gets flagged for review.
            </p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-black/35 font-semibold mb-3">Why Does It Matter?</div>
            <p className="text-[13px] text-black/50 leading-relaxed">
              Lowering the threshold catches more fraud (<strong className="text-red-600/70">higher fraud capture</strong>) but also flags more legitimate transactions for manual review (<strong className="text-orange-600/70">higher review rate</strong>). The "right" threshold is a <strong className="text-black/70">business decision</strong> dictated by your team's risk appetite.
            </p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-black/35 font-semibold mb-3">Is This Live?</div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-[12px] text-black/50 leading-relaxed">
                <strong className="text-orange-700">No.</strong> This is a <strong className="text-black/70">simulation tool</strong>. Production enforces a frozen 5.0% threshold. The metrics shown are computed from the model's PR curve on the test set.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable PR curve table */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-black/5 p-5 bg-gray-50/50 space-y-3">
              <h3 className="text-sm font-semibold text-black">The False-Positive Cost Curve</h3>
              <p className="text-[13px] text-black/50 leading-relaxed">
                Real operating envelope of the v2.0.1 model, computed on the untouched test set (88,581 transactions):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] font-mono">
                  <thead>
                    <tr className="text-black/35 border-b border-black/10">
                      <th className="text-left py-2 pr-4 font-semibold">Threshold</th>
                      <th className="text-right py-2 pr-4 font-semibold">Review Rate</th>
                      <th className="text-right py-2 pr-4 font-semibold">Fraud Capture</th>
                      <th className="text-right py-2 font-semibold">Precision</th>
                    </tr>
                  </thead>
                  <tbody className="text-black/50">
                    {[
                      { t: '3.5%', r: '28.2%', f: '73.6%', p: '9.1%', active: false },
                      { t: '4.5%', r: '20.7%', f: '65.6%', p: '11.0%', active: false },
                      { t: '5.0% ★', r: '19.0%', f: '63.1%', p: '11.5%', active: true },
                      { t: '7.0%', r: '12.7%', f: '52.6%', p: '14.4%', active: false },
                      { t: '10.0%', r: '7.6%', f: '39.9%', p: '18.4%', active: false },
                      { t: '15.0%', r: '4.6%', f: '29.4%', p: '22.4%', active: false },
                    ].map(row => (
                      <tr key={row.t} className={`border-b border-black/5 ${row.active ? 'text-black font-semibold' : ''}`}>
                        <td className="py-1.5 pr-4">{row.t}</td>
                        <td className="text-right py-1.5 pr-4 text-orange-600">{row.r}</td>
                        <td className="text-right py-1.5 pr-4 text-red-600">{row.f}</td>
                        <td className="text-right py-1.5 text-green-700">{row.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
