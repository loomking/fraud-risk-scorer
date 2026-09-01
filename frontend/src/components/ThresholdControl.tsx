import { motion, AnimatePresence } from "motion/react";
import { Activity, ArrowDownRight, Shield, AlertTriangle, Info } from "lucide-react";

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
  { value: 0.035, label: 'High capture', category: 'aggressive' },
  { value: 0.045, label: 'High capture', category: 'aggressive' },
  { value: 0.050, label: 'Balanced', category: 'balanced' },
  { value: 0.070, label: 'Tight ops', category: 'conservative' },
  { value: 0.090, label: 'High precision', category: 'conservative' },
  { value: 0.100, label: 'High precision', category: 'conservative' },
  { value: 0.150, label: 'Strict', category: 'conservative' },
];

const FROZEN_THRESHOLD = 0.05;

export default function ThresholdControl({ activeThreshold, setActiveThreshold, prCurve, lastScoredTxn }: Props) {
  
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
    <>
      {/* Section Divider */}
      <div className="flex items-center gap-3 mt-6 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3054ff]/30 to-transparent" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#adc6ff]/50 font-medium whitespace-nowrap">Threshold Analysis</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3054ff]/30 to-transparent" />
      </div>

      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0B101E]/60 border border-[#3054ff]/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)] rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden"
      >
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-5 h-5 text-[#3054ff]" />
          <h2 className="text-xl font-semibold text-white">Operating Threshold</h2>
          <div className="group relative">
            <Info className="w-4 h-4 text-white/40 hover:text-white/80 cursor-help transition-colors" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-[#111827] border border-[#3054ff]/30 text-white/80 text-[11px] p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              This threshold determines the cutoff for flagging a transaction. Lowering it catches more fraud but increases false positives. This panel is for simulation—production is frozen at 5.0%.
            </div>
          </div>
          <span className="ml-auto text-[10px] bg-[#3054ff]/20 text-[#adc6ff] px-2 py-0.5 rounded-full font-mono font-medium border border-[#3054ff]/30">what-if only</span>
        </div>

        {/* Decision comparison banner — only shows when a txn has been scored */}
        <AnimatePresence>
          {lastScoredTxn && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5"
            >
              <div className="bg-[#13192B]/80 border border-[#3054ff]/10 rounded-xl p-4 space-y-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2">
                  Last scored: Txn #{lastScoredTxn.transaction_id} · p = {lastScoredTxn.risk_probability.toFixed(4)}
                </div>

                {/* Production decision (frozen) */}
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span className="text-xs text-white/60 font-medium">Production (frozen {(FROZEN_THRESHOLD * 100).toFixed(1)}%):</span>
                  <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded ${productionDecision === 'FLAG' ? 'bg-[#ff4d4d]/20 text-[#ff4d4d]' : 'bg-[#238636]/20 text-[#238636]'}`}>
                    {productionDecision}
                  </span>
                </div>

                {/* What-if at slider threshold */}
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span className="text-xs text-white/60 font-medium">At your threshold ({(activeThreshold * 100).toFixed(1)}%):</span>
                  <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded ${whatIfDecision === 'FLAG' ? 'bg-[#ff4d4d]/20 text-[#ff4d4d]' : 'bg-[#238636]/20 text-[#238636]'}`}>
                    would be {whatIfDecision}
                  </span>
                </div>

                {/* Mismatch alert */}
                {!decisionsMatch && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 mt-1 pt-2 border-t border-[#3054ff]/10"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F0883E] shrink-0" />
                    <span className="text-[11px] text-[#F0883E]/80 font-medium">
                      Decision would change at this threshold
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2 mb-2">
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
        
        <div className="text-xs text-white/50 mb-6 font-medium">
          {currentPreset?.label || 'Custom Strategy'}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#13192B]/80 border border-[#3054ff]/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-medium">Review Rate</div>
            <motion.div key={activeStats.review_rate} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-lg font-semibold text-[#F0883E]">
              {(activeStats.review_rate * 100).toFixed(1)}%
            </motion.div>
          </div>
          <div className="bg-[#13192B]/80 border border-[#3054ff]/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-medium">Fraud Capture</div>
            <motion.div key={activeStats.fraud_capture} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-lg font-semibold text-[#ff4d4d]">
              {(activeStats.fraud_capture * 100).toFixed(1)}%
            </motion.div>
          </div>
          <div className="bg-[#13192B]/80 border border-[#3054ff]/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-medium">Precision</div>
            <motion.div key={activeStats.precision} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-lg font-semibold text-[#238636]">
              {(activeStats.precision * 100).toFixed(1)}%
            </motion.div>
          </div>
        </div>
        
        <div className="mt-4 text-[11px] text-white/40 leading-relaxed font-medium hidden">
          This panel does <strong className="text-white/60">not</strong> change the live /score decision. Production enforces a frozen {(FROZEN_THRESHOLD * 100).toFixed(1)}% threshold. Use this to explore how different thresholds would affect review rate, fraud capture, and precision on the validation PR curve.
        </div>
      </motion.div>
    </>
  );
}

