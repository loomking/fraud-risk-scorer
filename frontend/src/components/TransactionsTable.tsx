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
      className="bg-white border border-black/8 rounded-2xl shadow-sm relative overflow-hidden h-full flex flex-col"
    >
      <div className="p-6 border-b border-black/8 flex items-center justify-between z-10">
        <h2 className="text-xl font-semibold text-black" style={{ letterSpacing: '-0.02em' }}>Recent Transactions</h2>
      </div>

      <div className="flex-1 overflow-auto z-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-black/40 border-b border-black/8 font-semibold sticky top-0 z-20">
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
                <td colSpan={5} className="text-center py-12 text-black/30 font-medium font-sans">
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
                    className={`cursor-pointer transition-colors border-b border-black/5 ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50/50'} ${isFlag ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}
                  >
                    <td className="px-6 py-4 font-medium text-black/80">{t.transaction_id}</td>
                    <td className="px-6 py-4 text-right text-black/60">₹{(t.amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-1.5 bg-black/5 rounded-full overflow-hidden">
                          <div className={`h-full ${isFlag ? 'bg-red-500' : 'bg-green-600'}`} style={{ width: `${riskPct}%` }} />
                        </div>
                        <span className={isFlag ? 'text-red-600' : 'text-green-600'}>{riskPct.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest ${isFlag ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                        {liveDecision}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isExpanded ? <ChevronUp className="w-5 h-5 inline text-black/40" /> : <ChevronDown className="w-5 h-5 inline text-black/20" />}
                    </td>
                  </tr>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-50/50 border-b border-black/8"
                      >
                        <td colSpan={5} className="p-0">
                          <div className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${isFlag ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}>
                            
                            {/* Evidence Packet */}
                            <div className="flex flex-col gap-3">
                              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-black/40">
                                <FileText className="w-4 h-4" /> Evidence Packet
                              </h3>
                              <div className="bg-white border border-black/8 rounded-xl p-4 font-mono text-[11px] text-black/70 h-full">
                                {!isFlag ? (
                                  <div className="text-black/30 italic flex items-center justify-center h-full font-sans text-center px-4">No evidence generated -- this transaction passed automatically below the review threshold.</div>
                                ) : details.loadingEvidence ? (
                                  <div className="animate-pulse text-blue-600">Generating evidence...</div>
                                ) : details.evidenceError ? (
                                  <div className="text-red-600">{details.evidenceError}</div>
                                ) : details.evidence ? (
                                  <div className="flex flex-col gap-3">
                                    <div className="text-black/60 leading-relaxed font-sans">{details.evidence.summary}</div>
                                    <div className={`font-semibold ${details.evidence.grounding_valid ? 'text-green-600' : 'text-red-600'}`}>
                                      Grounding: {details.evidence.grounding_valid ? '✓ Valid' : '✗ Failed'}
                                    </div>
                                    <div className="flex flex-col gap-2 mt-2">
                                      {details.evidence.evidence?.map((item: any, i: number) => (
                                        <div key={i} className="bg-gray-50 p-2 rounded border border-black/5">
                                          <span className="text-blue-700 font-bold">CLAIM:</span> {item.claim}
                                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {item.sources?.map((s: string, si: number) => (
                                              <span key={si} className="bg-white px-1.5 py-0.5 border border-black/8 rounded text-[9px] text-black/50">{s}</span>
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
                              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-black/40">
                                <Activity className="w-4 h-4" /> Audit Trail
                              </h3>
                              <div className="bg-white border border-black/8 rounded-xl p-4 font-mono text-[11px] text-black/70 h-full max-h-[300px] overflow-auto flex flex-col gap-2">
                                {details.loadingAudit ? (
                                  <div className="animate-pulse text-black/40">Fetching audit trail...</div>
                                ) : details.auditError ? (
                                  <div className="text-red-600">{details.auditError}</div>
                                ) : details.audit?.length > 0 ? (
                                  details.audit.map((ev: any, i: number) => {
                                    let evColor = 'text-black/70';
                                    if (ev.event_type === 'score_computed') evColor = 'text-blue-700';
                                    if (ev.event_type === 'decision_made') evColor = 'text-indigo-700';
                                    if (ev.event_type === 'evidence_generated') evColor = 'text-green-700';
                                    if (ev.event_type === 'grounding_failure') evColor = 'text-red-600';
                                    
                                    return (
                                      <div key={i} className="border-l-2 border-black/10 pl-3 py-1 mb-1 relative">
                                        <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-black/15" />
                                        <div className="text-black/30 text-[9px] mb-0.5">[{ev.created_at}]</div>
                                        <div className={evColor}>{ev.event_type}</div>
                                        {ev.event_data && (
                                          <pre className="text-black/40 mt-1 whitespace-pre-wrap font-mono text-[9px] bg-black/[0.02] p-2 rounded">{JSON.stringify(ev.event_data, null, 2)}</pre>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-black/30 font-sans">No events found.</div>
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
