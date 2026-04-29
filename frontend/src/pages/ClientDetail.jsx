import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ArrowLeft, Pencil, Check, X, Plus, Trash2, TrendingUp, TrendingDown, Clock, FolderOpen, IndianRupee, Briefcase, FilePlus, Image as ImageIcon, FileText, Calendar, ExternalLink, Folder, ChevronDown, ChevronRight, Download, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSingleInvoice, generateFullStatement } from '../utils/ReportUtils';

import { API_URL } from '../config';

const API = API_URL;
const inp = "bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue/50 transition-colors";

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { token } = useAuth();
  const { socket } = useSocket();

  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showProjForm, setShowProjForm] = useState(false);
  const [projForm, setProjForm] = useState({ name: '', dealValue: '', status: 'active', deadline: '' });
  const [editProjId, setEditProjId] = useState(null);
  const [editProjForm, setEditProjForm] = useState({});
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ title: '', amount: '', type: 'income', project: '', date: new Date().toISOString().split('T')[0] });
  const [editTxId, setEditTxId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', category: 'paperwork', files: [], folder: '' });
  const [viewFolder, setViewFolder] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.on('client_updated', c => { if (c._id === id) setClient(c); });
    socket.on('project_created', p => { if ((p.client?._id || p.client) === id) setProjects(prev => [...prev, p]); });
    socket.on('project_updated', p => setProjects(prev => prev.map(x => x._id === p._id ? p : x)));
    socket.on('project_deleted', pid => setProjects(prev => prev.filter(x => x._id !== pid)));
    socket.on('transaction_created', t => { if ((t.client?._id || t.client) === id) setTransactions(prev => [t, ...prev]); });
    socket.on('transaction_updated', t => setTransactions(prev => prev.map(x => x._id === t._id ? t : x)));
    socket.on('transaction_deleted', tid => setTransactions(prev => prev.filter(x => x._id !== tid)));
    socket.on('document_created', d => { if ((d.client?._id || d.client) === id) setDocuments(prev => [d, ...prev]); });
    socket.on('document_deleted', did => setDocuments(prev => prev.filter(x => x._id !== did)));
    return () => ['client_updated','project_created','project_updated','project_deleted','transaction_created','transaction_updated','transaction_deleted','document_created','document_deleted'].forEach(e => socket.off(e));
  }, [socket, id]);

  const fetchAll = async () => {
    const h = { Authorization: `Bearer ${token}` };
    const [c, p, t, d] = await Promise.all([
      fetch(`${API}/api/clients/${id}`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/projects?client=${id}`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/transactions`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/documents?client=${id}`, { headers: h }).then(r => r.json()),
    ]);
    setClient(c);
    setProjects(Array.isArray(p) ? p : []);
    const allTx = Array.isArray(t) ? t : [];
    setTransactions(allTx.filter(tx => tx.client?._id === id || tx.client === id));
    setDocuments(Array.isArray(d) ? d : []);
  };

  if (!client) return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>;

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalProjValue = projects.reduce((s, p) => s + (p.dealValue || 0), 0);
  const totalDealValue = totalProjValue > 0 ? totalProjValue : (client.dealValue || 0);
  const progress = totalDealValue > 0 ? Math.min((totalIncome / totalDealValue) * 100, 100) : 0;

  const startEdit = () => {
    setEditing(true);
    setEditForm({ name: client.name, company: client.company||'', email: client.email||'', status: client.status, deadline: client.deadline ? new Date(client.deadline).toISOString().split('T')[0] : '', dealValue: client.dealValue||0 });
  };
  const saveEdit = async () => {
    const res = await fetch(`${API}/api/clients/${id}`, { method: 'PUT', headers, body: JSON.stringify({ ...editForm, dealValue: Number(editForm.dealValue)||0 }) });
    if (res.ok) { const c = await res.json(); setClient(c); }
    setEditing(false);
  };

  const addProject = async (e) => {
    e.preventDefault();
    await fetch(`${API}/api/projects`, { method: 'POST', headers, body: JSON.stringify({ ...projForm, client: id, dealValue: Number(projForm.dealValue)||0 }) });
    setShowProjForm(false); setProjForm({ name: '', dealValue: '', status: 'active', deadline: '' });
  };
  const saveEditProj = async (pid) => {
    await fetch(`${API}/api/projects/${pid}`, { method: 'PUT', headers, body: JSON.stringify({ ...editProjForm, dealValue: Number(editProjForm.dealValue)||0 }) });
    setEditProjId(null);
  };
  const deleteProj = async (pid) => { if (confirm('Delete project?')) await fetch(`${API}/api/projects/${pid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); };

  const addTx = async (e) => {
    e.preventDefault();
    setUploading(true);
    const method = editTxId ? 'PUT' : 'POST';
    const url = editTxId ? `${API}/api/transactions/${editTxId}` : `${API}/api/transactions`;
    const data = { ...txForm, amount: Number(txForm.amount), client: id };
    if (!data.project) delete data.project;

    const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
    const saved = await res.json();

    if (receiptFile) {
      const txId = editTxId || saved._id;
      const formData = new FormData();
      formData.append('image', receiptFile);
      await fetch(`${API}/api/upload-receipt/${txId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    }

    
    setShowTxForm(false); 
    setEditTxId(null);
    setTxForm({ title: '', amount: '', type: 'income', project: '', date: new Date().toISOString().split('T')[0] });
    setReceiptFile(null);
    setUploading(false);
  };

  const addDoc = async (e) => {
    e.preventDefault();
    if (docForm.files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    docForm.files.forEach(f => formData.append('images', f));
    formData.append('title', docForm.title);
    formData.append('category', docForm.category);
    formData.append('folder', docForm.folder || 'General');
    formData.append('client', id);
    await fetch(`${API}/api/documents`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    setShowDocForm(false); setDocForm({ title: '', category: 'paperwork', files: [], folder: '' });
    setUploading(false);
  };

  const deleteDoc = async (did) => { if (confirm('Delete document?')) await fetch(`${API}/api/documents/${did}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); };
  const deleteTx = async (tid) => { if (confirm('Delete?')) await fetch(`${API}/api/transactions/${tid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); };

  const getProjIncome = (pid) => transactions.filter(t => t.project?._id === pid && t.type === 'income').reduce((s,t) => s+t.amount, 0);

  const statusColor = { active: 'bg-brand-blue', closed: 'bg-emerald-400', lead: 'bg-amber-400', lost: 'bg-rose-400' };
  const projStatusColor = { active: 'bg-emerald-400', completed: 'bg-brand-blue', 'on-hold': 'bg-amber-400', cancelled: 'bg-rose-400' };

  const toggleMilestone = async (projId, mIdx) => {
    const proj = projects.find(p => p._id === projId);
    const updatedMilestones = [...proj.milestones];
    updatedMilestones[mIdx].completed = !updatedMilestones[mIdx].completed;
    try {
      await fetch(`${API}/api/projects/${projId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ milestones: updatedMilestones })
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const addMilestone = async (projId, title) => {
    if (!title) return;
    const proj = projects.find(p => p._id === projId);
    const updatedMilestones = [...(proj.milestones || []), { title, completed: false }];
    try {
      await fetch(`${API}/api/projects/${projId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ milestones: updatedMilestones })
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const downloadInvoice = (t) => {
    generateSingleInvoice(client, t);
  };

  const downloadFullStatement = () => {
    generateFullStatement(client, transactions, projects);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-8 font-sans">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/business')} className="p-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-lg text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">{client.name} {client.company && <span className="text-slate-500 font-normal text-sm">({client.company})</span>}</h1>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor[client.status]}`} />
            <span className="capitalize font-medium">{client.status}</span>
            {client.deadline && <><span>•</span><Clock size={10} /><span>{new Date(client.deadline).toLocaleDateString('en-GB')}</span></>}
            {client.email && <><span>•</span><span>{client.email}</span></>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadFullStatement} className="flex items-center gap-1.5 text-[10px] bg-brand-blue/10 hover:bg-brand-blue/20 border border-brand-blue/20 text-brand-blue px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wider">
            <Download size={11} /> Statement
          </button>
          <button onClick={startEdit} className="flex items-center gap-1.5 text-[10px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
            <Pencil size={11} /> Edit Client
          </button>
        </div>
      </div>

      {/* Edit Client Modal */}
      <AnimatePresence>
      {editing && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-brand-blue uppercase tracking-widest">Edit Client Details</span>
            <div className="flex gap-2">
              <button onClick={saveEdit} className="p-1.5 bg-emerald-400/20 text-emerald-400 rounded-lg"><Check size={14} /></button>
              <button onClick={() => setEditing(false)} className="p-1.5 bg-rose-400/20 text-rose-400 rounded-lg"><X size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={inp} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" />
            <input className={inp} value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})} placeholder="Company" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <input type="number" className={inp} value={editForm.dealValue} onChange={e => setEditForm({...editForm, dealValue: e.target.value})} placeholder="Total Deal (₹)" />
            <select className={inp + " text-slate-300"} value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
              <option value="lead">Lead</option><option value="active">Active</option><option value="closed">Closed</option><option value="lost">Lost</option>
            </select>
            <input type="date" className={inp} value={editForm.deadline} onChange={e => setEditForm({...editForm, deadline: e.target.value})} />
            <input type="email" className={inp} value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="Email" />
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Deal', value: `₹${totalDealValue.toLocaleString('en-IN')}`, color: 'border-t-brand-blue' },
          { label: 'Received', value: `₹${totalIncome.toLocaleString('en-IN')}`, color: 'border-t-emerald-400' },
          { label: 'Expenses', value: `₹${totalExpense.toLocaleString('en-IN')}`, color: 'border-t-rose-400' },
          { label: 'Balance Due', value: `₹${Math.max(totalDealValue - totalIncome, 0).toLocaleString('en-IN')}`, color: 'border-t-amber-400' },
        ].map(s => (
          <div key={s.label} className={`glass p-3 rounded-xl border-t-2 ${s.color}`}>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{s.label}</p>
            <p className="text-base font-bold text-white mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Payment Progress */}
      <div className="glass p-3 rounded-xl">
        <div className="flex justify-between text-xs font-medium mb-1.5">
          <span className="text-slate-400">Overall Payment Progress</span>
          <span className="text-white">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden border border-white/[0.02]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-emerald-400 to-brand-blue rounded-full shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all duration-700" 
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Projects Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5"><FolderOpen size={14} className="text-brand-purple" /> Projects</h2>
            <button onClick={() => setShowProjForm(!showProjForm)} className="text-[10px] bg-brand-purple/20 hover:bg-brand-purple/30 text-brand-purple px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium"><Plus size={12} /> Add</button>
          </div>

          <AnimatePresence>
          {showProjForm && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={addProject} className="glass p-3 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <input required className={inp} value={projForm.name} onChange={e => setProjForm({...projForm, name: e.target.value})} placeholder="Project Name" />
                <input type="number" className={inp} value={projForm.dealValue} onChange={e => setProjForm({...projForm, dealValue: e.target.value})} placeholder="Deal Value (₹)" />
              </div>
              <div className="flex gap-3">
                <input type="date" className={inp + " flex-1"} value={projForm.deadline} onChange={e => setProjForm({...projForm, deadline: e.target.value})} />
                <button type="submit" className="bg-brand-purple text-white rounded-xl px-4 font-medium text-sm">Save</button>
              </div>
            </motion.form>
          )}
          </AnimatePresence>

          <div className="space-y-2">
            {projects.map(p => {
              const pIncome = getProjIncome(p._id);
              const pDeal = p.dealValue || 0;
              const pPct = pDeal > 0 ? Math.min((pIncome / pDeal) * 100, 100) : 0;

              if (editProjId === p._id) return (
                <div key={p._id} className="glass p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-brand-purple uppercase tracking-widest">Edit Project</span>
                    <div className="flex gap-1"><button onClick={() => saveEditProj(p._id)} className="p-1 bg-emerald-400/20 text-emerald-400 rounded-md"><Check size={12} /></button><button onClick={() => setEditProjId(null)} className="p-1 bg-rose-400/20 text-rose-400 rounded-md"><X size={12} /></button></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inp} value={editProjForm.name} onChange={e => setEditProjForm({...editProjForm, name: e.target.value})} />
                    <input type="number" className={inp} value={editProjForm.dealValue} onChange={e => setEditProjForm({...editProjForm, dealValue: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className={inp+" text-slate-300"} value={editProjForm.status} onChange={e => setEditProjForm({...editProjForm, status: e.target.value})}>
                      <option value="active">Active</option><option value="completed">Completed</option><option value="on-hold">On Hold</option><option value="cancelled">Cancelled</option>
                    </select>
                    <input type="date" className={inp} value={editProjForm.deadline} onChange={e => setEditProjForm({...editProjForm, deadline: e.target.value})} />
                  </div>
                </div>
              );

              return (
                <div key={p._id} className="glass p-3 rounded-xl group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${projStatusColor[p.status]}`} />
                      <span className="font-bold text-xs text-white">{p.name}</span>
                      <span className="text-[9px] text-slate-500 capitalize bg-white/[0.03] px-1.5 py-0.5 rounded">{p.status}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditProjId(p._id); setEditProjForm({ name: p.name, dealValue: p.dealValue||0, status: p.status, deadline: p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : '' }); }} className="p-1 text-slate-500 hover:text-brand-blue"><Pencil size={12} /></button>
                      <button onClick={() => deleteProj(p._id)} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-medium mb-1">
                    <span className="text-slate-400">₹{pIncome.toLocaleString('en-IN')} received</span>
                    <span className="text-slate-300">₹{pDeal.toLocaleString('en-IN')} total</span>
                  </div>
                  <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden border border-white/[0.02]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pPct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-brand-purple shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all" 
                    />
                  </div>

                  {/* Milestones / Roadmap Section */}
                  <div className="pt-2 mt-3 border-t border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Zap size={10} className="text-brand-blue" /> Roadmap ({Math.round(p.milestones?.length > 0 ? (p.milestones.filter(m => m.completed).length / p.milestones.length) * 100 : 0)}%)
                      </span>
                      <button 
                        onClick={() => {
                          const title = prompt('Milestone Title:');
                          if (title) addMilestone(p._id, title);
                        }}
                        className="text-[9px] text-brand-blue hover:text-brand-purple font-bold transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                      {p.milestones?.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 bg-white/[0.02] rounded-lg group/m hover:bg-white/[0.04] transition-all cursor-pointer border border-transparent hover:border-white/5" onClick={() => toggleMilestone(p._id, idx)}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all duration-300 ${m.completed ? 'bg-brand-blue border-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-white/10 group-hover/m:border-white/20'}`}>
                              {m.completed && <Check size={10} className="text-white" strokeWidth={4} />}
                            </div>
                            <span className={`text-[10px] font-medium transition-colors ${m.completed ? 'text-slate-500 line-through' : 'text-slate-300 group-hover/m:text-white'}`}>{m.title}</span>
                          </div>
                        </div>
                      ))}
                      {(!p.milestones || p.milestones.length === 0) && <p className="text-[9px] text-slate-600 italic px-1 py-1">No milestones defined yet.</p>}
                    </div>
                  </div>
                  {p.deadline && <p className="text-[9px] text-slate-500 mt-1.5 flex items-center gap-1"><Clock size={9} /> {new Date(p.deadline).toLocaleDateString('en-GB')}</p>}
                </div>
              );
            })}
            {projects.length === 0 && <div className="text-center text-slate-500 py-6 text-sm">No projects yet. Add one above.</div>}
          </div>
        </div>

        {/* Transactions Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5"><IndianRupee size={14} className="text-emerald-400" /> Transactions</h2>
            <button onClick={() => setShowTxForm(!showTxForm)} className="text-[10px] bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-400 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium"><Plus size={12} /> Add</button>
          </div>

          {/* Transaction Modal */}
      <AnimatePresence>
        {showTxForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => { setShowTxForm(false); setEditTxId(null); }}
          >
            <motion.form 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-4"
              onClick={e => e.stopPropagation()}
              onSubmit={addTx}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${editTxId ? 'bg-brand-blue/20 text-brand-blue' : 'bg-emerald-400/20 text-emerald-400'}`}>
                    {editTxId ? <Pencil size={20} /> : <IndianRupee size={20} />}
                  </div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">{editTxId ? 'Edit Transaction' : 'New Transaction'}</h2>
                </div>
                <button type="button" onClick={() => { setShowTxForm(false); setEditTxId(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Description</label>
                    <input required className={"w-full " + inp} value={txForm.title} onChange={e => setTxForm({...txForm, title: e.target.value})} placeholder="e.g. Initial Deposit" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Amount (₹)</label>
                    <input required type="number" className={"w-full " + inp} value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Date</label>
                    <input required type="date" className={"w-full " + inp} value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Type</label>
                    <select className={"w-full " + inp} value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})}>
                      <option value="income">Income (+)</option>
                      <option value="expense">Expense (-)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Link to Project</label>
                    <select className={"w-full " + inp} value={txForm.project} onChange={e => setTxForm({...txForm, project: e.target.value})}>
                      <option value="">General (No Project)</option>
                      {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Receipt Image</label>
                  <input type="file" id="tx-receipt-modal" className="hidden" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} />
                  <label htmlFor="tx-receipt-modal" className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${receiptFile ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-white/10 hover:border-white/20 text-slate-500'}`}>
                    <ImageIcon size={20} />
                    <span className="text-xs font-bold">{receiptFile ? 'Receipt Selected' : 'Attach Receipt'}</span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={uploading} 
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all shadow-xl disabled:opacity-50 ${editTxId ? 'bg-brand-blue hover:bg-brand-blue/80 text-white shadow-brand-blue/20' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'}`}
                >
                  {uploading ? 'Processing...' : editTxId ? 'Update Transaction' : 'Save Transaction'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

          <div className="glass rounded-xl overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto p-1.5 space-y-0.5">
              {transactions.map(t => (
                <div key={t._id} className="flex items-center justify-between p-2 hover:bg-dark-800/50 rounded-lg transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-md ${t.type === 'income' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>
                      {t.type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-200">{t.title}</p>
                        {t.receiptUrl && (
                          <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-blue hover:text-brand-purple transition-colors">
                            <ImageIcon size={11} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{new Date(t.date).toLocaleDateString('en-GB')} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {t.project && <><span>→</span><span className="text-brand-purple font-medium">{t.project.name}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {t.type === 'income' && (
                        <button onClick={() => downloadInvoice(t)} className="p-1 text-slate-600 hover:text-emerald-400 transition-colors" title="Download Invoice">
                          <Download size={11} />
                        </button>
                      )}
                      <button onClick={() => {
                        setEditTxId(t._id);
                        setTxForm({ title: t.title, amount: t.amount, type: t.type, project: t.project?._id || '', date: new Date(t.date).toISOString().split('T')[0] });
                        setShowTxForm(true);
                      }} className="p-1 text-slate-600 hover:text-brand-blue transition-colors">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => deleteTx(t._id)} className="p-1 text-slate-600 hover:text-rose-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && <div className="text-center text-slate-500 py-8 text-sm">No transactions yet.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Documents / Paperwork Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-1.5"><FileText size={14} className="text-brand-blue" /> Paperwork & Documents</h2>
          <button onClick={() => setShowDocForm(!showDocForm)} className="text-[10px] bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium"><FilePlus size={12} /> Upload</button>
        </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showDocForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowDocForm(false)}
          >
            <motion.form 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-4"
              onClick={e => e.stopPropagation()}
              onSubmit={addDoc}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/20 rounded-xl text-brand-blue">
                    <FilePlus size={20} />
                  </div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">New Upload</h2>
                </div>
                <button type="button" onClick={() => setShowDocForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Folder Name</label>
                  <input className={"w-full " + inp} value={docForm.folder} onChange={e => setDocForm({...docForm, folder: e.target.value})} placeholder="e.g. Project Contracts" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Document Title</label>
                    <input required className={"w-full " + inp} value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} placeholder="e.g. Signed PDF" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Category</label>
                    <select className={"w-full " + inp} value={docForm.category} onChange={e => setDocForm({...docForm, category: e.target.value})}>
                      <option value="paperwork">Paperwork</option>
                      <option value="contract">Contract</option>
                      <option value="receipt">Receipt</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Attachments</label>
                  <input required type="file" id="docfile-modal" className="hidden" accept="image/*,application/pdf" multiple onChange={e => setDocForm({...docForm, files: Array.from(e.target.files)})} />
                  <label htmlFor="docfile-modal" className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${docForm.files.length > 0 ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-white/10 hover:border-white/20 text-slate-500'}`}>
                    <ImageIcon size={20} />
                    <span className="text-xs font-bold">{docForm.files.length > 0 ? `${docForm.files.length} Files Selected` : 'Click to Browse Files'}</span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={uploading || docForm.files.length === 0} 
                  className="w-full bg-brand-blue hover:bg-brand-blue/80 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-brand-blue/20 disabled:opacity-50 disabled:shadow-none"
                >
                  {uploading ? 'Processing Upload...' : 'Start Upload'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Object.entries(documents.reduce((acc, d) => {
            const f = d.folder || 'General';
            if (!acc[f]) acc[f] = [];
            acc[f].push(d);
            return acc;
          }, {})).map(([folderName, files]) => (
            <motion.div 
              key={folderName} 
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => setViewFolder({ name: folderName, files })}
              className="glass p-4 rounded-3xl cursor-pointer group border border-white/[0.03] hover:border-brand-purple/50 transition-all flex flex-col items-center text-center space-y-3 bg-gradient-to-br from-white/[0.02] to-transparent"
            >
              <div className="w-16 h-16 bg-brand-purple/10 rounded-2xl flex items-center justify-center text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-all shadow-lg group-hover:shadow-brand-purple/20">
                <Folder size={32} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{folderName}</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{files.length} Files</p>
              </div>
            </motion.div>
          ))}
          {documents.length === 0 && (
            <div className="col-span-full py-12 text-center glass rounded-2xl border-dashed border-white/5 bg-white/[0.01]">
              <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">
                <FileText size={20} />
              </div>
              <p className="text-xs text-slate-500 font-medium">No documents have been uploaded yet</p>
              <button onClick={() => setShowDocForm(true)} className="mt-4 text-[10px] text-brand-blue hover:underline font-bold uppercase tracking-wider">Start by uploading one</button>
            </div>
          )}
        </div>
      </div>

      {/* Folder Viewer Modal */}
      <AnimatePresence>
        {viewFolder && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewFolder(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass w-full max-w-4xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-purple/20 rounded-xl text-brand-purple">
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">{viewFolder.name}</h2>
                    <p className="text-[10px] text-slate-500">{viewFolder.files.length} items in this folder</p>
                  </div>
                </div>
                <button onClick={() => setViewFolder(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {viewFolder.files.map(d => (
                    <div key={d._id} className="group space-y-2">
                      <div className="aspect-[4/3] rounded-2xl bg-dark-900 flex items-center justify-center overflow-hidden relative border border-white/5 shadow-2xl">
                        {d.imageUrl.endsWith('.pdf') ? (
                          <div className="flex flex-col items-center gap-2">
                            <FileText size={40} className="text-rose-400" />
                            <span className="text-[9px] font-bold text-rose-400/50 uppercase">PDF</span>
                          </div>
                        ) : (
                          <img src={d.imageUrl} alt={d.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all duration-300 backdrop-blur-[2px]">
                          <a href={d.imageUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all transform translate-y-2 group-hover:translate-y-0">
                            <ExternalLink size={18} />
                          </a>
                          <button onClick={() => { if(confirm('Delete?')) { deleteDoc(d._id); setViewFolder(prev => ({ ...prev, files: prev.files.filter(x => x._id !== d._id) })); } }} className="p-2.5 bg-rose-400/10 hover:bg-rose-400/30 rounded-xl text-rose-400 transition-all transform translate-y-2 group-hover:translate-y-0">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="px-1">
                        <p className="text-[11px] font-bold text-slate-200 truncate">{d.title}</p>
                        <p className="text-[9px] text-slate-500">{new Date(d.createdAt).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
