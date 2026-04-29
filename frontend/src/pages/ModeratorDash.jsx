import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import TaskBoard from '../components/TaskBoard';
import { Plus, Check, X, Users, LayoutDashboard, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:5000';

export default function ModeratorDash() {
  const { user, token } = useAuth();
  const { socket } = useSocket();

  const [group, setGroup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [tab, setTab] = useState('board');
  const [loading, setLoading] = useState(true);

  // New group form
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [groupError, setGroupError] = useState('');

  // New task modal
  const [isTaskModal, setIsTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assignee: '' });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchData();
    if (socket) {
      socket.on('group_updated', g => { if (group && g._id === group._id) setGroup(g); });
      socket.on('task_created', t => { if (t.group === group?._id) setTasks(p => [t, ...p]); });
      socket.on('task_updated', t => setTasks(p => p.map(x => x._id === t._id ? t : x)));
      socket.on('task_deleted', id => setTasks(p => p.filter(x => x._id !== id)));
    }
    return () => socket && ['group_updated','task_created','task_updated','task_deleted'].forEach(e => socket.off(e));
  }, [socket, group?._id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gr, tr, ur] = await Promise.all([
        fetch(`${API}/api/groups`, { headers }).then(r => r.json()),
        fetch(`${API}/api/tasks`, { headers }).then(r => r.json()),
        fetch(`${API}/api/users`, { headers }).then(r => r.json()),
      ]);
      setGroup(Array.isArray(gr) ? gr[0] : null);
      setTasks(Array.isArray(tr) ? tr : []);
      setAllUsers(Array.isArray(ur) ? ur : []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async e => {
    e.preventDefault(); setGroupError('');
    try {
      const res = await fetch(`${API}/api/groups`, { method: 'POST', headers, body: JSON.stringify(groupForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroup(data);
    } catch (err) { setGroupError(err.message); }
  };

  const handleAccept = async (userId) => {
    const res = await fetch(`${API}/api/groups/${group._id}/accept/${userId}`, { method: 'PUT', headers });
    const data = await res.json();
    if (res.ok) setGroup(data);
  };

  const handleReject = async (userId) => {
    const res = await fetch(`${API}/api/groups/${group._id}/reject/${userId}`, { method: 'PUT', headers });
    const data = await res.json();
    if (res.ok) setGroup(data);
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the group?')) return;
    const res = await fetch(`${API}/api/groups/${group._id}/member/${userId}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (res.ok) setGroup(data);
  };

  const handleCreateTask = async e => {
    e.preventDefault();
    await fetch(`${API}/api/tasks`, {
      method: 'POST', headers,
      body: JSON.stringify({ ...newTask, createdBy: user._id, group: group._id, assignee: newTask.assignee || null })
    });
    setIsTaskModal(false);
    setNewTask({ title: '', description: '', priority: 'medium', assignee: '' });
  };

  const handleUpdateStatus = async (taskId, status) => {
    await fetch(`${API}/api/tasks/${taskId}`, { method: 'PUT', headers, body: JSON.stringify({ status }) });
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading your group…</div>;

  // No group yet — show create form
  if (!group) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-purple/10 border border-brand-purple/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(139,92,246,0.25)]">
            <Users size={32} className="text-brand-purple" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Create Your Group</h2>
          <p className="text-slate-400 text-sm">Set up your business team and start managing tasks</p>
        </div>
        {groupError && <div className="mb-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">{groupError}</div>}
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Group Name *</label>
            <input type="text" required value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})}
              className="w-full bg-dark-800 border border-dark-700/60 focus:border-brand-purple/50 rounded-xl px-4 py-3 text-sm outline-none transition-all"
              placeholder="e.g. Design Team" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea rows={3} value={groupForm.description} onChange={e => setGroupForm({...groupForm, description: e.target.value})}
              className="w-full bg-dark-800 border border-dark-700/60 focus:border-brand-purple/50 rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all"
              placeholder="What does this team do?" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all shadow-lg">
            Create Group 🚀
          </button>
        </form>
      </motion.div>
    </div>
  );

  const pending = group.joinRequests || [];
  const members = group.members || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-brand-purple" />
            <span className="text-xs font-semibold text-brand-purple uppercase tracking-wider">Moderator</span>
          </div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{group.description || 'Your business team'}</p>
        </div>
        {tab === 'board' && (
          <button onClick={() => setIsTaskModal(true)}
            className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm py-2.5 px-5 rounded-xl transition-all shadow-lg shrink-0">
            <Plus size={17} strokeWidth={2.5} /> New Task
          </button>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Members', value: members.length, color: 'text-brand-blue', bg: 'bg-brand-blue/10 border-brand-blue/20' },
          { label: 'Pending', value: pending.length, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
          { label: 'Tasks Done', value: tasks.filter(t => t.status === 'done').length, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
        ].map(s => (
          <div key={s.label} className={`px-4 py-4 rounded-2xl border ${s.bg} flex items-center gap-3`}>
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800/50 border border-dark-700/40 p-1 rounded-2xl w-fit">
        {[
          { id: 'board', label: 'Task Board', icon: LayoutDashboard },
          { id: 'members', label: 'Members', icon: Users },
          { id: 'requests', label: `Requests${pending.length ? ` (${pending.length})` : ''}`, icon: Shield },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id ? 'bg-dark-700 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-300'
            }`}>
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
            {t.id === 'requests' && pending.length > 0 && (
              <span className="bg-amber-400 text-dark-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Task Board */}
      {tab === 'board' && <TaskBoard tasks={tasks} onUpdateStatus={handleUpdateStatus} />}

      {/* Members */}
      {tab === 'members' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-5">Group Members ({members.length})</h2>
          <div className="space-y-3">
            {members.map(m => {
              const isMod = m._id === group.moderator?._id;
              const mTasks = tasks.filter(t => t.assignee?._id === m._id);
              const done = mTasks.filter(t => t.status === 'done').length;
              return (
                <div key={m._id} className="flex items-center gap-4 p-4 rounded-2xl border border-dark-700/40 bg-dark-800/30 hover:bg-dark-800/60 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {m.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-200">{m.name}</span>
                      {isMod && <span className="text-[10px] bg-brand-purple/15 text-brand-purple px-2 py-0.5 rounded-full font-semibold border border-brand-purple/20">Moderator</span>}
                    </div>
                    <div className="text-[11px] text-slate-500">{m.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1 flex-1 bg-dark-700 rounded-full overflow-hidden max-w-[100px]">
                        <div className="h-full bg-gradient-to-r from-brand-blue to-emerald-400 rounded-full" style={{ width: mTasks.length ? `${Math.round((done/mTasks.length)*100)}%` : '0%' }} />
                      </div>
                      <span className="text-[10px] text-slate-500">{done}/{mTasks.length} tasks</span>
                    </div>
                  </div>
                  {!isMod && (
                    <button onClick={() => handleRemoveMember(m._id)} className="text-slate-600 hover:text-red-400 transition-colors p-2">
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Join Requests */}
      {tab === 'requests' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-5">Pending Join Requests ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm">No pending requests right now.</div>
          ) : (
            <div className="space-y-3">
              {pending.map(req => (
                <div key={req._id} className="flex items-center gap-4 p-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-bold text-amber-400 shrink-0">
                    {req.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-200">{req.name}</div>
                    <div className="text-[11px] text-slate-500">{req.email}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleAccept(req._id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-400/15 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/25 rounded-xl text-xs font-semibold transition-all">
                      <Check size={14} /> Accept
                    </button>
                    <button onClick={() => handleReject(req._id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-400/10 border border-red-400/20 text-red-400 hover:bg-red-400/20 rounded-xl text-xs font-semibold transition-all">
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {isTaskModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm" onClick={() => setIsTaskModal(false)} />
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92 }}
              className="glass w-full max-w-md rounded-3xl p-8 relative z-10 shadow-2xl">
              <button onClick={() => setIsTaskModal(false)} className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-dark-800/60 text-slate-500 hover:text-slate-200 hover:bg-dark-700 flex items-center justify-center transition-all">
                <X size={18} />
              </button>
              <h2 className="text-xl font-bold mb-6">New Task for {group.name}</h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full bg-dark-800/60 border border-dark-700/60 focus:border-brand-blue/50 rounded-xl px-4 py-3 text-sm outline-none"
                  placeholder="Task title *" />
                <textarea rows={2} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full bg-dark-800/60 border border-dark-700/60 focus:border-brand-blue/50 rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  placeholder="Description (optional)" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}
                    className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <select value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})}
                    className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold py-3 rounded-xl transition-all">
                  Create Task
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
