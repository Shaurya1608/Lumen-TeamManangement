import { LayoutDashboard, Users, LogOut, Zap, ChevronRight, X, Shield, Compass, BarChart3 } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const roleBadge = {
  admin: { label: 'Admin', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.2)]' },
  moderator: { label: 'Moderator', cls: 'bg-brand-purple/10 text-brand-purple border-brand-purple/20 shadow-[0_0_10px_rgba(139,92,246,0.2)]' },
  member: { label: 'Member', cls: 'bg-slate-700/50 text-slate-400 border-slate-700' },
};

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Task Board', roles: ['admin', 'moderator', 'member'] },
    { to: '/business', icon: BarChart3, label: 'Business Dashboard', roles: ['admin'] },
    { to: '/admin', icon: Shield, label: 'Admin Panel', roles: ['admin'] },
    { to: '/moderator', icon: Users, label: 'My Group', roles: ['moderator'] },
    { to: '/groups', icon: Compass, label: 'Browse Groups', roles: ['member'] },
  ].filter(item => item.roles.includes(user?.role));

  const badge = roleBadge[user?.role] || roleBadge.member;

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-56 lg:w-60 border-r border-white/[0.05] bg-dark-950/80 backdrop-blur-3xl h-screen flex flex-col relative overflow-hidden"
    >
      {/* Glass reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.05] shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="relative group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all duration-500">
              <Zap size={16} className="text-white fill-white/40" />
            </div>
          </div>
          <span className="text-lg font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">Lumen</span>
        </div>
        <button onClick={onClose} className="lg:hidden w-7 h-7 rounded-lg bg-dark-800 border border-white/[0.05] text-slate-400 hover:text-white flex items-center justify-center transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-6 space-y-1 overflow-y-auto relative z-10">
        <p className="px-3 text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-3 opacity-60">Menu</p>
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all group relative overflow-hidden ${
                isActive ? 'text-white font-semibold shadow-lg shadow-black/10' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-0 bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 border border-white/[0.05] rounded-xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={17} className={`relative z-10 shrink-0 transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
              <span className="relative z-10 flex-1 tracking-normal">{label}</span>
              {isActive && (
                <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="relative z-10">
                  <ChevronRight size={14} className="text-white/30" />
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Block at bottom */}
      <div className="p-3 shrink-0 relative z-10">
        <div className="glass p-3 rounded-2xl border border-white/[0.03] bg-white/[0.01] flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple p-[1.5px] shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center font-bold text-xs text-white">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-white truncate tracking-wide leading-tight">{user?.name}</div>
              <div className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${badge.cls}`}>
                {badge.label}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold text-rose-400 bg-rose-400/5 hover:bg-rose-400/10 border border-rose-400/10 transition-all group">
            <LogOut size={12} className="group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
