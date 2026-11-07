/**
 * @file cleanDatabase.js
 * @description Safe production-ready database cleanup script.
 * Purges all test participants and resets the sequential ID counter back to 100
 * (so the next camper registered will be #101).
 * Preserves the active CampConfig (10 teams and 10 rooms) so the camp is 100% ready.
 *
 * Usage:
 *   node backend/scripts/cleanDatabase.js [--uri <MONGO_URI>]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { Participant, Counter, CampConfig } = require('../models');

async function cleanDatabase() {
  console.log('================================================================');
  console.log('🧹 ICPF Camp Database Reset & Pre-Camp Purge Utility');
  console.log('================================================================\n');

  // Parse optional CLI URI override
  const args = process.argv.slice(2);
  const uriIndex = args.indexOf('--uri');
  const targetUri = uriIndex !== -1 && args[uriIndex + 1] ? args[uriIndex + 1] : process.env.MONGO_URI;

  console.log(`Connecting to database...`);
  await connectDB(targetUri);

  // 1. Check existing participant count
  const existingCount = await Participant.countDocuments({});
  console.log(`• Found ${existingCount} existing participant records.`);

  // 2. Delete all participants
  if (existingCount > 0) {
    const deleteResult = await Participant.deleteMany({});
    console.log(`✅ Purged ${deleteResult.deletedCount} participant records.`);
  } else {
    console.log(`✅ No existing participants to delete.`);
  }

  // 3. Reset the Atomic Serial Counter
  // Setting seq to 100 ensures the next call to Counter.getNext('participant_serialNo', 100)
  // will atomically increment and return exactly 101.
  await Counter.findOneAndUpdate(
    { _id: 'participant_serialNo' },
    { seq: 100 },
    { upsert: true, new: true }
  );
  console.log(`✅ Reset atomic counter "participant_serialNo" to 100.`);
  console.log(`   👉 Next registration will be assigned Serial #101.`);

  // 4. Verify & Preserve CampConfig
  const config = await CampConfig.getActiveConfig();
  console.log(`\n• Active Camp Configuration: "${config.campTitle}" (Year: ${config.year})`);
  console.log(`  - Teams Configured: ${config.teams?.length || 0} teams (${config.teams?.map((t) => t.name).join(', ')})`);
  console.log(`  - Rooms Configured: ${config.rooms?.length || 0} rooms`);

  console.log('\n================================================================');
  console.log('🎉 DATABASE IS FRESH & READY FOR LIVE CAMP REGISTRATION!');
  console.log('================================================================\n');

  await disconnectDB();
  process.exit(0);
}

cleanDatabase().catch(async (err) => {
  console.error('\n❌ Database cleanup failed:', err.message);
  try {
    await disconnectDB();
  } catch {}
  process.exit(1);
});

