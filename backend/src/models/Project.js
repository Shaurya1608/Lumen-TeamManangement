import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  dealValue: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'on-hold', 'cancelled'], default: 'active' },
  deadline: { type: Date, default: null },
  milestones: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    deadline: { type: Date, default: null }
  }],
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);
export default Project;
