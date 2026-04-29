import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  status: { type: String, enum: ['lead', 'active', 'closed', 'lost'], default: 'lead' },
  deadline: { type: Date, default: null },
  dealValue: { type: Number, default: 0 },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);
export default Client;
