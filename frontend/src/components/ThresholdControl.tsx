import { motion } from "motion/react";
import { Activity } from "lucide-react";

interface PRCurvePoint {
  threshold: number;
  review_rate: number;
  fraud_capture: number;
  precision: number;
}

interface Props {
  activeThreshold: number;
  setActiveThreshold: (t: number) => void;
  prCurve: PRCurvePoint[];
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

export default function ThresholdControl({ activeThreshold, setActiveThreshold, prCurve }: Props) {
  
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

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden mt-4"
    >
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-white/70" />
        <h2 className="text-xl font-['Instrument_Serif'] text-white">Operating Threshold</h2>
      </div>

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
      
      <div className="text-xs text-white/50 mb-6 font-['Instrument_Sans']">
        {currentPreset?.label || 'Custom Strategy'}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center backdrop-blur-sm">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-['Instrument_Sans']">Review Rate</div>
          <motion.div key={activeStats.review_rate} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-lg font-semibold text-[#F0883E]">
            {(activeStats.review_rate * 100).toFixed(1)}%
          </motion.div>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center backdrop-blur-sm">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-['Instrument_Sans']">Fraud Capture</div>
          <motion.div key={activeStats.fraud_capture} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-lg font-semibold text-[#ff4d4d]">
            {(activeStats.fraud_capture * 100).toFixed(1)}%
          </motion.div>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center backdrop-blur-sm">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-['Instrument_Sans']">Precision</div>
          <motion.div key={activeStats.precision} initial={{ scale: 1.1, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-lg font-semibold text-[#238636]">
            {(activeStats.precision * 100).toFixed(1)}%
          </motion.div>
        </div>
      </div>
      
      <div className="mt-4 text-[11px] text-white/40 leading-relaxed font-['Instrument_Sans']">
        Live reclassification based on PR curve mapping. Lower threshold captures more fraud but strictly increases manual review overhead.
      </div>
    </motion.div>
  );
}
