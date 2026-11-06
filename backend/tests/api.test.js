const http = require('node:http');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('../server');
const { Participant } = require('../models');

console.log('====================================================');
console.log('🧪 Starting Module M3 REST API Verification Suite');
console.log('====================================================\n');

const TEST_PORT = 5098;
let passed = 0;
let failed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  };
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path,
        method,
        headers: {
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
              }
            : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, body: data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runApiTests() {
  await startServer(TEST_PORT);
  await Participant.deleteMany({});

  let createdParticipantId = null;

  const tests = [
    test('GET /api/config/active retrieves active 2026 camp configuration', async () => {
      const res = await request('GET', '/api/config/active');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.year, 2026);
      assert.ok(Array.isArray(res.body.data.teams));
      assert.equal(res.body.data.teams.length, 10);
    }),

    test('POST /api/participants/register performs atomic allocation & serialNo creation', async () => {
      const res = await request('POST', '/api/participants/register', {
        name: 'Timothy George',
        age: 21,
        gender: 'Male',
        church: 'ICPF Kollam',
        location: 'Kerala',
        staying: true,
        phone: '+91 98470 99999'
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.serialNo >= 101);
      assert.ok(res.body.data.assignedTeam);
      assert.ok(res.body.data.assignedRoom);
      assert.match(res.body.data.assignedRoom, /Male Room/);
      createdParticipantId = res.body.data._id;
    }),

    test('POST /api/participants/register validates required input fields', async () => {
      const res = await request('POST', '/api/participants/register', {
        name: '',
        age: -2,
        gender: 'Other'
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error);
    }),

    test('GET /api/participants supports search filtering', async () => {
      const res = await request('GET', '/api/participants?search=Timothy');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.some((p) => p.name === 'Timothy George'));
    }),

    test('GET /api/participants/:id returns single participant record', async () => {
      assert.ok(createdParticipantId);
      const res = await request('GET', `/api/participants/${createdParticipantId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Timothy George');
    }),

    test('PUT /api/participants/:id updates record or manual override', async () => {
      assert.ok(createdParticipantId);
      const res = await request('PUT', `/api/participants/${createdParticipantId}`, {
        assignedTeam: 'Group B',
        notes: 'Supervisor override test'
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.assignedTeam, 'Group B');
      assert.equal(res.body.data.notes, 'Supervisor override test');
    }),

    test('DELETE /api/participants/:id removes participant', async () => {
      assert.ok(createdParticipantId);
      const res = await request('DELETE', `/api/participants/${createdParticipantId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify deletion
      const verifyRes = await request('GET', `/api/participants/${createdParticipantId}`);
      assert.equal(verifyRes.status, 404);
    })
  ];

  for (const t of tests) {
    await t();
  }

  await stopServer();
  const { disconnectDB } = require('../config/db');
  await disconnectDB();

  console.log('\n====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runApiTests().catch((err) => {
  console.error('Fatal API test error:', err);
  process.exit(1);
});
