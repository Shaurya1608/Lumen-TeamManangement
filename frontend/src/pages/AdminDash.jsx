import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Activity, Users, CheckCircle, Shield, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const API = 'http://localhost:5000';

const ROLES = [
  { value: 'member', label: '👤 Member', cls: 'bg-slate-700/50 text-slate-300 border-slate-600' },
  { value: 'moderator', label: '🛡️ Moderator', cls: 'bg-brand-purple/15 text-brand-purple border-brand-purple/30' },
  { value: 'admin', label: '👑 Admin', cls: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
];

export default function AdminDash() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('members');
  const { socket } = useSocket();
  const { token } = useAuth();

  useEffect(() => {
    fetchAll();
    if (socket) {
      socket.on('user_created', u => setUsers(p => [...p, u]));
      socket.on('user_updated', u => setUsers(p => p.map(x => x._id === u._id ? { ...x, ...u } : x)));
      socket.on('task_updated', t => setTasks(p => p.map(x => x._id === t._id ? t : x)));
      socket.on('task_created', t => setTasks(p => [...p, t]));
      socket.on('group_created', g => setGroups(p => [...p, g]));
      socket.on('group_updated', g => setGroups(p => p.map(x => x._id === g._id ? g : x)));
    }
    return () => socket && ['user_created','user_updated','task_updated','task_created','group_created','group_updated']
      .forEach(e => socket.off(e));
  }, [socket]);

  const fetchAll = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [ur, tr, gr] = await Promise.all([
      fetch(`${API}/api/users`, { headers }).then(r => r.json()),
      fetch(`${API}/api/tasks`, { headers }).then(r => r.json()),
      fetch(`${API}/api/groups`, { headers }).then(r => r.json()),
    ]);
    setUsers(Array.isArray(ur) ? ur : []);
    setTasks(Array.isArray(tr) ? tr : []);
    setGroups(Array.isArray(gr) ? gr : []);
  };

  const handleAddUser = async e => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`✅ Account created for ${formData.name}!`);
      setFormData({ name: '', email: '', password: '', role: 'member' });
    } catch (err) { setError(err.message); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${API}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(p => p.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) { alert(err.message); }
  };

  const stats = [
    { icon: Users, label: 'Members', value: users.length, color: 'text-brand-blue', bg: 'bg-brand-blue/10 border-brand-blue/20' },
    { icon: Layers, label: 'Groups', value: groups.length, color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20' },
    { icon: Activity, label: 'Active Tasks', value: tasks.filter(t => t.status !== 'done').length, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
    { icon: CheckCircle, label: 'Completed', value: tasks.filter(t => t.status === 'done').length, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-slate-500 text-sm mt-0.5">Full team control — manage members, roles and groups</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`flex items-center gap-3 px-4 py-4 rounded-2xl border ${bg}`}>
            <Icon size={20} className={`${color} shrink-0`} />
            <div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800/50 border border-dark-700/40 p-1 rounded-2xl w-fit">
        {[
          { id: 'members', label: 'Members & Roles', icon: Users },
          { id: 'groups', label: 'All Groups', icon: Layers },
          { id: 'add', label: 'Add Member', icon: UserPlus },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id ? 'bg-dark-700 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-300'
            }`}>
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Members & Roles Tab */}
      {tab === 'members' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-5">Team Members <span className="text-slate-500 font-normal text-sm">({users.length})</span></h2>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {users.map(u => {
              const uTasks = tasks.filter(t => t.assignee?._id === u._id);
              const done = uTasks.filter(t => t.status === 'done').length;
              const pct = uTasks.length ? Math.round((done / uTasks.length) * 100) : 0;
              return (
                <div key={u._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border border-dark-700/40 bg-dark-800/30 hover:bg-dark-800/60 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-dark-600 to-dark-700 border border-dark-600 flex items-center justify-center font-bold text-slate-200 shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-slate-200 truncate">{u.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-dark-700 rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full bg-gradient-to-r from-brand-blue to-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono">{done}/{uTasks.length}</span>
                      </div>
                    </div>
                  </div>
                  {/* Role assignment */}
                  <div className="flex gap-1.5 flex-wrap">
                    {ROLES.map(r => (
                      <button key={r.value} onClick={() => handleRoleChange(u._id, r.value)}
                        className={`px-3 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                          u.role === r.value ? r.cls : 'bg-dark-800 border-dark-600/50 text-slate-500 hover:border-dark-500'
                        }`}
                      >{r.label}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* All Groups Tab */}
      {tab === 'groups' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {groups.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center text-slate-600">No groups created yet.</div>
          ) : groups.map(g => (
            <div key={g._id} className="glass rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-100">{g.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{g.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Shield size={12} className="text-brand-purple" />
                    Moderator: <span className="text-brand-purple font-medium">{g.moderator?.name}</span>
                  </div>
                </div>
                <div className="flex gap-3 text-center shrink-0">
                  <div className="bg-dark-800/50 border border-dark-700 px-3 py-2 rounded-xl">
                    <div className="text-lg font-bold text-brand-blue">{g.members?.length || 0}</div>
                    <div className="text-[10px] text-slate-500">Members</div>
                  </div>
                  <div className="bg-dark-800/50 border border-dark-700 px-3 py-2 rounded-xl">
                    <div className="text-lg font-bold text-amber-400">{g.joinRequests?.length || 0}</div>
                    <div className="text-[10px] text-slate-500">Pending</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.members?.map(m => (
                  <div key={m._id} className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800/60 border border-dark-700/50 rounded-lg text-xs text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-dark-600 flex items-center justify-center font-bold text-[10px]">{m.name?.charAt(0)}</div>
                    {m.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Add Member Tab */}
      {tab === 'add' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-6 sm:p-8 max-w-md">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-5">
            <UserPlus size={18} className="text-brand-purple" /> Add New Member
          </h2>
          {error && <div className="mb-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</div>}
          {success && <div className="mb-4 text-emerald-400 text-sm bg-emerald-400/10 p-3 rounded-xl border border-emerald-400/20">{success}</div>}
          <form onSubmit={handleAddUser} className="space-y-4">
            {[
              { key: 'name', label: 'Full Name', placeholder: 'e.g. Alice Cooper', type: 'text' },
              { key: 'email', label: 'Email', placeholder: 'alice@team.com', type: 'email' },
              { key: 'password', label: 'Temporary Password', placeholder: 'Min 6 characters', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                <input type={f.type} value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700/60 focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/30 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  placeholder={f.placeholder} required />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setFormData({ ...formData, role: r.value })}
                    className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                      formData.role === r.value ? r.cls : 'bg-dark-800 border-dark-600/50 text-slate-400 hover:border-dark-500'
                    }`}
                  >{r.label}</button>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all shadow-lg text-sm">
              Create Account
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
