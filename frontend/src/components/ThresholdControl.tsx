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

  // What-if comparison for the last scored txn
  const whatIfDecision = lastScoredTxn 
    ? (lastScoredTxn.risk_probability >= activeThreshold ? 'FLAG' : 'PASS')
    : null;
  const productionDecision = lastScoredTxn?.decision || null;
  const decisionsMatch = whatIfDecision === productionDecision;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-[#0B101E]/60 border border-[#3054ff]/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)] rounded-2xl backdrop-blur-xl relative overflow-hidden"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 p-5 border-b border-[#3054ff]/10">
        <Activity className="w-5 h-5 text-[#3054ff] shrink-0" />
        <h2 className="text-lg font-semibold text-white">Operating Threshold</h2>
        <span className="text-[10px] bg-[#3054ff]/20 text-[#adc6ff] px-2 py-0.5 rounded-full font-mono font-medium border border-[#3054ff]/30">what-if only</span>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="ml-auto flex items-center gap-1.5 text-xs text-[#adc6ff]/70 hover:text-white transition-colors"
        >
          {expanded ? 'Collapse' : 'Why this panel?'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ─── Main Content: Two-column layout ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-[#3054ff]/10">
        
        {/* LEFT: Controls */}
        <div className="p-5 space-y-4">
          {/* Threshold presets */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2">Select Threshold</div>
            <div className="flex flex-wrap gap-2">
              {THRESHOLD_PRESETS.map((p) => {
                const isActive = Math.abs(activeThreshold - p.value) < 0.001;
                const catColor = p.category === 'aggressive' ? 'border-[#F0883E]/50' : p.category === 'balanced' ? 'border-[#3054ff]/50' : 'border-[#238636]/50';
                const activeBg = p.category === 'aggressive' ? 'bg-[#F0883E]/20 text-[#F0883E]' : p.category === 'balanced' ? 'bg-[#3054ff]/30 text-white' : 'bg-[#238636]/20 text-[#238636]';
                
                return (
                  <button 
                    key={p.value}
                    onClick={() => setActiveThreshold(p.value)}
                    className={`px-3 py-1.5 text-xs font-mono border rounded-lg transition-all ${isActive ? `${catColor} ${activeBg} font-semibold shadow-[0_0_10px_rgba(255,255,255,0.05)]` : 'border-white/10 text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                  >
                    {(p.value * 100).toFixed(1)}%
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-white/50 mt-2 font-medium">
              {currentPreset?.label || 'Custom Strategy'}
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#13192B]/80 border border-[#3054ff]/10 rounded-xl p-3 text-center">
              <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1 font-medium">Review Rate</div>
              <motion.div key={activeStats.review_rate} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-base font-semibold text-[#F0883E]">
                {(activeStats.review_rate * 100).toFixed(1)}%
              </motion.div>
            </div>
            <div className="bg-[#13192B]/80 border border-[#3054ff]/10 rounded-xl p-3 text-center">
              <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1 font-medium">Fraud Capture</div>
              <motion.div key={activeStats.fraud_capture} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-base font-semibold text-[#ff4d4d]">
                {(activeStats.fraud_capture * 100).toFixed(1)}%
              </motion.div>
            </div>
            <div className="bg-[#13192B]/80 border border-[#3054ff]/10 rounded-xl p-3 text-center">
              <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1 font-medium">Precision</div>
              <motion.div key={activeStats.precision} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-base font-semibold text-[#238636]">
                {(activeStats.precision * 100).toFixed(1)}%
              </motion.div>
            </div>
          </div>

          {/* Decision comparison banner */}
          <AnimatePresence>
            {lastScoredTxn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="bg-[#13192B]/80 border border-[#3054ff]/10 rounded-xl p-3 space-y-2">
                  <div className="text-[9px] uppercase tracking-wider text-white/40 font-medium">
                    Last scored: Txn #{lastScoredTxn.transaction_id} · p = {lastScoredTxn.risk_probability.toFixed(4)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-white/40 shrink-0" />
                    <span className="text-[11px] text-white/60 font-medium">Production ({(FROZEN_THRESHOLD * 100).toFixed(1)}%):</span>
                    <span className={`ml-auto text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${productionDecision === 'FLAG' ? 'bg-[#ff4d4d]/20 text-[#ff4d4d]' : 'bg-[#238636]/20 text-[#238636]'}`}>
                      {productionDecision}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-3 h-3 text-white/40 shrink-0" />
                    <span className="text-[11px] text-white/60 font-medium">Your threshold ({(activeThreshold * 100).toFixed(1)}%):</span>
                    <span className={`ml-auto text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${whatIfDecision === 'FLAG' ? 'bg-[#ff4d4d]/20 text-[#ff4d4d]' : 'bg-[#238636]/20 text-[#238636]'}`}>
                      would be {whatIfDecision}
                    </span>
                  </div>
                  {!decisionsMatch && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pt-1.5 border-t border-[#3054ff]/10">
                      <AlertTriangle className="w-3 h-3 text-[#F0883E] shrink-0" />
                      <span className="text-[10px] text-[#F0883E]/80 font-medium">Decision would change at this threshold</span>
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
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-3">What is This?</div>
            <p className="text-[13px] text-white/60 leading-relaxed">
              In fraud detection, the <strong className="text-white/80">threshold</strong> is the cutoff point that turns a continuous risk probability into a binary PASS or FLAG decision. Every transaction above the threshold gets flagged for review.
            </p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-3">Why Does It Matter?</div>
            <p className="text-[13px] text-white/60 leading-relaxed">
              Lowering the threshold catches more fraud (<strong className="text-[#ff4d4d]/80">higher fraud capture</strong>) but also flags more legitimate transactions for manual review (<strong className="text-[#F0883E]/80">higher review rate</strong>). Raising it reduces false positives but lets more fraud slip through. The "right" threshold is a <strong className="text-white/80">business decision</strong> dictated by your team's risk appetite and operational capacity.
            </p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-3">Is This Live?</div>
            <div className="bg-[#0A0A0B] border border-[#F0883E]/20 rounded-xl p-3">
              <p className="text-[12px] text-white/60 leading-relaxed">
                <strong className="text-[#F0883E]">No.</strong> This panel is a <strong className="text-white/80">simulation tool</strong>. Production enforces a frozen 5.0% threshold. The metrics shown here (Review Rate, Fraud Capture, Precision) are computed from the model's real PR curve on the test set — they show you what <em>would</em> happen at each threshold, not what is happening live.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Expandable "Why" section ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#3054ff]/10 p-5 bg-[#0A0A0B]/40 space-y-3">
              <h3 className="text-sm font-semibold text-white">The False-Positive Cost Curve</h3>
              <p className="text-[13px] text-white/60 leading-relaxed">
                The most critical operational metric in fraud detection is the tradeoff between how much fraud you catch and how many legitimate transactions you burden with a manual review. The table below shows the real operating envelope of the v2.0.1 model, computed on the untouched test set (88,581 transactions):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] font-mono">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-medium">Threshold</th>
                      <th className="text-right py-2 pr-4 font-medium">Review Rate</th>
                      <th className="text-right py-2 pr-4 font-medium">Fraud Capture</th>
                      <th className="text-right py-2 font-medium">Precision</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    {[
                      { t: '3.5%', r: '28.2%', f: '73.6%', p: '9.1%' },
                      { t: '4.5%', r: '20.7%', f: '65.6%', p: '11.0%' },
                      { t: '5.0% ★', r: '19.0%', f: '63.1%', p: '11.5%' },
                      { t: '7.0%', r: '12.7%', f: '52.6%', p: '14.4%' },
                      { t: '10.0%', r: '7.6%', f: '39.9%', p: '18.4%' },
                      { t: '15.0%', r: '4.6%', f: '29.4%', p: '22.4%' },
                    ].map(row => (
                      <tr key={row.t} className={`border-b border-white/5 ${row.t.includes('★') ? 'text-white font-semibold' : ''}`}>
                        <td className="py-1.5 pr-4">{row.t}</td>
                        <td className="text-right py-1.5 pr-4 text-[#F0883E]">{row.r}</td>
                        <td className="text-right py-1.5 pr-4 text-[#ff4d4d]">{row.f}</td>
                        <td className="text-right py-1.5 text-[#238636]">{row.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[12px] text-white/40 leading-relaxed">
                <strong className="text-white/60">Why 5.0%?</strong> It balances reviewing ~19% of transactions while capturing ~63% of fraud. Pushing tighter (&gt;7%) enters steeply diminishing returns where we miss more than half of all fraud.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
