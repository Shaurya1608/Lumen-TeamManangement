import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Compass, Users, Clock, CheckCircle, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const API = 'http://localhost:5000';

export default function GroupsBrowse() {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchGroups();
    if (socket) {
      socket.on('group_updated', g => setGroups(p => p.map(x => x._id === g._id ? g : x)));
      socket.on('group_created', g => setGroups(p => [...p, g]));
    }
    return () => socket && ['group_updated', 'group_created'].forEach(e => socket.off(e));
  }, [socket]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Fetch ALL groups (non-scoped) for members to browse
      const res = await fetch(`${API}/api/groups`, { headers });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  const handleRequest = async (groupId) => {
    setRequesting(groupId);
    try {
      const res = await fetch(`${API}/api/groups/${groupId}/request`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups(p => p.map(g => g._id === groupId ? data : g));
    } catch (err) {
      alert(err.message);
    } finally {
      setRequesting(null);
    }
  };

  const getStatus = (group) => {
    if (!group.members || !group.joinRequests) return 'available';
    if (group.members.some(m => m._id === user._id)) return 'member';
    if (group.joinRequests.some(r => r._id === user._id)) return 'pending';
    return 'available';
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading groups…</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Compass size={16} className="text-brand-blue" />
          <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">Member</span>
        </div>
        <h1 className="text-2xl font-bold">Browse Groups</h1>
        <p className="text-slate-500 text-sm mt-0.5">Request to join a team and collaborate on tasks</p>
      </motion.div>

      {/* Current group status */}
      {user?.group && (
        <div className="flex items-center gap-3 p-4 glass rounded-2xl border border-emerald-400/20 bg-emerald-400/5">
          <CheckCircle size={20} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">You're part of a team!</p>
            <p className="text-xs text-slate-500 mt-0.5">Your task board is now active — check the Task Board tab</p>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mx-auto mb-4">
            <Compass size={28} className="text-slate-600" />
          </div>
          <p className="text-slate-500 font-medium">No groups available yet</p>
          <p className="text-slate-600 text-sm mt-1">Ask your moderator to create a group first</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g, i) => {
            const status = getStatus(g);
            return (
              <motion.div key={g._id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-lg">{g.name}</h3>
                    <p className="text-slate-500 text-sm mt-1">{g.description || 'No description'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 border border-dark-600 flex items-center justify-center shrink-0 font-bold text-xl text-slate-300">
                    {g.name?.charAt(0)}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Users size={13} />
                    {g.members?.length || 0} member{g.members?.length !== 1 ? 's' : ''}
                  </div>
                  <span>·</span>
                  <div>Led by <span className="text-slate-300 font-medium">{g.moderator?.name}</span></div>
                </div>

                {/* Member avatars */}
                {g.members?.length > 0 && (
                  <div className="flex -space-x-2">
                    {g.members.slice(0, 5).map(m => (
                      <div key={m._id} title={m.name}
                        className="w-8 h-8 rounded-full bg-dark-700 border-2 border-dark-900 flex items-center justify-center text-xs font-bold text-slate-300">
                        {m.name?.charAt(0)?.toUpperCase()}
                      </div>
                    ))}
                    {g.members.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-dark-700 border-2 border-dark-900 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        +{g.members.length - 5}
                      </div>
                    )}
                  </div>
                )}

                {/* Action button */}
                {status === 'member' ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle size={16} /> You're a member
                  </div>
                ) : status === 'pending' ? (
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                    <Clock size={16} /> Request pending…
                  </div>
                ) : (
                  <button
                    onClick={() => handleRequest(g._id)}
                    disabled={requesting === g._id || !!user?.group}
                    className="flex items-center gap-2 justify-center w-full py-2.5 bg-brand-blue/15 border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/25 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogIn size={16} />
                    {requesting === g._id ? 'Sending…' : user?.group ? 'Already in a group' : 'Request to Join'}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
