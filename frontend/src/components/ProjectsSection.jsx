import { useState } from 'react';
import { Plus, Trash2, Pencil, X, Check, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { API_URL } from '../config';

const API = API_URL;
const inputClass = "bg-dark-800 border border-dark-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-brand-blue/50 transition-colors";

export default function ProjectsSection({ client, projects, transactions, token }) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', dealValue: '', status: 'active', deadline: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const clientProjects = projects.filter(p => p.client?._id === client._id || p.client === client._id);

  const addProject = async (e) => {
    e.preventDefault();
    await fetch(`${API}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, client: client._id, dealValue: Number(form.dealValue) || 0 })
    });
    setShowForm(false);
    setForm({ name: '', dealValue: '', status: 'active', deadline: '' });
  };

  const startEdit = (p) => {
    setEditingId(p._id);
    setEditForm({ name: p.name, dealValue: p.dealValue || 0, status: p.status, deadline: p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : '' });
  };

  const saveEdit = async (id) => {
    await fetch(`${API}/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...editForm, dealValue: Number(editForm.dealValue) || 0 })
    });
    setEditingId(null);
  };

  const deleteProject = async (id) => {
    if (confirm('Delete this project?')) {
      await fetch(`${API}/api/projects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }
  };

  const getProjectIncome = (projectId) =>
    transactions.filter(t => t.project?._id === projectId && t.type === 'income').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="bg-dark-800/30 rounded-xl border border-white/[0.03]">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
        <span className="flex items-center gap-2">
          <FolderOpen size={13} />
          Projects ({clientProjects.length})
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2">
              {clientProjects.map(p => {
                const income = getProjectIncome(p._id);
                const dv = p.dealValue || 0;
                const pct = dv > 0 ? Math.min((income / dv) * 100, 100) : 0;

                if (editingId === p._id) {
                  return (
                    <div key={p._id} className="bg-dark-900/50 rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">Edit Project</span>
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(p._id)} className="p-1 bg-emerald-400/20 text-emerald-400 rounded-md"><Check size={11} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 bg-rose-400/20 text-rose-400 rounded-md"><X size={11} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inputClass + " !text-xs !py-1.5"} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Project Name" />
                        <input type="number" className={inputClass + " !text-xs !py-1.5"} value={editForm.dealValue} onChange={e => setEditForm({...editForm, dealValue: e.target.value})} placeholder="Deal (₹)" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select className={inputClass + " !text-xs !py-1.5 text-slate-300"} value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="on-hold">On Hold</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <input type="date" className={inputClass + " !text-xs !py-1.5"} value={editForm.deadline} onChange={e => setEditForm({...editForm, deadline: e.target.value})} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={p._id} className="bg-dark-900/50 rounded-lg p-2.5 group/proj">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-emerald-400' : p.status === 'completed' ? 'bg-brand-blue' : p.status === 'on-hold' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                        <span className="text-xs font-semibold text-slate-200">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/proj:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(p)} className="p-0.5 text-slate-500 hover:text-brand-blue"><Pencil size={11} /></button>
                        <button onClick={() => deleteProject(p._id)} className="p-0.5 text-slate-500 hover:text-rose-400"><Trash2 size={11} /></button>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-medium mb-1">
                      <span className="text-slate-500">₹{income.toLocaleString('en-IN')} / ₹{dv.toLocaleString('en-IN')}</span>
                      <span className="text-slate-500">{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full bg-dark-800 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              {showForm ? (
                <form onSubmit={addProject} className="bg-dark-900/50 rounded-lg p-2.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input required className={inputClass + " !text-xs !py-1.5"} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Project Name" />
                    <input type="number" className={inputClass + " !text-xs !py-1.5"} value={form.dealValue} onChange={e => setForm({...form, dealValue: e.target.value})} placeholder="Deal Value (₹)" />
                  </div>
                  <div className="flex gap-2">
                    <input type="date" className={inputClass + " !text-xs !py-1.5 flex-1"} value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                    <button type="submit" className="bg-brand-blue/20 text-brand-blue text-xs font-bold px-3 rounded-lg">Save</button>
                    <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 text-xs px-2">Cancel</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-slate-500 hover:text-brand-blue border border-dashed border-white/[0.05] hover:border-brand-blue/30 rounded-lg transition-colors font-medium">
                  <Plus size={12} /> Add Project
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
