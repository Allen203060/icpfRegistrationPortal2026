/**
 * @file verifyCore.js
 * @description Verification test script for Module M1 (Backend Core & Database Foundation).
 * Validates:
 * 1. Express server bootstrap & health check endpoint (/api/health)
 * 2. MongoDB connection & graceful disconnection
 * 3. CampConfig seeding & schema validations
 * 4. Participant model creation, auto-incrementing serialNo (starts at 101), and constraints
 * 5. Room & Team modular models
 */

const http = require('http');
const mongoose = require('mongoose');
const { app, startServer, stopServer } = require('./server');
const { connectDB, disconnectDB } = require('./config/db');
const { Participant, CampConfig, Team, Room } = require('./models');

// Helper to make simple HTTP GET request
function makeGetRequest(path, port) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 Starting Module M1 Backend Core Verification Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const TEST_PORT = 5099;

  try {
    // 1. Test Server Startup & HTTP endpoints
    console.log('[Test 1] Starting Express Server on test port ' + TEST_PORT + '...');
    const serverInstance = await startServer(TEST_PORT);
    assert(serverInstance !== null, 'Server started and listening');

    console.log('[Test 2] Testing GET /api/health...');
    const healthRes = await makeGetRequest('/api/health', TEST_PORT);
    assert(healthRes.status === 200, 'GET /api/health returned 200 OK');
    assert(healthRes.body.status === 'ok', 'Health status is "ok"');
    assert(typeof healthRes.body.uptime === 'number', 'Uptime is returned as number');
    assert(healthRes.body.system.includes('ICPF'), 'System string matches ICPF Camp System');

    console.log('[Test 3] Testing 404 handler for unknown routes...');
    const notFoundRes = await makeGetRequest('/api/unknown-endpoint', TEST_PORT);
    assert(notFoundRes.status === 404, 'Unknown route returned 404');
    assert(notFoundRes.body.success === false, 'Error response has success: false');
    assert(notFoundRes.body.error.code === 'ROUTE_NOT_FOUND', 'Error code is ROUTE_NOT_FOUND');

    // 2. Test CampConfig
    console.log('\n[Test 4] Verifying CampConfig Auto-seeding and Methods...');
    const activeConfig = await CampConfig.getActiveConfig();
    assert(activeConfig !== null, 'Active CampConfig successfully retrieved/seeded');
    assert(activeConfig.year === 2026, `CampConfig year is 2026 (got ${activeConfig.year})`);
    assert(activeConfig.campTitle === 'ICPF Camp 2026', `CampConfig title is "ICPF Camp 2026"`);
    assert(Array.isArray(activeConfig.teams) && activeConfig.teams.length === 10, `Exactly 10 teams configured (got ${activeConfig.teams.length})`);
    assert(Array.isArray(activeConfig.rooms) && activeConfig.rooms.length === 10, `Exactly 10 rooms configured (got ${activeConfig.rooms.length})`);

    // Verify Gender Segregation in Seeded Rooms
    const maleRooms = activeConfig.rooms.filter((r) => r.gender === 'Male');
    const femaleRooms = activeConfig.rooms.filter((r) => r.gender === 'Female');
    assert(maleRooms.length === 5, `5 Male rooms configured`);
    assert(femaleRooms.length === 5, `5 Female rooms configured`);

    // 3. Test Participant Model & Auto-Incrementing Serial Number
    console.log('\n[Test 5] Verifying Participant Model & Auto-Incrementing serialNo...');
    // Clean up any test participants first
    await Participant.deleteMany({ notes: 'VERIFICATION_TEST' });

    const p1 = new Participant({
      name: 'Test Johnathan Doe',
      age: 22,
      gender: 'Male',
      church: 'St. Thomas IPC',
      location: 'Kottayam',
      staying: true,
      phone: '+919876543210',
      assignedTeam: 'Team Joshua',
      assignedRoom: 'Male Room 1',
      notes: 'VERIFICATION_TEST'
    });
    await p1.save();

    assert(p1.serialNo >= 101, `Participant 1 serialNo is >= 101 (got ${p1.serialNo})`);

    const p2 = new Participant({
      name: 'Test Mary Ann',
      age: 20,
      gender: 'Female',
      church: 'CSI Church',
      location: 'Ernakulam',
      staying: true,
      phone: '+919876543211',
      assignedTeam: 'Team Deborah',
      assignedRoom: 'Female Room 6',
      notes: 'VERIFICATION_TEST'
    });
    await p2.save();

    assert(p2.serialNo === p1.serialNo + 1, `Participant 2 serialNo auto-incremented sequentially (${p2.serialNo} === ${p1.serialNo + 1})`);

    // 4. Test Participant Schema Validations
    console.log('\n[Test 6] Verifying Participant Schema Invariant Validations...');
    let invalidGenderError = null;
    try {
      const invalidP = new Participant({
        name: 'Invalid Gender User',
        age: 25,
        gender: 'Other', // Invalid: Must be Male or Female
        assignedTeam: 'Team Joshua',
        notes: 'VERIFICATION_TEST'
      });
      await invalidP.save();
    } catch (err) {
      invalidGenderError = err;
    }
    assert(invalidGenderError !== null, 'Schema rejected invalid gender ("Other") as required by Invariant #1');

    let missingNameError = null;
    try {
      const invalidP2 = new Participant({
        age: 25,
        gender: 'Male',
        assignedTeam: 'Team Joshua',
        notes: 'VERIFICATION_TEST'
      });
      await invalidP2.save();
    } catch (err) {
      missingNameError = err;
    }
    assert(missingNameError !== null, 'Schema rejected participant missing required name');

    // 5. Test Modular Team & Room Models
    console.log('\n[Test 7] Verifying Modular Team & Room Models...');
    await Team.deleteMany({ description: 'VERIFICATION_TEST' });
    await Room.deleteMany({ notes: 'VERIFICATION_TEST' });

    const team = await Team.create({
      name: 'Test Team Omega',
      themeColor: '#4A90E2',
      targetCapacity: 20,
      description: 'VERIFICATION_TEST'
    });
    assert(team.name === 'Test Team Omega', 'Team Omega created with valid hex color');

    const room = await Room.create({
      name: 'Test Male Room Special',
      gender: 'Male',
      capacity: 8,
      notes: 'VERIFICATION_TEST'
    });
    assert(room.gender === 'Male' && room.capacity === 8, 'Room created with capacity 8 and Male gender');

    // Clean up test data
    await Participant.deleteMany({ notes: 'VERIFICATION_TEST' });
    await Team.deleteMany({ description: 'VERIFICATION_TEST' });
    await Room.deleteMany({ notes: 'VERIFICATION_TEST' });

    console.log('\n[Teardown] Stopping test HTTP server and closing DB connection...');
    await stopServer();
    await disconnectDB();

    console.log('\n====================================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL MODULE M1 VERIFICATION TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    await stopServer().catch(() => {});
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
}

runVerification();
