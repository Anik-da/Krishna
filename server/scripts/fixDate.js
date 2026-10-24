import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e){}

async function updateDate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const JanmashtamiSeason = mongoose.model('JanmashtamiSeason', new mongoose.Schema({}, { strict: false }));
  const res = await JanmashtamiSeason.updateMany(
    { year: 2027 },
    { 
      eventDate: '2027-08-25', 
      endDate: '2027-08-25',
      isDateVerified: true,
      verificationDate: '2026-10-20',
      verifiedBy: 'ANIK'
    }
  );
  console.log('Updated 2027 season date in MongoDB to 2027-08-25:', res);
  const all2027 = await JanmashtamiSeason.find({ year: 2027 });
  console.log('Current in DB:', all2027.map(s => ({ year: s.year, eventDate: s.eventDate })));
  process.exit(0);
}
updateDate().catch(e => { console.error(e); process.exit(1); });
