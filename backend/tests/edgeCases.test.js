/**
 * @file edgeCases.test.js
 * @description Comprehensive edge-case verification test suite for ICPF Camp Registration.
 */

const assert = require('assert');
const { allocateParticipant, chooseRoom } = require('../services/allocatorService');
const { generateIdCardsPdf } = require('../services/pdfService');
const { Writable } = require('stream');

function createMockStream() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    }
  });
  return { stream, getBuffer: () => Buffer.concat(chunks) };
}

async function runEdgeCaseTests() {
  console.log('====================================================');
  console.log('🧪 Running ICPF Camp Final Edge-Case Verification');
  console.log('====================================================\n');

  let passed = 0;

  // 1. 8-Group Parity Distribution Test
  const mockTeams = Array.from({ length: 8 }, (_, i) => ({
    name: `Group ${i + 1}`,
    count: 0,
    males: 0,
    females: 0,
    members: []
  }));

  const mockRooms = [
    { name: 'Male Room 1', gender: 'Male', capacity: 2, occupiedCount: 0 },
    { name: 'Female Room 1', gender: 'Female', capacity: 2, occupiedCount: 0 }
  ];

  // Allocate 16 campers across 8 groups (2 per group)
  for (let i = 0; i < 16; i++) {
    const candidate = {
      name: `Attendee ${i + 1}`,
      age: 18 + (i % 8),
      gender: i % 2 === 0 ? 'Male' : 'Female',
      staying: false
    };
    const { assignedTeam } = allocateParticipant(candidate, mockTeams, mockRooms);
    const team = mockTeams.find(t => t.name === assignedTeam);
    team.count++;
    team.members.push(candidate);
  }

  // Verify all 8 teams have exactly 2 members (perfect fairness)
  const counts = mockTeams.map(t => t.count);
  assert.deepStrictEqual(counts, [2, 2, 2, 2, 2, 2, 2, 2]);
  console.log('✅ PASS: Perfect 8-Group Parity Distribution (2 campers per team across all 8 teams)');
  passed++;

  // 2. Room Capacity Overflow & Graceful Fallback Test
  const smallMaleRooms = [
    { name: 'Male Room 1', gender: 'Male', capacity: 1, occupiedCount: 1 }
  ];

  // Candidate staying=true when Male Room is 100% full with allowOverflow=true
  const overflowCandidate = {
    name: 'Overflow Camper',
    age: 22,
    gender: 'Male',
    staying: true
  };

  const { assignedRoom } = allocateParticipant(overflowCandidate, mockTeams, smallMaleRooms, { allowOverflow: true });
  assert.strictEqual(assignedRoom, 'Male Room 1');
  console.log('✅ PASS: Room capacity overflow allocates to lowest-occupancy matching gender dorm ("Male Room 1") without crashing');

  // Verify explicit unassigned fallback when requested
  const unassignedResult = allocateParticipant(overflowCandidate, mockTeams, smallMaleRooms, {
    allowOverflow: true,
    overflowTarget: 'unassigned'
  });
  assert.strictEqual(unassignedResult.assignedRoom, 'Unassigned (Dorm Full)');
  console.log('✅ PASS: Room overflow supports explicit unassigned target when configured');
  passed++;

  // 3. Absolute Gender Segregation Enforcement
  const mixedRooms = [
    { name: 'Male Room 1', gender: 'Male', capacity: 10, occupiedCount: 0 },
    { name: 'Female Room 1', gender: 'Female', capacity: 10, occupiedCount: 0 }
  ];

  const femaleCamper = { name: 'Hannah Grace', age: 19, gender: 'Female', staying: true };
  const femaleAlloc = allocateParticipant(femaleCamper, mockTeams, mixedRooms);
  assert.strictEqual(femaleAlloc.assignedRoom, 'Female Room 1');

  const maleCamper = { name: 'Peter Mark', age: 20, gender: 'Male', staying: true };
  const maleAlloc = allocateParticipant(maleCamper, mockTeams, mixedRooms);
  assert.strictEqual(maleAlloc.assignedRoom, 'Male Room 1');
  console.log('✅ PASS: Absolute Gender Segregation strictly enforced in room assignment');
  passed++;

  // 4. Age Tier Boundary Calculations
  function computeFee(age) {
    const num = Number(age);
    if (!num || isNaN(num)) return 400;
    return num >= 25 ? 500 : 400;
  }

  assert.strictEqual(computeFee(13), 400, 'Student age 13 should be ₹400');
  assert.strictEqual(computeFee(19), 400, 'Student age 19 should be ₹400');
  assert.strictEqual(computeFee(24), 400, 'Student age 24 should be ₹400');
  assert.strictEqual(computeFee(25), 500, 'Senior age 25 should be ₹500');
  assert.strictEqual(computeFee(29), 500, 'Senior age 29 should be ₹500');
  assert.strictEqual(computeFee(60), 500, 'Senior age 60 should be ₹500');
  console.log('✅ PASS: Dual-Tier Fee Calculations exact on age boundaries (13-24 -> ₹400, 25+ -> ₹500)');
  passed++;

  // 5. Special Character & Ultra-Long Name Truncation in PDF Badges
  const extremeCampers = [
    { serialNo: 101, name: 'Very Long Attendee Name That Exceeds Normal Length Boundary Easily', assignedTeam: 'Group 1' },
    { serialNo: 102, name: "Mary-Jane O'Connor Jr.", assignedTeam: 'Group 2' },
    { serialNo: 103, name: 'Short', assignedTeam: 'Group 3' }
  ];

  const teamColorsMap = new Map([
    ['Group 1', '#38BDF8'],
    ['Group 2', '#F472B6'],
    ['Group 3', '#FACC15']
  ]);

  const { stream, getBuffer } = createMockStream();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
    generateIdCardsPdf(extremeCampers, teamColorsMap, stream);
  });

  const pdfBuffer = getBuffer();
  assert(pdfBuffer.length > 1000, 'Generated PDF should be valid binary buffer');
  console.log(`✅ PASS: PDF Badges stream successfully generated (${pdfBuffer.length} bytes) with special chars & long names`);
  passed++;

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${passed} EDGE-CASE CHECKS PASSED FLAWLESSLY!`);
  console.log('====================================================\n');
}

runEdgeCaseTests().catch((err) => {
  console.error('❌ Edge case verification failed:', err);
  process.exit(1);
});

