import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  receiptUrl: { type: String, default: null },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
