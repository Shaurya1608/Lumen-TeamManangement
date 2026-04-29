import { AnimatePresence, motion } from 'framer-motion';
import TaskCard from './TaskCard';

const columnConfig = [
  { id: 'todo',        title: 'To Do',       dot: 'bg-slate-400',   glow: 'rgba(148,163,184,0.15)' },
  { id: 'in-progress', title: 'In Progress', dot: 'bg-brand-blue',  glow: 'rgba(59,130,246,0.15)' },
  { id: 'in-review',   title: 'In Review',   dot: 'bg-amber-400',   glow: 'rgba(251,191,36,0.15)' },
  { id: 'done',        title: 'Completed',   dot: 'bg-emerald-400', glow: 'rgba(52,211,153,0.15)' },
];

export default function TaskBoard({ tasks, onUpdateStatus }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory xl:grid xl:grid-cols-4 xl:overflow-visible xl:pb-0 h-full"
         style={{ scrollbarWidth: 'none' }}>
      {columnConfig.map((col, i) => {
        const colTasks = tasks.filter(t => t.status === col.id);

        return (
          <motion.div
            key={col.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col shrink-0 snap-start w-[85vw] sm:w-[60vw] md:w-[45vw] xl:w-auto bg-white/[0.01] rounded-[32px] border border-white/[0.03] overflow-hidden relative group"
          >
            {/* Animated Column Glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                 style={{ background: `radial-gradient(circle at 50% 0%, ${col.glow}, transparent 70%)` }} />

            {/* Column header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05] shrink-0 relative z-10 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${col.dot} shadow-[0_0_10px_currentColor]`} />
                <h3 className="font-bold text-sm tracking-wide text-white uppercase">{col.title}</h3>
              </div>
              <motion.span
                key={colTasks.length}
                initial={{ scale: 1.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="bg-white/[0.05] text-xs px-3 py-1 rounded-xl text-slate-300 font-bold border border-white/[0.08] shadow-inner"
              >
                {colTasks.length}
              </motion.span>
            </div>

            {/* Tasks container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] max-h-[65vh] xl:max-h-[calc(100vh-280px)] custom-scrollbar relative z-10">
              <AnimatePresence mode="popLayout">
                {colTasks.map(task => (
                  <TaskCard key={task._id} task={task} onUpdateStatus={onUpdateStatus} />
                ))}
                {colTasks.length === 0 && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-16 gap-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-white/[0.05] flex items-center justify-center bg-white/[0.01]">
                       <span className="text-slate-600 text-3xl font-light">+</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-400">No tasks</p>
                      <p className="text-xs text-slate-600 mt-1">Drag or create a task here</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
