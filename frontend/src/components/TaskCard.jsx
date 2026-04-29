import { motion } from 'framer-motion';
import { Calendar, AlertCircle, Clock, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TaskCard({ task, onUpdateStatus }) {
  const isDone = task.status === 'done';
  
  const priorityConfig = {
    low: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', glow: 'bg-emerald-500' },
    medium: { color: 'text-brand-blue', bg: 'bg-brand-blue/10', border: 'border-brand-blue/20', glow: 'bg-brand-blue' },
    high: { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30', glow: 'bg-rose-500', shadow: 'shadow-[0_0_15px_rgba(251,113,133,0.15)]' }
  };
  
  const pConf = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden glass-card p-6 rounded-[24px] cursor-default group ${isDone ? 'opacity-50 grayscale-[40%]' : ''}`}
    >
      {/* Ambient Light Source */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 blur-[50px] rounded-full pointer-events-none opacity-20 transition-opacity duration-500 group-hover:opacity-40 ${pConf.glow}`} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl border ${pConf.color} ${pConf.bg} ${pConf.border} ${pConf.shadow || ''}`}>
          {task.priority === 'high' && <AlertCircle size={12} strokeWidth={3} />}
          {task.priority}
        </span>
        
        <div className="flex items-center gap-2">
          {!isDone && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono bg-dark-800/50 px-2 py-1 rounded-lg border border-white/[0.05]">
              <Clock size={12} />
              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </div>
          )}
          <button className="p-1 text-slate-600 hover:text-white transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
      
      <h4 className="font-bold text-white text-[16px] mb-2 leading-snug break-words relative z-10">
        {task.title}
      </h4>
      
      {task.description && (
        <p className="text-[13px] text-slate-400/90 mb-6 line-clamp-2 leading-relaxed relative z-10 font-medium">
           {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/[0.05] relative z-10">
        {task.assignee ? (
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple p-[1px] shadow-lg">
               <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center font-bold text-xs text-white">
                 {task.assignee.name.charAt(0)}
               </div>
             </div>
             <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
               {task.assignee.name.split(' ')[0]}
             </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-full bg-white/[0.02] border border-dashed border-white/[0.1] flex items-center justify-center">
               <span className="text-slate-600 text-xs font-bold">?</span>
             </div>
             <span className="text-[11px] text-slate-500 font-medium italic">Unassigned</span>
          </div>
        )}

        {isDone && task.completedAt ? (
           <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-400/10 px-3 py-1.5 rounded-xl border border-emerald-400/20">
             <Calendar size={14} />
             {new Date(task.completedAt).toLocaleDateString()}
           </div>
        ) : (
          <div className="relative group/select">
            <select 
               value={task.status}
               onChange={(e) => onUpdateStatus(task._id, e.target.value)}
               className="bg-white/[0.03] border border-white/[0.1] hover:border-brand-blue/50 outline-none text-xs font-bold rounded-xl py-2 pl-3 pr-8 cursor-pointer focus:ring-2 focus:ring-brand-blue/30 transition-all appearance-none text-white"
            >
               <option value="todo" className="bg-dark-800 text-slate-300">To Do</option>
               <option value="in-progress" className="bg-dark-800 text-brand-blue">In Progress</option>
               <option value="in-review" className="bg-dark-800 text-amber-400">Review</option>
               <option value="done" className="bg-dark-800 text-emerald-400">Done</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-white transition-colors">
               <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
