/**
 * @file loadTest.js
 * @description High-Throughput Concurrent Load Testing Script for ICPF Camp Registration System.
 * Simulates real-world Google Forms / live check-in bursts at 10-25+ requests per second.
 * Measures throughput, latency, group distribution balance, and dorm gender segregation invariants.
 *
 * Usage:
 *   node backend/tests/loadTest.js [--total 100] [--rate 20] [--url http://localhost:5000]
 */

const http = require('http');

// Parse CLI Arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
}

const TOTAL_REQUESTS = parseInt(getArg('--total', '80'), 10);
const TARGET_RPS = parseInt(getArg('--rate', '20'), 10); // 20 requests per second
const BASE_URL = getArg('--url', 'http://localhost:5000');

// Realistic Sample Dataset
const FIRST_NAMES = [
  'Samuel', 'Sarah', 'Joshua', 'Hannah', 'Daniel', 'Esther', 'David', 'Miriam',
  'Joseph', 'Rachel', 'Benjamin', 'Rebecca', 'Timothy', 'Lydia', 'Nathan', 'Grace',
  'Ephraim', 'Priscilla', 'Micah', 'Tabitha', 'Aaron', 'Abigail', 'Ezekiel', 'Elizabeth'
];
const LAST_NAMES = [
  'George', 'Thomas', 'Mathew', 'Varghese', 'Philip', 'Kurian', 'Alexander',
  'Koshy', 'Jacob', 'Cherian', 'Oommen', 'Samuel', 'Abraham', 'John', 'Paul'
];
const CHURCHES = [
  'IPC Ebenezer', 'CSI Cathedral', 'St. Thomas Mar Thoma', 'Bethel AG Church',
  'ICPF Trivandrum', 'Sharon Fellowship', 'Brethren Assembly', 'New Life Church'
];
const CITIES = ['Kottayam', 'Kochi', 'Trivandrum', 'Kozhikode', 'Bangalore', 'Tiruvalla', 'Pathanamthitta'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCamper(i) {
  const gender = i % 2 === 0 ? 'Male' : 'Female';
  const age = Math.floor(Math.random() * 15) + 14; // 14 to 28
  const feeRate = i % 3 === 0 ? 400 : 500;
  const isPaid = i % 4 !== 0;

  return {
    name: `${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)}_${i + 1}`,
    age,
    gender,
    church: getRandomItem(CHURCHES),
    location: getRandomItem(CITIES),
    staying: i % 10 !== 0, // 90% residential
    phone: `+91 984${Math.floor(1000000 + Math.random() * 9000000)}`,
    notes: i % 7 === 0 ? 'Vegetarian, Early arrival' : '',
    paymentStatus: isPaid ? (i % 2 === 0 ? 'Paid Online' : 'Paid Cash') : 'Waiting Payment',
    feeTotal: feeRate,
    amountPaid: isPaid ? feeRate : 0,
    balanceDue: isPaid ? 0 : feeRate,
    paymentNotes: isPaid ? `UPI_REF_${100000 + i}` : ''
  };
}

function sendPostRequest(url, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const parsedUrl = new URL(`${url}/api/participants/register`);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
        resolve({
          statusCode: res.statusCode,
          duration,
          body,
          success: res.statusCode === 201
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        duration: Date.now() - startTime,
        error: err.message,
        success: false
      });
    });

    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLoadTest() {
  console.log('================================================================');
  console.log('🚀 ICPF Backend High-Throughput Concurrency & Load Tester');
  console.log('================================================================');
  console.log(`Target Target:  ${BASE_URL}/api/participants/register`);
  console.log(`Total Campers:  ${TOTAL_REQUESTS}`);
  console.log(`Target Pace:    ${TARGET_RPS} requests / second\n`);

  const results = [];
  const delayBetweenBatches = 1000; // 1 second intervals
  const batchSize = TARGET_RPS;
  const totalBatches = Math.ceil(TOTAL_REQUESTS / batchSize);

  const testStartTime = Date.now();

  for (let b = 0; b < totalBatches; b++) {
    const startIndex = b * batchSize;
    const currentBatchCount = Math.min(batchSize, TOTAL_REQUESTS - startIndex);
    const batchStartTime = Date.now();

    const promises = [];
    for (let i = 0; i < currentBatchCount; i++) {
      const camperIndex = startIndex + i;
      const camper = generateCamper(camperIndex);
      promises.push(sendPostRequest(BASE_URL, camper));
    }

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    const elapsed = Date.now() - batchStartTime;
    const progress = Math.min(100, Math.round(((startIndex + currentBatchCount) / TOTAL_REQUESTS) * 100));
    process.stdout.write(`  [Burst ${b + 1}/${totalBatches}] Fired ${currentBatchCount} reqs in ${elapsed}ms -> Progress: ${progress}%\r`);

    // Maintain target RPS rhythm
    if (elapsed < delayBetweenBatches && b < totalBatches - 1) {
      await sleep(delayBetweenBatches - elapsed);
    }
  }

  const totalDurationSeconds = (Date.now() - testStartTime) / 1000;
  console.log('\n\n================================================================');
  console.log('📊 LOAD TEST EXECUTION RESULTS');
  console.log('================================================================');

  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);
  const latencies = results.map((r) => r.duration).sort((a, b) => a - b);

  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const avgLatency = Math.round(latencies.reduce((sum, l) => sum + l, 0) / (latencies.length || 1));
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const actualRPS = (TOTAL_REQUESTS / totalDurationSeconds).toFixed(1);

  console.log(`• Total Requests Sent:    ${TOTAL_REQUESTS}`);
  console.log(`• Successful (201 Created):${successes.length} (${((successes.length / TOTAL_REQUESTS) * 100).toFixed(1)}%)`);
  console.log(`• Failed Requests:         ${failures.length}`);
  console.log(`• Total Elapsed Time:      ${totalDurationSeconds.toFixed(2)} seconds`);
  console.log(`• Effective Throughput:    ${actualRPS} requests / second\n`);

  console.log('⏱️ Response Latency Metrics:');
  console.log(`  - Minimum:    ${minLatency} ms`);
  console.log(`  - Average:    ${avgLatency} ms`);
  console.log(`  - Median p50: ${p50} ms`);
  console.log(`  - 95th %ile:  ${p95} ms`);
  console.log(`  - Maximum:    ${maxLatency} ms\n`);

  if (failures.length > 0) {
    console.error('⚠️ First failure details:', failures[0].error || failures[0].body);
  }

  // Group Distribution Analysis
  console.log('⚖️ Group Allocation Distribution (10 Groups):');
  const groupCounts = {};
  const groupGenders = {};

  successes.forEach((s) => {
    const p = s.body.data;
    if (p && p.assignedTeam) {
      groupCounts[p.assignedTeam] = (groupCounts[p.assignedTeam] || 0) + 1;
      if (!groupGenders[p.assignedTeam]) groupGenders[p.assignedTeam] = { Male: 0, Female: 0 };
      groupGenders[p.assignedTeam][p.gender] = (groupGenders[p.assignedTeam][p.gender] || 0) + 1;
    }
  });

  const sortedGroups = Object.keys(groupCounts).sort();
  sortedGroups.forEach((grp) => {
    const g = groupGenders[grp];
    console.log(`  ${grp.padEnd(10)}: ${String(groupCounts[grp]).padStart(2)} members (M: ${g.Male}, F: ${g.Female})`);
  });

  const counts = Object.values(groupCounts);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  console.log(`\n• Headcount Parity Spread: Min = ${minCount}, Max = ${maxCount} (Delta = ${maxCount - minCount})`);

  // Dorm Gender Segregation Verification
  let dormViolations = 0;
  successes.forEach((s) => {
    const p = s.body.data;
    if (p && p.staying && p.assignedRoom) {
      if (p.gender === 'Male' && p.assignedRoom.startsWith('Female')) dormViolations++;
      if (p.gender === 'Female' && p.assignedRoom.startsWith('Male')) dormViolations++;
    }
  });

  console.log(`• Gender Invariant Check:  ${dormViolations === 0 ? '✅ 100% PASS (Zero dorm cross-gender allocations)' : '❌ FAIL'}`);
  console.log('================================================================\n');
}

runLoadTest();

