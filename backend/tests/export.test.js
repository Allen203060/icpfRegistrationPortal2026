const http = require('node:http');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { startServer, stopServer } = require('../server');
const { disconnectDB } = require('../config/db');
const { Participant, CampConfig } = require('../models');

console.log('====================================================');
console.log('🧪 Starting Module M4 Document & Export Verification Suite');
console.log('====================================================\n');

const TEST_PORT = 5097;
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

function requestBinary(method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path,
        method
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            buffer
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function uploadMultipart(path, fieldName, filename, fileBuffer) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';

    const header =
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${crlf}` +
      `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet${crlf}${crlf}`;
    const footer = `${crlf}--${boundary}--${crlf}`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(header, 'utf8'),
      fileBuffer,
      Buffer.from(footer, 'utf8')
    ]);

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

async function runExportTests() {
  await startServer(TEST_PORT);

  // Seed sample participants sequentially for exports
  await Participant.create({
    name: 'Export Test Camper 1',
    age: 20,
    gender: 'Male',
    church: 'Test Church A',
    location: 'Kottayam',
    staying: true,
    assignedTeam: 'Team Joshua',
    assignedRoom: 'Male Room 1',
    notes: 'EXPORT_TEST'
  });

  await Participant.create({
    name: 'Export Test Camper 2',
    age: 19,
    gender: 'Female',
    church: 'Test Church B',
    location: 'Trivandrum',
    staying: true,
    assignedTeam: 'Team Deborah',
    assignedRoom: 'Female Room 1',
    notes: 'EXPORT_TEST'
  });

  const tests = [
    test('GET /api/export/id-cards generates valid PDF with %PDF header', async () => {
      const res = await requestBinary('GET', '/api/export/id-cards');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /application\/pdf/);
      assert.ok(res.buffer.length > 500);

      // Verify PDF Magic Bytes (%PDF-)
      const magic = res.buffer.subarray(0, 4).toString('utf8');
      assert.equal(magic, '%PDF');
    }),

    test('GET /api/export/room-lists generates valid PDF attendance roster', async () => {
      const res = await requestBinary('GET', '/api/export/room-lists');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /application\/pdf/);
      assert.ok(res.buffer.length > 500);

      const magic = res.buffer.subarray(0, 4).toString('utf8');
      assert.equal(magic, '%PDF');
    }),

    test('GET /api/export/excel generates valid XLSX spreadsheet', async () => {
      const res = await requestBinary('GET', '/api/export/excel');
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /spreadsheetml/);
      assert.ok(res.buffer.length > 1000);

      // Verify ZIP/XLSX Magic Bytes (PK\x03\x04)
      assert.equal(res.buffer[0], 0x50); // 'P'
      assert.equal(res.buffer[1], 0x4b); // 'K'

      // Parse with ExcelJS to verify workbook structure
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.buffer);
      const sheet = wb.getWorksheet('Participants');
      assert.ok(sheet !== undefined);
      assert.ok(sheet.rowCount >= 2); // Header + at least 1 data row
    }),

    test('POST /api/export/import-excel parses and dynamically allocates participants', async () => {
      // Build an in-memory sample Excel file matching legacy format
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Outsiders');
      ws.addRow(['S. No.', 'Name', 'Age', 'Gender', 'Church', 'Location', 'Staying', 'Phone']);
      ws.addRow([1, 'Batch Imported Boy', 21, 'Male', 'IPC Bangalore', 'Karnataka', 'Yes', '9876543210']);
      ws.addRow([2, 'Batch Imported Girl', 19, 'Female', 'CSI Chennai', 'Tamil Nadu', 'No', '9876543211']);

      const buffer = await wb.xlsx.writeBuffer();

      const res = await uploadMultipart(
        '/api/export/import-excel',
        'file',
        'campers.xlsx',
        buffer
      );

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.count, 2);

      // Verify they exist in DB and received team allocations
      const boy = await Participant.findOne({ name: 'Batch Imported Boy' });
      assert.ok(boy !== null);
      assert.ok(boy.assignedTeam);
      assert.ok(boy.assignedRoom);
      assert.match(boy.assignedRoom, /Male Room/);

      const girl = await Participant.findOne({ name: 'Batch Imported Girl' });
      assert.ok(girl !== null);
      assert.ok(girl.assignedTeam);
      assert.equal(girl.assignedRoom, ''); // Staying = false -> Day scholar
    })
  ];

  for (const t of tests) {
    await t();
  }

  // Cleanup
  await Participant.deleteMany({ notes: { $in: ['EXPORT_TEST', ''] } });
  await stopServer();
  await disconnectDB();

  console.log('\n====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runExportTests().catch((err) => {
  console.error('Fatal export test error:', err);
  process.exit(1);
});
