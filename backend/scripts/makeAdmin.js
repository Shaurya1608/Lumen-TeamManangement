import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const email = process.argv[2] || 'shaurya098n@gmail.com';

await mongoose.connect(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
});

const result = await mongoose.connection.db.collection('users').updateOne(
  { email },
  { $set: { role: 'admin' } }
);

console.log(`Role updated for ${email}:`, result.modifiedCount ? '✅ Success' : '❌ User not found or already admin');
await mongoose.disconnect();
process.exit(0);
