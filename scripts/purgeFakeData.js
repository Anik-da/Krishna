import mongoose from 'mongoose';
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e){}
import dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '../src/db/firebaseConfig.js';

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('janmashtamiseasons');
  
  // 1. Delete fake 2026 historical season
  const delRes = await col.deleteMany({ seasonId: 'JANM-2026' });
  console.log('Deleted fake seasons from MongoDB:', delRes.deletedCount);
  
  // 2. Empty out fake default prizes for 2027
  await col.updateOne({ seasonId: 'JANM-2027' }, { $set: { prizes: [] } });
  console.log('Purged fake prizes for 2027 in MongoDB Atlas.');

  const all = await col.find().toArray();
  console.log('Active MongoDB Seasons:', all.map(s => ({ id: s.seasonId, year: s.year, prizes: s.prizes?.length || 0 })));

  // 3. Sync to Firebase Firestore
  console.log('Connecting to Firebase Firestore...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    await deleteDoc(doc(db, 'janmashtamiSeasons', 'JANM-2026'));
  } catch (e) {}

  if (all.length > 0) {
    const s2027 = all.find(s => s.seasonId === 'JANM-2027') || all[0];
    const clean2027 = { ...s2027, prizes: [] };
    delete clean2027._id;
    await setDoc(doc(db, 'janmashtamiSeasons', 'JANM-2027'), clean2027);
    console.log('Updated JANM-2027 in Firestore with empty prizes.');
  }

  await mongoose.disconnect();
  console.log('Purge completed successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
