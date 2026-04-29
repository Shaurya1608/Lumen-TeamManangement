import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  category: { type: String, enum: ['paperwork', 'receipt', 'contract', 'other'], default: 'paperwork' },
  folder: { type: String, default: 'General' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Document = mongoose.model('Document', documentSchema);
export default Document;
