const ExcelJS = require('exceljs');

const DEFAULT_HEADER_COLOR = 'FF0284C7'; // Sky 600

const COLUMNS_DEF = [
  { header: 'S. No.', key: 'serialNo', width: 10 },
  { header: 'Name', key: 'name', width: 26 },
  { header: 'Gender', key: 'gender', width: 12 },
  { header: 'Age', key: 'age', width: 8 },
  { header: 'Phone', key: 'phone', width: 16 },
  { header: 'College / School / Other', key: 'institution', width: 28 },
  { header: 'Church Name', key: 'church', width: 30 },
  { header: 'Church Location', key: 'churchLocation', width: 24 },
  { header: 'City / Location', key: 'location', width: 22 },
  { header: 'Accommodation', key: 'staying', width: 16 },
  { header: 'Assigned Team', key: 'assignedTeam', width: 30 },
  { header: 'Assigned Room', key: 'assignedRoom', width: 18 },
  { header: 'Payment Status', key: 'paymentStatus', width: 18 },
  { header: 'Amount Paid (₹)', key: 'amountPaid', width: 16 },
  { header: 'Total Fee (₹)', key: 'feeTotal', width: 14 },
  { header: 'Balance Due (₹)', key: 'balanceDue', width: 16 },
  { header: 'Payment Notes', key: 'paymentNotes', width: 22 },
  { header: 'First Timer', key: 'isFirstTimer', width: 12 },
  { header: 'General Notes', key: 'notes', width: 26 },
  { header: 'Checked In At', key: 'checkedInAt', width: 22 }
];

/**
 * Format and populate an Excel worksheet for participants
 */
function populateSheet(worksheet, participants, headerColor = DEFAULT_HEADER_COLOR) {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.columns = COLUMNS_DEF;

  // Header Styling
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerColor }
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF0369A1' } },
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Populate data rows
  participants.forEach((p, idx) => {
    const isStaying = p.staying !== false;
    const roomDisplay = p.assignedRoom || (isStaying ? 'Pending Room' : 'Day Scholar');
    const checkedInStr = p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';
    const firstTimerStr = p.isFirstTimer === true ? 'Yes' : 'No';

    const row = worksheet.addRow({
      serialNo: p.serialNo || idx + 101,
      name: p.name || '',
      gender: p.gender || '',
      age: p.age || '',
      phone: p.phone || '',
      institution: p.institution || '',
      church: p.church || '',
      churchLocation: p.churchLocation || '',
      location: p.location || '',
      staying: isStaying ? 'Staying' : 'Day Scholar',
      assignedTeam: p.assignedTeam || 'Unassigned',
      assignedRoom: roomDisplay,
      paymentStatus: p.paymentStatus || 'Waiting Payment',
      amountPaid: Number(p.amountPaid || 0),
      feeTotal: Number(p.feeTotal || 0),
      balanceDue: Number(p.balanceDue || 0),
      paymentNotes: p.paymentNotes || '',
      isFirstTimer: firstTimerStr,
      notes: p.notes || '',
      checkedInAt: checkedInStr
    });

    row.height = 20;
    const isEven = idx % 2 === 1;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };

      // Zebra striping
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Slate 50
        };
      }

      // Column specific alignment
      // 1: S.No, 3: Gender, 4: Age, 10: Staying, 18: First Timer -> center
      // 14, 15, 16: Currency -> right
      if ([1, 3, 4, 10, 18].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if ([14, 15, 16].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '₹#,##0';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Color highlight payment status
      if (colNumber === 13) {
        if (cell.value === 'Paid Cash' || cell.value === 'Paid Online') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } }; // Green 700
        } else if (cell.value === 'Waiting Payment') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } }; // Amber 700
        }
      }

      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Enable AutoFilter on header row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: participants.length + 1, column: COLUMNS_DEF.length }
  };
}

/**
 * Generate formatted Excel Workbook containing:
 * 1. Master Table of all participants
 * 2. Dedicated sheets for each assigned group / team
 * @param {Array} participants
 * @returns {ExcelJS.Workbook}
 */
async function generateParticipantsWorkbook(participants) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ICPF Camp Management System';
  workbook.created = new Date();

  // 1. Master Sheet
  const masterSheet = workbook.addWorksheet('Master Table');
  populateSheet(masterSheet, participants, 'FF0369A1'); // Deep Sky Blue

  // 2. Ordered Groupwise Sheets
  const standardTeamOrder = [
    'Masterpiece (Group 1)',
    'The Originals (OGs) (Group 2)',
    'Signature (Group 3)',
    'DNA (Group 4)',
    'Royal (Group 5)',
    'Aadhar (Group 6)',
    'The Icons (Group 7)',
    'Chosen One (Group 8)',
    'Leader'
  ];

  // Map participants by team
  const teamMap = new Map();
  for (const p of participants) {
    const team = p.assignedTeam || 'Unassigned';
    if (!teamMap.has(team)) {
      teamMap.set(team, []);
    }
    teamMap.get(team).push(p);
  }

  // Add sheets in priority order
  const processedTeams = new Set();
  for (const teamName of standardTeamOrder) {
    if (teamMap.has(teamName)) {
      const teamList = teamMap.get(teamName);
      // Excel sheet name max 31 characters and no forbidden chars
      const safeSheetName = teamName.slice(0, 31).replace(/[\\/?*:[\]]/g, '_');
      const ws = workbook.addWorksheet(safeSheetName);
      populateSheet(ws, teamList, 'FF0E7490'); // Cyan 700
      processedTeams.add(teamName);
    }
  }

  // Add any remaining teams not in standard order (e.g. Unassigned)
  for (const [teamName, teamList] of teamMap.entries()) {
    if (!processedTeams.has(teamName)) {
      const safeSheetName = teamName.slice(0, 31).replace(/[\\/?*:[\]]/g, '_');
      const ws = workbook.addWorksheet(safeSheetName);
      populateSheet(ws, teamList, 'FF475569'); // Slate 600
    }
  }

  return workbook;
}

/**
 * Parse an Excel buffer into array of candidate participant objects
 * Backward compatible with legacy 2025 spreadsheets ("Outsiders" sheet or first sheet)
 * @param {Buffer} buffer
 * @returns {Promise<Array>}
 */
async function parseParticipantsExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Find sheet: prefer "Outsiders", then "Participants", then first sheet
  let sheet = workbook.getWorksheet('Outsiders') ||
              workbook.getWorksheet('Participants') ||
              workbook.getWorksheet('Master Table') ||
              workbook.worksheets[0];

  if (!sheet) {
    throw new Error('No valid worksheet found in the uploaded Excel workbook.');
  }

  // Parse Header Row to find column index mapping
  const headerMap = {};
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const text = String(cell.value || '').trim().toLowerCase();
    if (text.includes('name')) headerMap.name = colNumber;
    else if (text === 'age') headerMap.age = colNumber;
    else if (text === 'gender' || text === 'sex') headerMap.gender = colNumber;
    else if (text.includes('college') || text.includes('school') || text.includes('institution')) headerMap.institution = colNumber;
    else if (text.includes('church name') || text === 'church') headerMap.church = colNumber;
    else if (text.includes('church location')) headerMap.churchLocation = colNumber;
    else if (text.includes('location') || text.includes('city') || text.includes('place')) headerMap.location = colNumber;
    else if (text.includes('staying') || text.includes('accommodation')) headerMap.staying = colNumber;
    else if (text.includes('phone') || text.includes('contact') || text.includes('mobile')) headerMap.phone = colNumber;
    else if (text.includes('team') || text.includes('group')) headerMap.assignedTeam = colNumber;
    else if (text.includes('room')) headerMap.assignedRoom = colNumber;
    else if (text.includes('payment') || text.includes('fee')) headerMap.paymentStatus = colNumber;
    else if (text.includes('note')) headerMap.notes = colNumber;
  });

  if (!headerMap.name) {
    throw new Error('Missing required "Name" column in Excel header.');
  }

  const results = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const rawName = row.getCell(headerMap.name).value;
    if (!rawName) return;

    const name = String(rawName).trim();
    if (!name) return;

    let age = 18;
    if (headerMap.age) {
      const rawAge = row.getCell(headerMap.age).value;
      const parsedAge = parseInt(rawAge, 10);
      if (!isNaN(parsedAge) && parsedAge > 0) age = parsedAge;
    }

    let gender = 'Male';
    if (headerMap.gender) {
      const rawGender = String(row.getCell(headerMap.gender).value || '').trim().toLowerCase();
      if (rawGender.startsWith('f') || rawGender === 'female' || rawGender === 'girl') {
        gender = 'Female';
      }
    }

    let staying = true;
    if (headerMap.staying) {
      const rawStaying = String(row.getCell(headerMap.staying).value || '').trim().toLowerCase();
      if (rawStaying === 'no' || rawStaying === 'false' || rawStaying === '0' || rawStaying === 'n' || rawStaying.includes('day scholar')) {
        staying = false;
      }
    }

    const institution = headerMap.institution ? String(row.getCell(headerMap.institution).value || '').trim() : '';
    const church = headerMap.church ? String(row.getCell(headerMap.church).value || '').trim() : '';
    const churchLocation = headerMap.churchLocation ? String(row.getCell(headerMap.churchLocation).value || '').trim() : '';
    const location = headerMap.location ? String(row.getCell(headerMap.location).value || '').trim() : '';
    const phone = headerMap.phone ? String(row.getCell(headerMap.phone).value || '').trim() : '';
    const assignedTeam = headerMap.assignedTeam ? String(row.getCell(headerMap.assignedTeam).value || '').trim() : '';
    const assignedRoom = headerMap.assignedRoom ? String(row.getCell(headerMap.assignedRoom).value || '').trim() : '';
    const notes = headerMap.notes ? String(row.getCell(headerMap.notes).value || '').trim() : '';

    results.push({
      name,
      age,
      gender,
      institution,
      church,
      churchLocation,
      location,
      staying,
      phone,
      assignedTeam,
      assignedRoom,
      notes
    });
  });

  return results;
}

module.exports = {
  generateParticipantsWorkbook,
  parseParticipantsExcel
};
