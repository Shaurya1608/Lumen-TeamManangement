import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Task from './models/Task.js';
import Group from './models/Group.js';
import Client from './models/Client.js';
import Transaction from './models/Transaction.js';
import Project from './models/Project.js';
import Document from './models/Document.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] 
  } 
});

app.use(helmet({
  contentSecurityPolicy: false, // Disable if you're serving frontend and it has issues with inline scripts
}));
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
}));
app.use(express.json());

// Serve static files from the frontend/dist folder
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'teamflow', allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'] },
});
const upload = multer({ storage });

// DB Connection
mongoose.connect(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await User.deleteMany({ password: { $exists: false } });
  })
  .catch(err => console.error('MongoDB error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key';

// ─── Middleware ───────────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').populate('group', 'name description');
    if (!user) return res.status(404).json({ error: 'Not found' });
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await new User({ name, email, password: hashed, role: role || 'member' }).save();
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const safe = { _id: user._id, name: user.name, role: user.role, email: user.email };
    io.emit('user_created', safe);
    res.status(201).json({ user: safe, token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('group', 'name');
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { _id: user._id, name: user.name, role: user.role, email: user.email, group: user.group }, token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('group', 'name');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin assigns role to any user
app.patch('/api/users/:id/role', auth, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'moderator', 'member'].includes(role))
      return res.status(400).json({ error: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    io.emit('user_updated', { _id: user._id, name: user.name, role: user.role, email: user.email });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GROUPS ───────────────────────────────────────────────────────────────────
// Create group (moderator or admin)
app.post('/api/groups', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const { name, description } = req.body;
    // Moderator can only have one group
    if (req.user.role === 'moderator') {
      const existing = await Group.findOne({ moderator: req.user.userId });
      if (existing) return res.status(400).json({ error: 'You already have a group' });
    }
    const group = await new Group({ name, description, moderator: req.user.userId, members: [req.user.userId] }).save();
    // Attach group to moderator user
    await User.findByIdAndUpdate(req.user.userId, { group: group._id });
    const populated = await Group.findById(group._id)
      .populate('moderator', '-password')
      .populate('members', '-password')
      .populate('joinRequests', '-password');
    io.emit('group_created', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get groups — admin: all, moderator: own, member: all (for browsing)
app.get('/api/groups', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'moderator') query = { moderator: req.user.userId };
    // members and admins get all groups
    const groups = await Group.find(query)
      .populate('moderator', '-password')
      .populate('members', '-password')
      .populate('joinRequests', '-password');
    res.json(groups);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// Member requests to join a group
app.post('/api/groups/:id/request', auth, requireRole('member'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.members.includes(req.user.userId))
      return res.status(400).json({ error: 'Already a member' });
    if (group.joinRequests.includes(req.user.userId))
      return res.status(400).json({ error: 'Request already sent' });
    group.joinRequests.push(req.user.userId);
    await group.save();
    const populated = await Group.findById(group._id)
      .populate('moderator', '-password')
      .populate('members', '-password')
      .populate('joinRequests', '-password');
    io.emit('group_updated', populated);
    // Notify the moderator
    io.emit('notification', { message: `New join request for group "${group.name}"` });
    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Moderator accepts join request
app.put('/api/groups/:id/accept/:userId', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (req.user.role === 'moderator' && group.moderator.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Not your group' });

    group.joinRequests = group.joinRequests.filter(id => id.toString() !== req.params.userId);
    group.members.push(req.params.userId);
    await group.save();
    await User.findByIdAndUpdate(req.params.userId, { group: group._id });

    const populated = await Group.findById(group._id)
      .populate('moderator', '-password')
      .populate('members', '-password')
      .populate('joinRequests', '-password');
    io.emit('group_updated', populated);
    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Moderator rejects join request
app.put('/api/groups/:id/reject/:userId', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    group.joinRequests = group.joinRequests.filter(id => id.toString() !== req.params.userId);
    await group.save();
    const populated = await Group.findById(group._id)
      .populate('moderator', '-password')
      .populate('members', '-password')
      .populate('joinRequests', '-password');
    io.emit('group_updated', populated);
    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove a member from group
app.delete('/api/groups/:id/member/:userId', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    group.members = group.members.filter(id => id.toString() !== req.params.userId);
    await group.save();
    await User.findByIdAndUpdate(req.params.userId, { group: null });
    const populated = await Group.findById(group._id)
      .populate('moderator', '-password')
      .populate('members', '-password')
      .populate('joinRequests', '-password');
    io.emit('group_updated', populated);
    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── TASKS ────────────────────────────────────────────────────────────────────
app.get('/api/tasks', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'moderator') {
      const group = await Group.findOne({ moderator: req.user.userId });
      query = { group: group?._id || null };
    } else if (req.user.role === 'member') {
      const user = await User.findById(req.user.userId);
      query = { group: user.group };
    }
    const tasks = await Task.find(query).populate('assignee createdBy', '-password');
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const task = await new Task(req.body).save();
    const populated = await Task.findById(task._id).populate('assignee createdBy', '-password');
    io.emit('task_created', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    let completedAt = undefined;
    if (status === 'done') {
      const ex = await Task.findById(req.params.id);
      if (ex?.status !== 'done') completedAt = new Date();
    } else if (status) {
      completedAt = null;
    }
    const task = await Task.findByIdAndUpdate(
      req.params.id, { ...req.body, completedAt }, { new: true }
    ).populate('assignee createdBy', '-password');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    io.emit('task_updated', task);
    if (status === 'done')
      io.emit('notification', { message: `Task "${task.title}" completed by ${task.assignee?.name || 'someone'}` });
    res.json(task);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    io.emit('task_deleted', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
app.get('/api/clients', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'moderator') {
      const group = await Group.findOne({ moderator: req.user.userId });
      query = { group: group?._id || null };
    }
    const clients = await Client.find(query).populate('assignedTo createdBy', '-password');
    res.json(clients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/clients/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('assignedTo createdBy', '-password');
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clients', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const client = await new Client({ ...req.body, createdBy: req.user.userId }).save();
    const populated = await Client.findById(client._id).populate('assignedTo createdBy', '-password');
    io.emit('client_created', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/clients/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('assignedTo createdBy', '-password');
    if (!client) return res.status(404).json({ error: 'Client not found' });
    io.emit('client_updated', client);
    res.json(client);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/clients/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    io.emit('client_deleted', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
app.get('/api/transactions', auth, requireRole('admin'), async (req, res) => {
  try {
    const transactions = await Transaction.find().populate('createdBy', '-password').populate('client').populate('project');
    res.json(transactions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', auth, requireRole('admin'), async (req, res) => {
  try {
    const transaction = await new Transaction({ ...req.body, createdBy: req.user.userId }).save();
    const populated = await Transaction.findById(transaction._id).populate('createdBy', '-password').populate('client').populate('project');
    io.emit('transaction_created', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/transactions/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('createdBy', '-password').populate('client').populate('project');
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    io.emit('transaction_updated', transaction);
    res.json(transaction);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/transactions/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    io.emit('transaction_deleted', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
app.get('/api/projects', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    let query = {};
    if (req.query.client) query.client = req.query.client;
    const projects = await Project.find(query).populate('client').populate('createdBy', '-password');
    res.json(projects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const project = await new Project({ ...req.body, createdBy: req.user.userId }).save();
    const populated = await Project.findById(project._id).populate('client').populate('createdBy', '-password');
    io.emit('project_created', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/projects/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('client').populate('createdBy', '-password');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    io.emit('project_updated', project);
    res.json(project);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/projects/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    // Also unlink transactions from this project
    await Transaction.updateMany({ project: req.params.id }, { project: null });
    io.emit('project_deleted', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DOCUMENTS (Paperwork Uploads) ────────────────────────────────────────────
app.get('/api/documents', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    let query = {};
    if (req.query.client) query.client = req.query.client;
    if (req.query.project) query.project = req.query.project;
    const docs = await Document.find(query).populate('client').populate('project').populate('uploadedBy', '-password').sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/documents', auth, requireRole('admin', 'moderator'), upload.array('images', 12), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    
    const docs = await Promise.all(req.files.map(async (file, index) => {
      const title = req.files.length > 1 ? `${req.body.title || 'Doc'} (${index + 1})` : (req.body.title || 'Untitled');
      const doc = await new Document({
        title,
        imageUrl: file.path,
        publicId: file.filename,
        category: req.body.category || 'paperwork',
        folder: req.body.folder || 'General',
        client: req.body.client,
        project: req.body.project || null,
        uploadedBy: req.user.userId,
      }).save();
      return Document.findById(doc._id).populate('client').populate('project').populate('uploadedBy', '-password');
    }));

    docs.forEach(doc => io.emit('document_created', doc));
    res.status(201).json(docs);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/documents/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await cloudinary.uploader.destroy(doc.publicId);
    io.emit('document_deleted', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generic image upload (for transaction receipts)
app.post('/api/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ url: req.file.path, publicId: req.file.filename });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── SOCKET ───────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('Connected:', socket.id);
  socket.on('disconnect', () => console.log('Disconnected:', socket.id));
});

// Handle client-side routing - MUST be after all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
