import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e){}
import JanmashtamiSeason from '../models/JanmashtamiSeason.js';

async function updateNotes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const res = await JanmashtamiSeason.updateMany(
      {},
      { $set: { notes: 'Official ISKCON Vaishnava Calendar Seva Points Challenge' } }
    );
    console.log('Updated documents:', res.modifiedCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

updateNotes();
