import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";

interface Props {
  form: any;
  setForm: (f: any) => void;
  scoring: boolean;
  onScore: () => void;
}

export default function ScoringForm({ form, setForm, scoring, onScore }: Props) {
  const inputClasses = "w-full bg-white border border-black/10 rounded-lg px-4 py-2.5 text-black font-mono text-sm focus:outline-none focus:border-black/30 focus:ring-1 focus:ring-black/10 transition-all";
  const labelClasses = "block text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-1.5";

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border border-black/8 rounded-2xl p-6 shadow-sm relative overflow-hidden"
    >
      <h2 className="text-xl font-semibold text-black mb-6" style={{ letterSpacing: '-0.02em' }}>Score Transaction</h2>
      
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Txn ID <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px]">(Reference)</span></label>
            <input type="number" className={inputClasses} value={form.txnId} onChange={e => setForm({...form, txnId: +e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>Date/Time (s) <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px]">(Seconds elapsed)</span></label>
            <input type="number" className={inputClasses} value={form.txnDt} onChange={e => setForm({...form, txnDt: +e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Amount (₹)</label>
            <input type="number" step="0.01" className={inputClasses} value={form.amt} onChange={e => setForm({...form, amt: +e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>Product <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px]">(Purchase category)</span></label>
            <input type="text" className={inputClasses} value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClasses}>Card Token <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px]">(Internal anonymized ID)</span></label>
            <input type="number" className={inputClasses} value={form.card1} onChange={e => setForm({...form, card1: +e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>Network <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px]">(Brand)</span></label>
            <select className={inputClasses} value={form.card4} onChange={e => setForm({...form, card4: e.target.value})}>
              <option value="visa">visa</option>
              <option value="mastercard">mastercard</option>
              <option value="discover">discover</option>
              <option value="american express">amex</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Funding <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px]">(Credit/Debit)</span></label>
            <select className={inputClasses} value={form.card6} onChange={e => setForm({...form, card6: e.target.value})}>
              <option value="debit">debit</option>
              <option value="credit">credit</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClasses}>Email</label>
          <input type="text" className={inputClasses} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>

        <button 
          onClick={onScore} 
          disabled={scoring}
          className="w-full bg-black text-white py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors duration-200 group"
        >
          {scoring ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span className="font-medium text-sm">Execute Risk Analysis</span>
              <span className="bg-white rounded-full p-1.5 flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
