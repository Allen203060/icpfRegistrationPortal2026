const assert = require('node:assert/strict');
const { allocateParticipant } = require('../services/allocatorService');

console.log('====================================================');
console.log('🧪 Starting Module M2 Allocator Verification Suite');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// Mock 2026 Teams
const sampleTeams = [
  { name: 'Team Joshua', targetCapacity: 20 },
  { name: 'Team Deborah', targetCapacity: 20 },
  { name: 'Team Gideon', targetCapacity: 20 },
  { name: 'Team Esther', targetCapacity: 20 }
];

// Mock 2026 Rooms
const sampleRooms = [
  { name: 'Male Room 1', gender: 'Male', capacity: 2 },
  { name: 'Male Room 2', gender: 'Male', capacity: 2 },
  { name: 'Female Room 1', gender: 'Female', capacity: 2 },
  { name: 'Female Room 2', gender: 'Female', capacity: 2 }
];

// Test 1: Initial Allocation to Empty Teams
test('Tier 1: Initial allocation selects first team alphabetically on tie', () => {
  const result = allocateParticipant(
    { name: 'Alex John', age: 18, gender: 'Male', church: 'IPC', staying: true },
    sampleTeams,
    sampleRooms
  );
  assert.equal(result.assignedTeam, 'Team Deborah'); // Alphabetical among empty teams
  assert.equal(result.assignedRoom, 'Male Room 1');
});

// Test 2: Size Parity Balancing across sequential campers
test('Tier 1: Allocates sequentially to balance team headcounts (size parity)', () => {
  const teams = sampleTeams.map((t) => ({ ...t, members: [] }));
  const rooms = sampleRooms.map((r) => ({ ...r, occupants: [] }));

  for (let i = 0; i < 4; i++) {
    const candidate = {
      name: `Camper ${i}`,
      age: 18 + i,
      gender: i % 2 === 0 ? 'Male' : 'Female',
      church: `Church ${i}`,
      staying: false
    };
    const res = allocateParticipant(candidate, teams, rooms);
    const assignedTeam = teams.find((t) => t.name === res.assignedTeam);
    assignedTeam.members.push({ ...candidate, assignedTeam: res.assignedTeam });
  }

  // Every team should now have exactly 1 member
  for (const t of teams) {
    assert.equal(t.members.length, 1, `Team ${t.name} should have 1 member`);
  }
});

// Test 3: Gender Parity Optimization (Tier 2)
test('Tier 2: Balances gender delta within candidate teams', () => {
  // Team Joshua has 1 Male, Team Deborah has 1 Female
  const teams = [
    { name: 'Team Joshua', members: [{ name: 'M1', gender: 'Male', age: 20 }] },
    { name: 'Team Deborah', members: [{ name: 'F1', gender: 'Female', age: 20 }] }
  ];
  const rooms = sampleRooms.map((r) => ({ ...r, occupants: [] }));

  // Incoming Male should be assigned to Team Deborah to achieve 1M/1F balance instead of Team Joshua (2M/0F)
  const resMale = allocateParticipant(
    { name: 'Incoming Boy', age: 20, gender: 'Male', staying: false },
    teams,
    rooms
  );
  assert.equal(resMale.assignedTeam, 'Team Deborah');

  // Incoming Female should be assigned to Team Joshua to achieve 1M/1F balance instead of Team Deborah (0M/2F)
  const resFemale = allocateParticipant(
    { name: 'Incoming Girl', age: 20, gender: 'Female', staying: false },
    teams,
    rooms
  );
  assert.equal(resFemale.assignedTeam, 'Team Joshua');
});

// Test 4: Age Dispersion Heuristic (Tier 3)
test('Tier 3: Maximizes minimum age gap when size and gender delta tie', () => {
  // Both teams have 1 Male. Team A has 14y, Team B has 25y.
  // Incoming candidate is 15y.
  // Age gap in Team A: |15 - 14| = 1.
  // Age gap in Team B: |15 - 25| = 10.
  // Allocator should choose Team B to maximize age diversity.
  const teams = [
    { name: 'Team Alpha', members: [{ name: 'Young Boy', gender: 'Male', age: 14 }] },
    { name: 'Team Beta', members: [{ name: 'Older Boy', gender: 'Male', age: 25 }] }
  ];
  const rooms = sampleRooms.map((r) => ({ ...r, occupants: [] }));

  const res = allocateParticipant(
    { name: 'New 15yo Camper', age: 15, gender: 'Male', staying: false },
    teams,
    rooms
  );
  assert.equal(res.assignedTeam, 'Team Beta');
});

// Test 5: Church / Locality Dispersion (Tier 4)
test('Tier 4: Penalizes teams with duplicate church affiliations', () => {
  // Both teams have equal size (0 members), but let's give each 1 member with different churches
  const teams = [
    { name: 'Team Alpha', members: [{ name: 'A', gender: 'Male', age: 20, church: 'IPC Kottayam' }] },
    { name: 'Team Beta', members: [{ name: 'B', gender: 'Male', age: 20, church: 'CSI Trivandrum' }] }
  ];
  const rooms = sampleRooms.map((r) => ({ ...r, occupants: [] }));

  const res = allocateParticipant(
    { name: 'New IPC Camper', age: 20, gender: 'Male', church: 'IPC Kottayam', staying: false },
    teams,
    rooms
  );
  // Should choose Team Beta to prevent two IPC Kottayam campers from sharing Team Alpha
  assert.equal(res.assignedTeam, 'Team Beta');
});

// Test 6: Invariant #1 — Strict Gender Segregation in Rooms
test('Invariant #1: Males are NEVER placed in Female rooms, and vice versa', () => {
  const rooms = [
    { name: 'Male Room 1', gender: 'Male', capacity: 10, occupants: [] },
    { name: 'Female Room 1', gender: 'Female', capacity: 10, occupants: [] }
  ];

  const maleRes = allocateParticipant(
    { name: 'Boy Camper', age: 19, gender: 'Male', staying: true },
    sampleTeams,
    rooms
  );
  assert.equal(maleRes.assignedRoom, 'Male Room 1');

  const femaleRes = allocateParticipant(
    { name: 'Girl Camper', age: 19, gender: 'Female', staying: true },
    sampleTeams,
    rooms
  );
  assert.equal(femaleRes.assignedRoom, 'Female Room 1');
});

// Test 7: Room Capacity Ceiling & Exhaustion
test('Room Capacity: Rejects allocation when room capacity is exhausted', () => {
  const rooms = [
    { name: 'Male Room Small', gender: 'Male', capacity: 1, occupants: [{ name: 'Existing' }] }
  ];

  assert.throws(
    () => {
      allocateParticipant(
        { name: 'Overflow Boy', age: 19, gender: 'Male', staying: true },
        sampleTeams,
        rooms
      );
    },
    (err) => err.code === 'ROOM_CAPACITY_EXHAUSTED'
  );
});

// Test 8: Day Scholars consume zero room capacity
test('Day Scholars: staying: false returns empty room without consuming beds', () => {
  const rooms = [
    { name: 'Male Room Full', gender: 'Male', capacity: 1, occupants: [{ name: 'Existing' }] }
  ];

  const res = allocateParticipant(
    { name: 'Day Camper', age: 19, gender: 'Male', staying: false },
    sampleTeams,
    rooms
  );
  assert.equal(res.assignedRoom, '');
});

// Test 9: Input Validation
test('Input Validation: Rejects invalid age and gender', () => {
  assert.throws(
    () => allocateParticipant({ name: 'Invalid', age: -5, gender: 'Male' }, sampleTeams, sampleRooms),
    (err) => err.code === 'INVALID_AGE'
  );
  assert.throws(
    () => allocateParticipant({ name: 'Invalid', age: 20, gender: 'Unknown' }, sampleTeams, sampleRooms),
    (err) => err.code === 'INVALID_GENDER'
  );
});

// Test 10: Anti-consecutive registration penalty
test('Anti-consecutive: Avoids lastAssignedTeam when other tied teams exist', () => {
  const teams = [
    { name: 'Team Joshua', members: [] },
    { name: 'Team Deborah', members: [] }
  ];
  const rooms = sampleRooms.map((r) => ({ ...r, occupants: [] }));

  // First camper was placed in Team Deborah (alphabetical tie)
  // When next camper arrives with identical demographics, lastAssignedTeam='Team Deborah' forces assignment to Team Joshua
  const res = allocateParticipant(
    { name: 'Camper 2', age: 18, gender: 'Male', staying: false },
    teams,
    rooms,
    { lastAssignedTeam: 'Team Deborah' }
  );
  assert.equal(res.assignedTeam, 'Team Joshua');
});

// Test 11: Explicit requestedTeam override for Group Registration
test('Group Registration: requestedTeam puts camper into requested team if available', () => {
  const teams = [
    { name: 'Team Joshua', targetCapacity: 20, members: [] },
    { name: 'Team Deborah', targetCapacity: 20, members: [] }
  ];
  const rooms = sampleRooms.map((r) => ({ ...r, occupants: [] }));

  const res = allocateParticipant(
    { name: 'Sibling 2', age: 16, gender: 'Female', staying: false },
    teams,
    rooms,
    { requestedTeam: 'Team Joshua' }
  );
  assert.equal(res.assignedTeam, 'Team Joshua');
});

console.log('\n====================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
