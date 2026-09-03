import { motion } from "motion/react";
import { ArrowRight, Loader2, Info } from "lucide-react";

interface Props {
  form: any;
  setForm: (f: any) => void;
  scoring: boolean;
  onScore: () => void;
}

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative group inline-flex items-center ml-1.5 align-middle">
    <Info className="w-3.5 h-3.5 text-black/30 hover:text-black/60 cursor-help transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 w-48 p-2.5 bg-gray-900 text-white text-[11px] leading-relaxed normal-case tracking-normal rounded-lg shadow-xl z-20 text-center font-medium">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

export default function ScoringForm({ form, setForm, scoring, onScore }: Props) {
  const inputClasses = "w-full bg-white border border-black/10 rounded-lg px-4 py-2.5 text-black font-mono text-sm focus:outline-none focus:border-black/30 focus:ring-1 focus:ring-black/10 transition-all";
  const labelClasses = "block text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-1.5 flex items-center";

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border border-black/8 rounded-2xl p-6 shadow-sm relative overflow-visible"
    >
      <h2 className="text-xl font-semibold text-black mb-6" style={{ letterSpacing: '-0.02em' }}>Score Transaction</h2>
      
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>
              Txn ID <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px] mr-0.5">(Reference)</span>
              <InfoTooltip text="A unique sequential identifier representing this specific transaction request." />
            </label>
            <input type="number" className={inputClasses} value={form.txnId} onChange={e => setForm({...form, txnId: +e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>
              Date/Time (s) <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px] mr-0.5">(Seconds elapsed)</span>
              <InfoTooltip text="Time elapsed in seconds since the first recorded transaction in the dataset." />
            </label>
            <input type="number" className={inputClasses} value={form.txnDt} onChange={e => setForm({...form, txnDt: +e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>
              Amount (₹)
              <InfoTooltip text="The transaction value in Indian Rupees (INR)." />
            </label>
            <input type="number" step="0.01" className={inputClasses} value={form.amt} onChange={e => setForm({...form, amt: +e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>
              Product <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px] mr-0.5">(Purchase category)</span>
              <InfoTooltip text="The broad category of the product or service being purchased." />
            </label>
            <input type="text" className={inputClasses} value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClasses}>
              Card Token <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px] mr-0.5">(Internal anonymized ID)</span>
              <InfoTooltip text="An anonymized, hashed identifier representing the specific funding card used." />
            </label>
            <input type="number" className={inputClasses} value={form.card1} onChange={e => setForm({...form, card1: +e.target.value})} />
          </div>
          <div>
            <label className={labelClasses}>
              Network <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px] mr-0.5">(Brand)</span>
              <InfoTooltip text="The payment network brand (e.g., Visa, Mastercard)." />
            </label>
            <select className={inputClasses} value={form.card4} onChange={e => setForm({...form, card4: e.target.value})}>
              <option value="visa">visa</option>
              <option value="mastercard">mastercard</option>
              <option value="discover">discover</option>
              <option value="american express">amex</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>
              Funding <span className="normal-case tracking-normal font-normal text-black/30 ml-1 text-[10px] mr-0.5">(Credit/Debit)</span>
              <InfoTooltip text="The type of funding source (Credit card or Debit card)." />
            </label>
            <select className={inputClasses} value={form.card6} onChange={e => setForm({...form, card6: e.target.value})}>
              <option value="debit">debit</option>
              <option value="credit">credit</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClasses}>
            Email
            <InfoTooltip text="The domain of the purchaser's email address (e.g., gmail.com, yahoo.com)." />
          </label>
          <input type="text" className={inputClasses} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>

        <button 
          onClick={onScore} 
          disabled={scoring}
          className="w-full bg-black text-white py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors duration-200 group mt-2"
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
