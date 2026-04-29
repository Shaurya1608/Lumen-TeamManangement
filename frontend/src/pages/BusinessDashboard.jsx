import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Briefcase, IndianRupee, Activity, Users, CheckCircle, TrendingUp, TrendingDown, Clock, Plus, Trash2, Pencil, X, Check, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { generateMonthlyReport } from '../utils/ReportUtils';
import { Search, Filter, Download } from 'lucide-react';

const API = 'http://localhost:5000';

export default function BusinessDashboard() {
  const [clients, setClients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tab, setTab] = useState('overview');
  const { socket } = useSocket();
  const { token } = useAuth();
  const nav = useNavigate();

  // Forms state
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', company: '', email: '', status: 'lead', deadline: '', dealValue: '' });
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ title: '', amount: '', type: 'income', client: '', project: '', date: new Date().toISOString().split('T')[0] });
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Edit state
  const [editingClientId, setEditingClientId] = useState(null);
  const [editClientForm, setEditClientForm] = useState({});
  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxForm, setEditTxForm] = useState({});

  // Search & Filter state
  const [clientSearch, setClientSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('all'); // all, income, expense

  useEffect(() => {
    fetchData();
    if (socket) {
      socket.on('client_created', c => setClients(p => [...p, c]));
      socket.on('client_updated', c => setClients(p => p.map(x => x._id === c._id ? c : x)));
      socket.on('client_deleted', id => setClients(p => p.filter(x => x._id !== id)));
      
      socket.on('transaction_created', t => setTransactions(p => [...p, t]));
      socket.on('transaction_updated', t => setTransactions(p => p.map(x => x._id === t._id ? t : x)));
      socket.on('transaction_deleted', id => setTransactions(p => p.filter(x => x._id !== id)));
      
      socket.on('task_created', t => setTasks(p => [...p, t]));
      socket.on('task_updated', t => setTasks(p => p.map(x => x._id === t._id ? t : x)));

      socket.on('project_created', p => setProjects(prev => [...prev, p]));
      socket.on('project_updated', p => setProjects(prev => prev.map(x => x._id === p._id ? p : x)));
      socket.on('project_deleted', id => setProjects(prev => prev.filter(x => x._id !== id)));
    }
    return () => socket && ['client_created', 'client_updated', 'client_deleted', 'transaction_created', 'transaction_updated', 'transaction_deleted', 'task_created', 'task_updated', 'project_created', 'project_updated', 'project_deleted'].forEach(e => socket.off(e));
  }, [socket]);

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [cr, tr, ts, pr] = await Promise.all([
      fetch(`${API}/api/clients`, { headers }).then(r => r.json()),
      fetch(`${API}/api/transactions`, { headers }).then(r => r.json()),
      fetch(`${API}/api/tasks`, { headers }).then(r => r.json()),
      fetch(`${API}/api/projects`, { headers }).then(r => r.json()),
    ]);
    setClients(Array.isArray(cr) ? cr : []);
    setTransactions(Array.isArray(tr) ? tr : []);
    setTasks(Array.isArray(ts) ? ts : []);
    setProjects(Array.isArray(pr) ? pr : []);
  };

  // Calculations
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalIncome - totalExpense;
  
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const completionRate = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  const handleAddClient = async (e) => {
    e.preventDefault();
    await fetch(`${API}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...clientForm, dealValue: Number(clientForm.dealValue) || 0 })
    });
    setShowClientForm(false);
    setClientForm({ name: '', company: '', email: '', status: 'lead', deadline: '', dealValue: '' });
  };

  const handleAddTx = async (e) => {
    e.preventDefault();
    setUploading(true);
    const method = editingTxId ? 'PUT' : 'POST';
    const url = editingTxId ? `${API}/api/transactions/${editingTxId}` : `${API}/api/transactions`;
    
    const data = { ...txForm, amount: Number(txForm.amount) };
    if (!data.client) delete data.client;
    if (!data.project) delete data.project;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    const saved = await res.json();

    if (receiptFile) {
      const txId = editingTxId || saved._id;
      const formData = new FormData();
      formData.append('image', receiptFile);
      await fetch(`${API}/api/upload-receipt/${txId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    }

    setShowTxForm(false);
    setEditingTxId(null);
    setTxForm({ title: '', amount: '', type: 'income', client: '', project: '', date: new Date().toISOString().split('T')[0] });
    setReceiptFile(null);
    setUploading(false);
  };

  const deleteClient = async (id) => {
    if(confirm('Are you sure?')) {
      await fetch(`${API}/api/clients/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }
  };

  const updateClientStatus = async (id, status) => {
    await fetch(`${API}/api/clients/${id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
  };

  // ── Edit Client ──
  const startEditClient = (c) => {
    setEditingClientId(c._id);
    setEditClientForm({
      name: c.name,
      company: c.company || '',
      email: c.email || '',
      status: c.status,
      deadline: c.deadline ? new Date(c.deadline).toISOString().split('T')[0] : '',
      dealValue: c.dealValue || 0,
    });
  };

  const cancelEditClient = () => {
    setEditingClientId(null);
    setEditClientForm({});
  };

  const saveEditClient = async (id) => {
    await fetch(`${API}/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...editClientForm, dealValue: Number(editClientForm.dealValue) || 0 })
    });
    setEditingClientId(null);
    setEditClientForm({});
  };

  // ── Edit Transaction ──
  const startEditTx = (t) => {
    setEditingTxId(t._id);
    setTxForm({
      title: t.title,
      amount: t.amount,
      type: t.type,
      client: t.client?._id || '',
      project: t.project?._id || '',
      date: new Date(t.date).toISOString().split('T')[0]
    });
    setShowTxForm(true);
  };

  const deleteTx = async (id) => {
    if(confirm('Delete this transaction?')) {
      await fetch(`${API}/api/transactions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }
  };

  const inputClass = "bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue/50 transition-colors";

  const handleDownloadReport = () => {
    const stats = {
      netProfit,
      income: totalIncome,
      activeClients: clients.filter(c => c.status === 'active').length,
      completionRate
    };
    generateMonthlyReport(stats, transactions);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.company?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(txSearch.toLowerCase()) || 
                           t.client?.name.toLowerCase().includes(txSearch.toLowerCase());
      const matchesFilter = txFilter === 'all' ? true : t.type === txFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">
            Business Overview
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage finances, clients, and team progress in one place.</p>
        </div>
        <button onClick={handleDownloadReport} className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-slate-300 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
          <Download size={14} className="text-brand-blue" /> Report
        </button>
      </motion.div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass p-3 rounded-xl border-t-2 border-t-emerald-400">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Net Profit</p>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">₹{netProfit.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-1.5 bg-emerald-400/10 rounded-md text-emerald-400">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2 flex gap-2 text-[9px] text-slate-400 font-medium">
            <span className="text-emerald-400">+₹{totalIncome.toLocaleString('en-IN')} In</span> • 
            <span className="text-rose-400">-₹{totalExpense.toLocaleString('en-IN')} Out</span>
          </div>
        </div>

        <div className="glass p-3 rounded-xl border-t-2 border-t-brand-blue">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Active Clients</p>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">{clients.filter(c => c.status === 'active').length}</h3>
            </div>
            <div className="p-1.5 bg-brand-blue/10 rounded-md text-brand-blue">
              <Briefcase size={14} />
            </div>
          </div>
          <div className="mt-2 text-[9px] text-slate-500">
            {clients.filter(c => c.status === 'lead').length} pending leads
          </div>
        </div>

        <div className="glass p-3 rounded-xl border-t-2 border-t-amber-400">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Task Completion</p>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">{completionRate}%</h3>
            </div>
            <div className="p-1.5 bg-amber-400/10 rounded-md text-amber-400">
              <Activity size={14} />
            </div>
          </div>
          <div className="mt-2 w-full bg-dark-700 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        <div className="glass p-3 rounded-xl border-t-2 border-t-brand-purple">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total Projects</p>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">{clients.length}</h3>
            </div>
            <div className="p-1.5 bg-brand-purple/10 rounded-md text-brand-purple">
              <CheckCircle size={14} />
            </div>
          </div>
          <div className="mt-2 text-[9px] text-slate-500">
            {clients.filter(c => c.status === 'closed').length} completed deals
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Clients Pipeline */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Briefcase className="text-brand-blue" size={14} /> Client Pipeline
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  className={inputClass + " pl-8 w-40"} 
                  placeholder="Search clients..." 
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                />
              </div>
              <button onClick={() => setShowClientForm(!showClientForm)} className="text-xs bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-medium">
                <Plus size={14} /> New Client
              </button>
            </div>
          </div>

      <AnimatePresence>
        {showClientForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowClientForm(false)}
          >
            <motion.form 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-4"
              onClick={e => e.stopPropagation()}
              onSubmit={handleAddClient}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/20 rounded-xl text-brand-blue">
                    <Users size={20} />
                  </div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">New Client</h2>
                </div>
                <button type="button" onClick={() => setShowClientForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Client Name</label>
                    <input required className={"w-full " + inputClass} value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} placeholder="Full Name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Company</label>
                    <input className={"w-full " + inputClass} value={clientForm.company} onChange={e => setClientForm({...clientForm, company: e.target.value})} placeholder="Optional" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Deal Value (₹)</label>
                    <input type="number" className={"w-full " + inputClass} value={clientForm.dealValue} onChange={e => setClientForm({...clientForm, dealValue: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Initial Status</label>
                    <select className={"w-full " + inputClass} value={clientForm.status} onChange={e => setClientForm({...clientForm, status: e.target.value})}>
                      <option value="lead">Lead</option>
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Project Deadline</label>
                  <input type="date" className={"w-full " + inputClass} value={clientForm.deadline} onChange={e => setClientForm({...clientForm, deadline: e.target.value})} />
                </div>

                <button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue/80 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-brand-blue/20">
                  Add Client to System
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

          <div className="space-y-2">
            {filteredClients.map(c => {
              const clientIncome = transactions.filter(t => t.client && t.client._id === c._id && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
              const clientProjects = projects.filter(p => (p.client?._id || p.client) === c._id);
              const totalProjValue = clientProjects.reduce((sum, p) => sum + (p.dealValue || 0), 0);
              const totalDealValue = totalProjValue > 0 ? totalProjValue : (c.dealValue || 0);
              const progress = totalDealValue > 0 ? Math.min((clientIncome / totalDealValue) * 100, 100) : 0;

              return (
              <motion.div
                layout key={c._id}
                onClick={() => nav(`/client/${c._id}`)}
                className="glass p-3 rounded-xl flex flex-col gap-2 hover:border-brand-blue/30 cursor-pointer transition-all group"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-8 rounded-full ${c.status === 'active' ? 'bg-brand-blue' : c.status === 'closed' ? 'bg-emerald-400' : c.status === 'lead' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{c.name} {c.company && <span className="text-slate-500 font-normal">({c.company})</span>}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        {c.deadline && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock size={11} className={new Date(c.deadline) < new Date() ? 'text-rose-400' : ''} />
                            {new Date(c.deadline).toLocaleDateString('en-GB')}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 capitalize bg-white/[0.03] px-2 py-0.5 rounded-md font-medium">{c.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">₹{clientIncome.toLocaleString('en-IN')}</p>
                      <p className="text-[9px] text-slate-500">of ₹{totalDealValue.toLocaleString('en-IN')}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-brand-blue transition-colors" />
                  </div>
                </div>
                <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden border border-white/[0.02]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-500" 
                  />
                </div>
              </motion.div>
            )})}
            {clients.length === 0 && <div className="text-center text-slate-500 py-8">No clients added yet.</div>}
          </div>
        </div>

        {/* Financials */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <IndianRupee className="text-emerald-400" size={14} /> Financials
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  className={inputClass + " pl-7 w-28 !py-1"} 
                  placeholder="Search..." 
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                />
              </div>
              <select 
                className={inputClass + " !py-1 text-[10px] w-20"}
                value={txFilter}
                onChange={e => setTxFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="income">In</option>
                <option value="expense">Out</option>
              </select>
              <button onClick={() => setShowTxForm(!showTxForm)} className="text-[10px] bg-dark-700 hover:bg-dark-600 px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-medium">
                <Plus size={12} /> Add
              </button>
            </div>
          </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {showTxForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => { setShowTxForm(false); setEditingTxId(null); }}
          >
            <motion.form 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-4"
              onClick={e => e.stopPropagation()}
              onSubmit={handleAddTx}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${editingTxId ? 'bg-brand-blue/20 text-brand-blue' : 'bg-emerald-400/20 text-emerald-400'}`}>
                    {editingTxId ? <Pencil size={20} /> : <IndianRupee size={20} />}
                  </div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">{editingTxId ? 'Edit Transaction' : 'New Transaction'}</h2>
                </div>
                <button type="button" onClick={() => { setShowTxForm(false); setEditingTxId(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-full">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Description</label>
                    <input required className={"w-full " + inputClass} value={txForm.title} onChange={e => setTxForm({...txForm, title: e.target.value})} placeholder="e.g. Initial Deposit" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Amount (₹)</label>
                    <input required type="number" className={"w-full " + inputClass} value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Date</label>
                    <input required type="date" className={"w-full " + inputClass} value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Type</label>
                    <select className={"w-full " + inputClass} value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})}>
                      <option value="income">Income (+)</option>
                      <option value="expense">Expense (-)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Client</label>
                    <select className={"w-full " + inputClass} value={txForm.client} onChange={e => setTxForm({...txForm, client: e.target.value, project: ''})}>
                      <option value="">No Client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Project</label>
                  <select className={"w-full " + inputClass} value={txForm.project} onChange={e => setTxForm({...txForm, project: e.target.value})}>
                    <option value="">No Project</option>
                    {projects.filter(p => !txForm.client || (p.client?._id || p.client) === txForm.client).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">Receipt Image</label>
                  <input type="file" id="dash-receipt-modal" className="hidden" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} />
                  <label htmlFor="dash-receipt-modal" className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${receiptFile ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-white/10 hover:border-white/20 text-slate-500'}`}>
                    <ImageIcon size={20} />
                    <span className="text-xs font-bold">{receiptFile ? 'Receipt Selected' : 'Attach Receipt'}</span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={uploading} 
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all shadow-xl disabled:opacity-50 ${editingTxId ? 'bg-brand-blue hover:bg-brand-blue/80 text-white shadow-brand-blue/20' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'}`}
                >
                  {uploading ? 'Processing...' : editingTxId ? 'Update Transaction' : 'Save Transaction'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

          <div className="glass rounded-xl overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto p-1.5 space-y-0.5">
              {filteredTransactions.map(t => (
                <div key={t._id} className="flex items-center justify-between p-2 hover:bg-dark-800/50 rounded-lg transition-colors group">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-md ${t.type === 'income' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>
                      {t.type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-slate-200">{t.title}</p>
                        {t.receiptUrl && (
                          <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-blue hover:text-brand-purple transition-colors">
                            <ImageIcon size={10} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                        <span>{new Date(t.date).toLocaleDateString('en-GB')} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {t.client && <span className="text-brand-blue truncate max-w-[60px]">• {t.client.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => {
                        setEditingTxId(t._id);
                        setTxForm({ 
                          title: t.title, 
                          amount: t.amount, 
                          type: t.type, 
                          client: t.client?._id || '', 
                          project: t.project?._id || '', 
                          date: new Date(t.date).toISOString().split('T')[0] 
                        });
                        setShowTxForm(true);
                      }} className="p-1 text-slate-700 hover:text-brand-blue transition-colors">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => deleteTx(t._id)} className="p-1 text-slate-700 hover:text-rose-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && <div className="text-center text-slate-500 py-8 text-xs">No transactions yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
