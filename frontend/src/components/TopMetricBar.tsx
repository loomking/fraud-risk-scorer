import { motion } from "motion/react";

interface Props {
  modelVersion: string;
  activeThreshold: number;
  featureCount: number;
  totalScored: number;
}

export default function TopMetricBar({ modelVersion, activeThreshold, featureCount, totalScored }: Props) {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between font-['Instrument_Sans']"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg tracking-tight text-white">Fraud Risk Scorer</span>
        <span className="bg-[#3054ff]/20 text-[#b4c0ff] text-xs px-2 py-0.5 rounded-full border border-[#3054ff]/30">v2.0.1</span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <span>Model:</span>
          <span className="text-white">{modelVersion}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Threshold:</span>
          <span className="text-[#ff4d4d] font-mono">{(activeThreshold * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Features:</span>
          <span className="text-white">{featureCount}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-white/70">
        <span>Total Scored:</span>
        <motion.span 
          key={totalScored}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-white font-mono bg-white/10 px-2 py-0.5 rounded"
        >
          {totalScored}
        </motion.span>
      </div>
    </motion.header>
  );
}
