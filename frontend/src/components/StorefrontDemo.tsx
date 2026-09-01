import { useState } from 'react';
import { Shield, ShoppingCart, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const API = (window.location.origin === "null" || window.location.protocol === "file:" || window.location.hostname === "localhost") 
    ? "http://localhost:10000" 
    : window.location.origin;

const PRODUCTS = [
  { id: 1, name: "Premium Leather Wallet", price: 1299.00, color: "bg-stone-200" },
  { id: 2, name: "Wireless Noise-Cancelling Headphones", price: 14500.00, color: "bg-slate-200" },
  { id: 3, name: "Mechanical Keyboard (Cherry MX)", price: 8999.00, color: "bg-indigo-50" },
  { id: 4, name: "Minimalist Watch", price: 4500.00, color: "bg-gray-200" }
];

export default function StorefrontDemo() {
  const [cart, setCart] = useState<typeof PRODUCTS>([]);
  const [checkoutStep, setCheckoutStep] = useState<'shop' | 'checkout' | 'result'>('shop');
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<{decision: string, transaction_id: number} | null>(null);
  
  // Checkout Form State
  const [form, setForm] = useState({
    email: 'customer@gmail.com',
    card1: 4000,
    card4: 'visa',
    card6: 'debit',
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const addToCart = (p: typeof PRODUCTS[0]) => {
    setCart([...cart, p]);
  };

  const handleScore = async () => {
    setScoring(true);
    const payload = {
        TransactionID: Math.floor(1000000 + Math.random() * 9000000), // Generate random TxnID
        TransactionDT: 86400, // Dummy
        TransactionAmt: cartTotal,
        ProductCD: 'W',
        card1: form.card1,
        card4: form.card4,
        card6: form.card6,
        P_emaildomain: form.email.includes('@') ? form.email.split('@')[1] : form.email
    };

    try {
        const res = await fetch(`${API}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (!res.ok) {
            alert(`Error: ${JSON.stringify(data)}`);
            setScoring(false);
            return;
        }

        setResult({ decision: data.decision, transaction_id: data.transaction_id });
        setCheckoutStep('result');
    } catch (e: any) {
        alert(`Network error: ${e.message}`);
    }
    setScoring(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-['Inter'] text-gray-900 selection:bg-black/10 flex flex-col">
      
      {/* Navbar */}
      <nav className="px-6 py-4 bg-white border-b border-black/8 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCheckoutStep('shop')}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-black">ModernStore</span>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => window.location.hash = '#dashboard'}
              className="text-sm font-medium text-black/50 hover:text-black transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4" />
              Back to Risk Dashboard
            </button>
            <button 
              onClick={() => { if (cart.length > 0) setCheckoutStep('checkout'); }}
              className="relative p-2 text-black hover:bg-black/5 rounded-full transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 py-12">
        
        {checkoutStep === 'shop' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="mb-10">
              <h1 className="text-3xl font-semibold tracking-tight text-black mb-2">Featured Products</h1>
              <p className="text-black/50 text-lg">Select items to test the checkout flow.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PRODUCTS.map(p => (
                <div key={p.id} className="bg-white border border-black/8 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                  <div className={`w-full h-48 ${p.color} flex items-center justify-center`}>
                    <span className="text-black/10 font-bold text-4xl">IMG</span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-medium text-black line-clamp-2 mb-2">{p.name}</h3>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-mono font-semibold">₹{p.price.toLocaleString('en-IN')}</span>
                      <button 
                        onClick={() => addToCart(p)}
                        className="text-xs font-semibold px-3 py-1.5 bg-black/5 hover:bg-black/10 text-black rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6">
                <span className="font-medium">{cart.length} item{cart.length > 1 ? 's' : ''} in cart</span>
                <button 
                  onClick={() => setCheckoutStep('checkout')}
                  className="px-5 py-2 bg-white text-black font-semibold rounded-full text-sm hover:bg-gray-100 transition-colors"
                >
                  Checkout ₹{cartTotal.toLocaleString('en-IN')}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {checkoutStep === 'checkout' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto mt-8">
            <div className="bg-white border border-black/8 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-black">Checkout</h2>
                <button onClick={() => setCheckoutStep('shop')} className="text-sm font-medium text-black/50 hover:text-black">Cancel</button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-black/5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-2">Order Summary</div>
                <div className="flex justify-between items-center font-mono text-lg font-semibold text-black">
                  <span>Total Amount</span>
                  <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-1.5">Email Address</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-white border border-black/10 rounded-lg px-4 py-3 text-black text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-1.5">Card Bin (card1)</label>
                    <input type="number" value={form.card1} onChange={e => setForm({...form, card1: +e.target.value})} className="w-full bg-white border border-black/10 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-1.5">Network (card4)</label>
                    <select value={form.card4} onChange={e => setForm({...form, card4: e.target.value})} className="w-full bg-white border border-black/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all">
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="discover">Discover</option>
                      <option value="american express">Amex</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/40 mb-1.5">Type (card6)</label>
                  <select value={form.card6} onChange={e => setForm({...form, card6: e.target.value})} className="w-full bg-white border border-black/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all">
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleScore}
                disabled={scoring}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {scoring ? 'Processing...' : 'Complete Purchase'}
                {!scoring && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}

        {checkoutStep === 'result' && result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto mt-16 text-center">
            
            {result.decision === 'FLAG' ? (
              <div className="bg-white border border-red-200 rounded-3xl p-10 shadow-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-semibold text-black mb-3">Transaction Flagged</h2>
                <p className="text-black/60 mb-8 max-w-sm">
                  This transaction has been flagged for review by our risk system. It has been halted pending audit.
                </p>
                <button 
                  onClick={() => window.location.hash = '#dashboard'}
                  className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-full transition-colors flex items-center gap-2"
                >
                  View Audit Trail for #{result.transaction_id}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="bg-white border border-green-200 rounded-3xl p-10 shadow-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-semibold text-black mb-3">Order Confirmed</h2>
                <p className="text-black/60 mb-8 max-w-sm">
                  Thank you for your purchase. Your transaction was processed successfully.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setCart([]); setCheckoutStep('shop'); }}
                    className="bg-black/5 hover:bg-black/10 text-black font-medium px-6 py-3 rounded-full transition-colors"
                  >
                    Continue Shopping
                  </button>
                  <button 
                    onClick={() => window.location.hash = '#dashboard'}
                    className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-full transition-colors"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            )}
            
          </motion.div>
        )}

      </main>
    </div>
  );
}
