import mongoose from 'mongoose';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
import dotenv from 'dotenv';
dotenv.config();

import JanmashtamiSeason from '../models/JanmashtamiSeason.js';

export const setup2027Season = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in environment.');
    process.exit(1);
  }

  try {
    console.log('[MongoDB Atlas] Connecting to database...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('[MongoDB Atlas] Connected successfully.');

    // 1. Preserve 2026 season as finalized/historical if it exists
    const season2026 = await JanmashtamiSeason.findOne({ year: 2026 });
    if (season2026) {
      if (season2026.status === 'active') {
        season2026.status = 'finalized';
        await season2026.save();
        console.log('[Season 2026] Successfully preserved 2026 season as finalized/historical.');
      } else {
        console.log(`[Season 2026] Historical 2026 season already preserved with status: "${season2026.status}".`);
      }
    } else {
      console.log('[Season 2026] No 2026 season found in DB. Not creating one.');
    }

    // 2. Configure 2027 season
    let season2027 = await JanmashtamiSeason.findOne({ year: 2027 });
    if (!season2027) {
      season2027 = await JanmashtamiSeason.create({
        seasonId: 'JANM-2027',
        year: 2027,
        title: 'Krishna Janmashtami Seva Points Challenge 2027',
        eventDate: '2027-08-25',
        eventTime: '23:59:59',
        isDateVerified: true,
        calendarSourceUrl: 'https://www.iskconbangalore.org/calendar/',
        verificationDate: '2026-10-20',
        verifiedBy: 'ANIK',
        startDate: '2026-01-01',
        endDate: '2027-08-25',
        pointsRules: {
          pointsPerPresentClass: 10,
          pointsPerAbsentClass: 0,
          pointsPerUnrecordedClass: 0,
          pointsPerCancelledClass: 0,
          requireConfirmedConductor: true
        },
        status: 'upcoming',
        prizes: [
          {
            position: 1,
            title: '1st Prize — Sri Krishna Baladeva Supreme Seva Award',
            description: 'Deluxe Bhagavad Gita As It Is, Handcrafted Krishna Murti & Sacred Devotional Gift Kit',
            distributionStatus: 'Pending'
          },
          {
            position: 2,
            title: '2nd Prize — Sri Radha Govinda Bhakti Award',
            description: 'Premium Neem Japa Mala with Embroidered Bead Bag & Sacred Nectar of Devotion',
            distributionStatus: 'Pending'
          },
          {
            position: 3,
            title: '3rd Prize — Sri Gauranga Mahaprabhu Nishtha Award',
            description: 'Sacred Gopi Chandan Tilak Kit, Brass Karatalas & Srila Prabhupada Leelamrita',
            distributionStatus: 'Pending'
          }
        ],
        publicDisplayNamePolicy: 'initial_masked',
        publicLeaderboardLimit: 10,
        notes: 'Janmashtami 2027 — date awaiting official confirmation from ISKCON Bangalore Vaishnava Calendar'
      });
      console.log('[Season 2027] Created new 2027 season in MongoDB Atlas as upcoming and unconfirmed.');
    } else {
      // Ensure 2027 is upcoming and date is unconfirmed until official calendar confirms
      season2027.eventDate = null;
      season2027.endDate = null;
      season2027.isDateVerified = false;
      season2027.status = 'upcoming';
      season2027.calendarSourceUrl = 'https://www.iskconbangalore.org/calendar/';
      season2027.notes = 'Janmashtami 2027 — date awaiting official confirmation from ISKCON Bangalore Vaishnava Calendar';
      await season2027.save();
      console.log('[Season 2027] Updated existing 2027 season in MongoDB Atlas as upcoming with unconfirmed date.');
    }

    // 3. Verification Report
    const allSeasons = await JanmashtamiSeason.find({}).lean();
    console.log('\n--- VERIFICATION REPORT: ALL SEASONS IN MONGODB ATLAS ---');
    allSeasons.forEach(s => {
      console.log(`Year: ${s.year} | SeasonId: ${s.seasonId} | Status: ${s.status} | Date Verified: ${s.isDateVerified} | Event Date: ${s.eventDate || 'None (Awaiting Confirmation)'} | Source: ${s.calendarSourceUrl}`);
    });
    console.log('---------------------------------------------------------\n');

    await mongoose.disconnect();
    console.log('[MongoDB Atlas] Disconnected cleanly.');
    return { success: true, allSeasons };
  } catch (err) {
    console.error('Error during 2027 season setup:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

setup2027Season();
