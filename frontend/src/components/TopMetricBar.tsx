import { motion } from "motion/react";
import { Shield } from "lucide-react";

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
      className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-black/8 px-6 py-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.location.hash = ''}>
        <Shield className="w-6 h-6 text-black" strokeWidth={2} />
        <span className="font-semibold text-lg tracking-tight text-black" style={{ letterSpacing: '-0.03em' }}>Fraud Risk Scorer</span>
        <span className="bg-black/8 text-black/60 text-xs px-2 py-0.5 rounded-full font-mono font-medium">v2.0.1</span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm text-black/50">
        <div className="flex items-center gap-2">
          <span>Model:</span>
          <span className="text-black font-medium">{modelVersion}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Threshold:</span>
          <span className="text-red-600 font-mono font-medium">{(activeThreshold * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Features:</span>
          <span className="text-black font-medium">{featureCount}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-black/50">
        <span>Scored:</span>
        <motion.span 
          key={totalScored}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-black font-mono font-medium bg-black/5 px-2 py-0.5 rounded"
        >
          {totalScored}
        </motion.span>
      </div>
    </motion.header>
  );
}
