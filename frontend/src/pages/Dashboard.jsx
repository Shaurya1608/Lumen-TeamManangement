import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import TaskBoard from '../components/TaskBoard';
import { Plus, X, AlertCircle, CheckCircle, Loader, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:5000';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { socket } = useSocket();
  const { user, token } = useAuth();

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchUsers();

    if (socket) {
      socket.on('task_created', (t) => setTasks(prev => [t, ...prev]));
      socket.on('task_updated', (t) => setTasks(prev => prev.map(x => x._id === t._id ? t : x)));
      socket.on('task_deleted', (id) => setTasks(prev => prev.filter(x => x._id !== id)));
    }

    return () => {
      if (socket) {
        socket.off('task_created');
        socket.off('task_updated');
        socket.off('task_deleted');
      }
    };
  }, [socket]);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTasks = async () => {
    const res = await fetch(`${API}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API}/api/tasks`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...newTask,
          createdBy: user._id,
          assignee: newTask.assignee || null
        })
      });
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', assignee: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    await fetch(`${API}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: newStatus })
    });
  };

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
  };

  const priorityOptions = [
    { value: 'low',    label: 'Low Priority',    color: 'text-emerald-400' },
    { value: 'medium', label: 'Medium Priority', color: 'text-brand-blue' },
    { value: 'high',   label: 'High Priority',   color: 'text-rose-400' },
  ];

  return (
    <div className="h-full flex flex-col gap-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Project Overview</h1>
          <p className="text-slate-400 font-medium">
            Welcome back, <span className="text-white font-semibold">{user?.name}</span> — You have {tasks.length} active tasks.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-white text-dark-900 hover:bg-slate-200 font-bold py-3 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] shrink-0"
        >
          <Plus size={18} strokeWidth={3} />
          Create Task
        </motion.button>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {[
          { icon: <AlertCircle size={20} />, label: 'Total Tasks',  value: stats.total,      color: 'text-white bg-white/[0.05]', iconColor: 'text-slate-300' },
          { icon: <Zap size={20} />,       label: 'In Progress',  value: stats.inProgress, color: 'text-white bg-brand-blue/10 border-brand-blue/20', iconColor: 'text-brand-blue' },
          { icon: <CheckCircle size={20} />,  label: 'Completed',    value: stats.done,        color: 'text-white bg-emerald-400/10 border-emerald-400/20', iconColor: 'text-emerald-400' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
            className={`relative overflow-hidden flex items-center gap-5 px-6 py-5 rounded-[24px] border border-white/[0.05] ${stat.color}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-dark-900/50 shadow-inner ${stat.iconColor}`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-3xl font-bold leading-none tracking-tight">{stat.value}</div>
              <div className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-widest">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Board */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex-1 min-h-0">
        <TaskBoard tasks={tasks} onUpdateStatus={handleUpdateStatus} />
      </motion.div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-dark-900/80 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="glass-card w-full max-w-lg rounded-[2rem] p-8 sm:p-10 relative z-10 shadow-2xl overflow-hidden"
            >
              {/* Subtle glowing orb inside modal */}
              <div className="absolute top-[-50%] right-[-50%] w-full h-full rounded-full bg-brand-blue/20 blur-[100px] pointer-events-none" />

              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold mb-2 text-white tracking-tight">Create New Task</h2>
              <p className="text-sm font-medium text-slate-400 mb-8">Add a new task to your project board.</p>

              <form onSubmit={handleCreateTask} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Task Title</label>
                  <input
                    required
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] focus:border-brand-blue/50 focus:bg-white/[0.05] rounded-2xl px-5 py-3.5 outline-none transition-all text-white placeholder:text-slate-600 shadow-inner font-medium"
                    placeholder="What needs to be done?"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Description</label>
                  <textarea
                    rows={3}
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] focus:border-brand-blue/50 focus:bg-white/[0.05] rounded-2xl px-5 py-3.5 outline-none resize-none transition-all text-white placeholder:text-slate-600 shadow-inner font-medium custom-scrollbar"
                    placeholder="Add more details..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Priority</label>
                    <div className="space-y-2.5">
                      {priorityOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewTask({...newTask, priority: opt.value})}
                          className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between ${
                            newTask.priority === opt.value
                              ? `${opt.color} bg-white/[0.05] border-white/[0.1] shadow-inner`
                              : 'text-slate-500 bg-white/[0.01] border-transparent hover:bg-white/[0.03]'
                          }`}
                        >
                          {opt.label}
                          {newTask.priority === opt.value && <CheckCircle size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Assignee</label>
                    <div className="relative">
                      <select
                        value={newTask.assignee}
                        onChange={e => setNewTask({...newTask, assignee: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] focus:border-brand-blue/50 focus:bg-white/[0.05] rounded-2xl px-5 py-3.5 outline-none transition-all text-white shadow-inner font-medium appearance-none"
                      >
                        <option value="" className="bg-dark-800">Unassigned</option>
                        {users.map(u => (
                          <option key={u._id} value={u._id} className="bg-dark-800">{u.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-4 rounded-2xl mt-6 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50"
                >
                  {submitting ? <Loader size={20} className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
                  {submitting ? 'Creating Task...' : 'Create Task'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
