import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, FileText, Activity } from "lucide-react";
import { Fragment } from "react";

interface Transaction {
  transaction_id: number;
  risk_probability: number;
  threshold: number;
  decision: string;
  model_version: string;
  amount: number;
  created_at: string;
}

interface Props {
  transactions: Transaction[];
  activeThreshold: number;
  detailsMap: Record<number, any>;
  onToggleRow: (txn: Transaction) => void;
  expandedTxn: number | null;
}

export default function TransactionsTable({ transactions, activeThreshold, detailsMap, onToggleRow, expandedTxn }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md relative overflow-hidden h-full flex flex-col"
    >
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/10 blur-[80px] pointer-events-none rounded-full" />
      
      <div className="p-6 border-b border-white/10 flex items-center justify-between z-10 bg-black/20">
        <h2 className="text-xl font-['Instrument_Serif'] text-white">Recent Transactions</h2>
      </div>

      <div className="flex-1 overflow-auto z-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50 border-b border-white/10 font-['Instrument_Sans'] sticky top-0 backdrop-blur-xl z-20">
              <th className="px-6 py-4 font-semibold">Txn ID</th>
              <th className="px-6 py-4 font-semibold text-right">Amount</th>
              <th className="px-6 py-4 font-semibold">Risk Score</th>
              <th className="px-6 py-4 font-semibold">Decision</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-white/30 font-['Instrument_Sans']">
                  No transactions scored yet.
                </td>
              </tr>
            ) : transactions.map((t) => {
              const isExpanded = expandedTxn === t.transaction_id;
              const liveDecision = t.risk_probability >= activeThreshold ? 'FLAG' : 'PASS';
              const isFlag = liveDecision === 'FLAG';
              const riskPct = Math.min(t.risk_probability * 100, 100);
              const details = detailsMap[t.transaction_id] || {};
              
              return (
                <Fragment key={t.transaction_id + '-' + t.created_at}>
                  <tr 
                    onClick={() => onToggleRow(t)}
                    className={`cursor-pointer transition-colors border-b border-white/5 ${isExpanded ? 'bg-white/10' : 'hover:bg-white/5'} ${isFlag ? 'border-l-4 border-l-[#ff4d4d]' : 'border-l-4 border-l-transparent'}`}
                  >
                    <td className="px-6 py-4 font-medium text-white/90">{t.transaction_id}</td>
                    <td className="px-6 py-4 text-right text-white/70">₹{(t.amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-1.5 bg-black/50 rounded-full overflow-hidden">
                          <div className={`h-full ${isFlag ? 'bg-[#ff4d4d]' : 'bg-[#238636]'}`} style={{ width: `${riskPct}%` }} />
                        </div>
                        <span className={isFlag ? 'text-[#ff4d4d]' : 'text-[#238636]'}>{riskPct.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest ${isFlag ? 'bg-[#ff4d4d]/20 text-[#ff4d4d] border border-[#ff4d4d]/30' : 'bg-[#238636]/20 text-[#238636] border border-[#238636]/30'}`}>
                        {liveDecision}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isExpanded ? <ChevronUp className="w-5 h-5 inline text-white/70" /> : <ChevronDown className="w-5 h-5 inline text-white/30" />}
                    </td>
                  </tr>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-black/40 border-b border-white/10"
                      >
                        <td colSpan={5} className="p-0">
                          <div className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${isFlag ? 'border-l-4 border-l-[#ff4d4d]' : 'border-l-4 border-l-transparent'}`}>
                            
                            {/* Evidence Packet */}
                            <div className="flex flex-col gap-3">
                              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50 font-['Instrument_Sans']">
                                <FileText className="w-4 h-4" /> Evidence Packet
                              </h3>
                              <div className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-[11px] text-white/80 h-full">
                                {!isFlag ? (
                                  <div className="text-white/30 italic flex items-center justify-center h-full">Not generated for PASS decisions.</div>
                                ) : details.loadingEvidence ? (
                                  <div className="animate-pulse text-[#3054ff]">Generating evidence...</div>
                                ) : details.evidenceError ? (
                                  <div className="text-[#ff4d4d]">{details.evidenceError}</div>
                                ) : details.evidence ? (
                                  <div className="flex flex-col gap-3">
                                    <div className="text-white/70 leading-relaxed">{details.evidence.summary}</div>
                                    <div className={`font-semibold ${details.evidence.grounding_valid ? 'text-[#238636]' : 'text-[#ff4d4d]'}`}>
                                      Grounding: {details.evidence.grounding_valid ? '✓ Valid' : '✗ Failed'}
                                    </div>
                                    <div className="flex flex-col gap-2 mt-2">
                                      {details.evidence.evidence?.map((item: any, i: number) => (
                                        <div key={i} className="bg-white/5 p-2 rounded border border-white/5">
                                          <span className="text-[#3054ff] font-bold">CLAIM:</span> {item.claim}
                                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {item.sources?.map((s: string, si: number) => (
                                              <span key={si} className="bg-black/50 px-1.5 py-0.5 border border-white/10 rounded text-[9px] text-white/50">{s}</span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {/* Audit Trail */}
                            <div className="flex flex-col gap-3">
                              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50 font-['Instrument_Sans']">
                                <Activity className="w-4 h-4" /> Audit Trail
                              </h3>
                              <div className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-[11px] text-white/80 h-full max-h-[300px] overflow-auto flex flex-col gap-2">
                                {details.loadingAudit ? (
                                  <div className="animate-pulse text-white/50">Fetching audit trail...</div>
                                ) : details.auditError ? (
                                  <div className="text-[#ff4d4d]">{details.auditError}</div>
                                ) : details.audit?.length > 0 ? (
                                  details.audit.map((ev: any, i: number) => {
                                    let evColor = 'text-white/90';
                                    if (ev.event_type === 'score_computed') evColor = 'text-[#3054ff]';
                                    if (ev.event_type === 'decision_made') evColor = 'text-[#b4c0ff]';
                                    if (ev.event_type === 'evidence_generated') evColor = 'text-[#238636]';
                                    if (ev.event_type === 'grounding_failure') evColor = 'text-[#ff4d4d]';
                                    
                                    return (
                                      <div key={i} className="border-l-2 border-white/10 pl-3 py-1 mb-1 relative">
                                        <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-white/20" />
                                        <div className="text-white/30 text-[9px] mb-0.5">[{ev.created_at}]</div>
                                        <div className={evColor}>{ev.event_type}</div>
                                        {ev.event_data && (
                                          <div className="text-white/40 mt-1 break-words">{JSON.stringify(ev.event_data)}</div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-white/30">No events found.</div>
                                )}
                              </div>
                            </div>
                            
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
