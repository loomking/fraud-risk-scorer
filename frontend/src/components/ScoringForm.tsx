import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";

interface FormState {
  txnId: number;
  txnDt: number;
  amt: number;
  product: string;
  card1: number;
  card4: string;
  card6: string;
  email: string;
}

interface Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  scoring: boolean;
  onScore: () => void;
}

export default function ScoringForm({ form, setForm, scoring, onScore }: Props) {
  const inputClasses = "w-full bg-[#13192B]/80 border border-[#3054ff]/20 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#3054ff] focus:ring-1 focus:ring-[#3054ff] transition-all backdrop-blur-sm";
  const labelClasses = "block text-[11px] font-bold uppercase tracking-wider text-[#adc6ff]/50 mb-1.5 font-medium";

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#0B101E]/60 border border-[#3054ff]/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)] rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden"
    >
      <div className="absolute top-[-50%] left-[-10%] w-[300px] h-[300px] bg-[#3054ff]/10 blur-[80px] pointer-events-none rounded-full" />
      
      <h2 className="text-xl font-semibold text-white mb-6 relative z-10">Score Transaction</h2>
      
      <div className="flex flex-col gap-5 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Txn ID</label>
            <input type="number" className={inputClasses} value={form.txnId} onChange={e => setForm({...form, txnId: parseInt(e.target.value) || 0})} />
          </div>
          <div>
            <label className={labelClasses}>Date/Time (s)</label>
            <input type="number" className={inputClasses} value={form.txnDt} onChange={e => setForm({...form, txnDt: parseInt(e.target.value) || 0})} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Amount (₹)</label>
            <input type="number" step="0.01" className={inputClasses} value={form.amt} onChange={e => setForm({...form, amt: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <label className={labelClasses}>Product</label>
            <input type="text" className={inputClasses} value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClasses}>Card Token</label>
            <input type="number" className={inputClasses} value={form.card1} onChange={e => setForm({...form, card1: parseInt(e.target.value) || 0})} />
          </div>
          <div>
            <label className={labelClasses}>Network</label>
            <select className={inputClasses} value={form.card4} onChange={e => setForm({...form, card4: e.target.value})}>
              <option value="visa" className="bg-[#1a1a1a]">visa</option>
              <option value="mastercard" className="bg-[#1a1a1a]">mastercard</option>
              <option value="discover" className="bg-[#1a1a1a]">discover</option>
              <option value="american express" className="bg-[#1a1a1a]">amex</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Funding</label>
            <select className={inputClasses} value={form.card6} onChange={e => setForm({...form, card6: e.target.value})}>
              <option value="debit" className="bg-[#1a1a1a]">debit</option>
              <option value="credit" className="bg-[#1a1a1a]">credit</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClasses}>Email</label>
          <input type="email" className={inputClasses} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>

        <button 
          onClick={onScore}
          disabled={scoring}
          className="group mt-2 relative w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl hover:scale-[1.02] transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          {scoring ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span className="font-semibold text-sm">Execute Risk Analysis</span>
              <div className="w-6 h-6 rounded-full bg-[#3054ff] group-hover:bg-[#2040e0] flex items-center justify-center transition-colors">
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </div>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
