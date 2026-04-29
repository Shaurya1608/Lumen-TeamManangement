import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const role = formData.name.toLowerCase() === 'admin' ? 'admin' : 'member';

      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign up');
      
      login(data.user, data.token);
      navigate(data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-dark-900">
      <div 
        className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full blur-[100px] opacity-20 bg-brand-purple/40 pointer-events-none"
        style={{ willChange: 'transform' }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="glass-card max-w-md w-full rounded-[2rem] p-8 sm:p-10 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-20 h-20 bg-gradient-to-br from-brand-purple to-brand-blue rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(139,92,246,0.4)] p-[2px]"
          >
            <div className="w-full h-full bg-dark-900 rounded-[22px] flex items-center justify-center">
              <UserPlus size={36} className="text-white" />
            </div>
          </motion.div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight text-white">Join Lumen</h1>
          <p className="text-slate-400 font-medium">Create your premium account</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-semibold text-center shadow-inner">
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Full Name</label>
             <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] focus:border-brand-purple/50 focus:bg-white/[0.05] rounded-2xl px-5 py-4 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner font-medium" placeholder="John Doe" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email Address</label>
             <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] focus:border-brand-purple/50 focus:bg-white/[0.05] rounded-2xl px-5 py-4 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner font-medium" placeholder="you@example.com" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
             <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] focus:border-brand-purple/50 focus:bg-white/[0.05] rounded-2xl px-5 py-4 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner font-medium" placeholder="••••••••" />
           </div>
           
           <motion.button 
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             type="submit" 
             disabled={loading} 
             className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-purple to-brand-blue text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-50 text-base"
           >
             {loading ? 'Creating Account...' : 'Sign Up'}
             <ArrowRight size={20} />
           </motion.button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-400">
          Already a member? <Link to="/login" className="text-white hover:text-brand-purple transition-colors relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-px after:bg-brand-purple after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left">Log in here</Link>
        </p>
      </motion.div>
    </div>
  );
}
