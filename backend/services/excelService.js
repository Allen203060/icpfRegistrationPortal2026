const ExcelJS = require('exceljs');

/**
 * Generate formatted Excel Workbook from participants array
 * @param {Array} participants
 * @returns {ExcelJS.Workbook}
 */
async function generateParticipantsWorkbook(participants) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ICPF Camp Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Participants', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  worksheet.columns = [
    { header: 'S. No.', key: 'serialNo', width: 10 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Age', key: 'age', width: 8 },
    { header: 'Gender', key: 'gender', width: 12 },
    { header: 'Church / Parish', key: 'church', width: 26 },
    { header: 'City / Location', key: 'location', width: 20 },
    { header: 'Staying', key: 'staying', width: 10 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Assigned Team', key: 'assignedTeam', width: 18 },
    { header: 'Assigned Room', key: 'assignedRoom', width: 18 },
    { header: 'Notes', key: 'notes', width: 24 },
    { header: 'Checked In At', key: 'checkedInAt', width: 22 }
  ];

  // Header Styling
  const headerRow = worksheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' } // Sky 600
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF0369A1' } }
    };
  });

  // Populate rows
  participants.forEach((p, idx) => {
    const row = worksheet.addRow({
      serialNo: p.serialNo || idx + 101,
      name: p.name,
      age: p.age,
      gender: p.gender,
      church: p.church || '',
      location: p.location || '',
      staying: p.staying !== false ? 'Yes' : 'No',
      phone: p.phone || '',
      assignedTeam: p.assignedTeam || 'Unassigned',
      assignedRoom: p.assignedRoom || (p.staying === false ? 'Day Scholar' : 'Pending'),
      notes: p.notes || '',
      checkedInAt: p.checkedInAt ? new Date(p.checkedInAt).toLocaleString() : ''
    });

    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 7 ? 'center' : 'left'
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

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
    else if (text.includes('church') || text.includes('parish')) headerMap.church = colNumber;
    else if (text.includes('location') || text.includes('city') || text.includes('place')) headerMap.location = colNumber;
    else if (text.includes('staying') || text.includes('stay')) headerMap.staying = colNumber;
    else if (text.includes('phone') || text.includes('contact') || text.includes('mobile')) headerMap.phone = colNumber;
    else if (text.includes('note')) headerMap.notes = colNumber;
  });

  if (!headerMap.name) {
    throw new Error('Missing required "Name" column in Excel header.');
  }

  const results = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const rawName = row.getCell(headerMap.name).value;
    if (!rawName) return; // Skip empty rows

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
      if (rawStaying === 'no' || rawStaying === 'false' || rawStaying === '0' || rawStaying === 'n') {
        staying = false;
      }
    }

    const church = headerMap.church ? String(row.getCell(headerMap.church).value || '').trim() : '';
    const location = headerMap.location ? String(row.getCell(headerMap.location).value || '').trim() : '';
    const phone = headerMap.phone ? String(row.getCell(headerMap.phone).value || '').trim() : '';
    const notes = headerMap.notes ? String(row.getCell(headerMap.notes).value || '').trim() : '';

    results.push({
      name,
      age,
      gender,
      church,
      location,
      staying,
      phone,
      notes
    });
  });

  return results;
}

module.exports = {
  generateParticipantsWorkbook,
  parseParticipantsExcel
};
