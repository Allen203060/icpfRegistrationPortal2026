/**
 * ============================================================================
 * ICPF Camp 2026 — Google Apps Script Integration
 * ============================================================================
 * Connects Google Forms / Google Sheets directly to the ICPF Registration Backend.
 * Automatically allocates Group Name (A-J), Dorm Room, and Badge Serial No on submit,
 * and writes the allocation details back into the Google Sheet in real-time!
 *
 * HOW TO SET UP:
 * 1. In your Google Sheet (linked to the Google Form), click:
 *    Extensions > Apps Script
 * 2. Delete any code in the editor, and paste this entire file (Code.gs).
 * 3. Update the BACKEND_URL variable below to your deployed backend or tunnel URL
 *    (e.g., https://icpf-camp.onrender.com or ngrok / Cloudflare tunnel URL).
 * 4. Click "Triggers" (Clock icon on left sidebar) > "+ Add Trigger":
 *    - Function: onFormSubmitTrigger
 *    - Event source: From spreadsheet
 *    - Event type: On form submit
 * 5. Save the trigger and authorize permissions when prompted!
 * ============================================================================
 */

// 🌐 CONFIGURE YOUR BACKEND URL HERE:
const BACKEND_URL = 'http://localhost:5000'; // Replace with your public URL, e.g. https://your-app.loca.lt or https://api.mycamp.org

/**
 * Custom Menu inside Google Sheets for easy manual operations
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('ICPF Camp Tools')
    .addItem('⚡ Sync Unprocessed Registrations', 'syncAllUnprocessedRows')
    .addItem('🏥 Check Backend API Health', 'checkBackendHealth')
    .addItem('📋 Prepare Output Columns (Group, Room, Badge)', 'prepareOutputColumns')
    .addToUi();
}

/**
 * Form Submit Event Trigger: Runs instantaneously when a camper submits the Google Form!
 */
function onFormSubmitTrigger(e) {
  try {
    const sheet = e ? e.range.getSheet() : SpreadsheetApp.getActiveSheet();
    const row = e ? e.range.getRow() : sheet.getLastRow();

    processRow(sheet, row);
  } catch (err) {
    Logger.log('Error in onFormSubmitTrigger: ' + err.toString());
  }
}

/**
 * Reads a single row, maps fields, sends to backend, and writes allocation back.
 */
function processRow(sheet, rowNumber) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Helper to get value by case-insensitive column header keyword
  function getValueByHeader(keywords) {
    for (let col = 0; col < headers.length; col++) {
      const header = String(headers[col]).toLowerCase().trim();
      for (let k = 0; k < keywords.length; k++) {
        if (header.includes(keywords[k])) {
          return rowValues[col];
        }
      }
    }
    return '';
  }

  // Ensure output columns exist
  prepareOutputColumns(sheet);

  // Check if already allocated to prevent double submission
  const currentGroup = getValueByHeader(['assigned group', 'group name', 'team']);
  if (currentGroup && String(currentGroup).trim() !== '') {
    Logger.log('Row ' + rowNumber + ' already allocated: ' + currentGroup);
    return;
  }

  // Extract form inputs matching your live form (https://forms.gle/bsD3DK5KDs9Lswag9):
  // 1. Name
  // 2. Age
  // 3. Gender (Male / Female)
  // 4. Student/Professional (Student / Working)
  // 5. College/School/Others(Studying/Studied at)
  // 6. Whatsapp Mobile Number
  // 7. First Time Attending (Yes / No)
  // 8. Location
  // 9. Will you stay at night? (Yes / No)

  const name = String(getValueByHeader(['full name', 'name'])).trim();
  const ageRaw = getValueByHeader(['age']);
  const genderRaw = String(getValueByHeader(['gender', 'sex'])).toLowerCase().trim();
  const studentProf = String(getValueByHeader(['student/professional', 'professional', 'working'])).trim();
  const collegeSchool = String(getValueByHeader(['college/school', 'college', 'school', 'studying', 'church', 'parish'])).trim();
  const phone = String(getValueByHeader(['whatsapp', 'mobile', 'phone', 'contact'])).trim();
  const firstTime = String(getValueByHeader(['first time attending', 'first time'])).trim();
  const location = String(getValueByHeader(['location', 'city', 'place', 'town'])).trim();
  const stayingRaw = String(getValueByHeader(['stay at night', 'will you stay', 'staying', 'residential'])).toLowerCase().trim();

  if (!name) {
    Logger.log('Skipping row ' + rowNumber + ': No name found.');
    return;
  }

  const age = parseInt(ageRaw, 10) || 18;
  const gender = genderRaw.startsWith('f') ? 'Female' : 'Male';
  // Staying at night: "Yes" => true (residential dorm assigned), "No" => false (Day Scholar)
  const staying = stayingRaw.includes('yes') || stayingRaw.startsWith('y');
  
  // Assemble notes from form fields
  const noteParts = [];
  if (studentProf) noteParts.push(studentProf);
  if (firstTime) noteParts.push('First Timer: ' + firstTime);
  const notes = noteParts.join(' • ');

  // Standard camp fee preset: ₹500 residential, ₹400 day scholar
  const feeTotal = staying ? 500 : 400;
  const paymentStatus = 'Waiting Payment';
  const amountPaid = 0;

  // Payload for Node.js Backend API
  const payload = {
    name: name,
    age: age,
    gender: gender,
    church: collegeSchool || 'General', // Used by 4-tier diversity heuristic to disperse peers
    location: location || 'Local',
    staying: staying,
    phone: phone,
    notes: notes,
    paymentStatus: paymentStatus,
    feeTotal: feeTotal,
    amountPaid: amountPaid,
    balanceDue: feeTotal
  };

  Logger.log('Sending registration to backend for: ' + name);

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(BACKEND_URL + '/api/participants/register', options);
  const responseCode = response.getResponseCode();
  const responseBody = JSON.parse(response.getContentText());

  if (responseCode === 201 && responseBody.success) {
    const allocated = responseBody.data;
    Logger.log('✅ Allocated ' + name + ' -> Group: ' + allocated.assignedTeam + ', Room: ' + allocated.assignedRoom + ', Badge #' + allocated.serialNo);

    // Write back to sheet
    writeBackAllocation(sheet, rowNumber, {
      assignedGroup: allocated.assignedTeam,
      assignedRoom: allocated.assignedRoom || 'Day Scholar',
      serialNo: allocated.serialNo,
      status: 'ALLOCATED'
    });
  } else {
    Logger.log('❌ Backend allocation failed: ' + response.getContentText());
    writeBackAllocation(sheet, rowNumber, {
      assignedGroup: 'ERROR',
      assignedRoom: 'ERROR',
      serialNo: '',
      status: 'FAILED: ' + (responseBody.error?.message || responseCode)
    });
  }
}

/**
 * Creates output columns in the Google Sheet if not already present
 */
function prepareOutputColumns(sheet) {
  if (!sheet) sheet = SpreadsheetApp.getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const requiredHeaders = ['Assigned Group', 'Assigned Room', 'Badge Serial No', 'Allocation Status'];

  requiredHeaders.forEach(function (colName) {
    const exists = headers.some(function (h) {
      return String(h).toLowerCase().trim() === colName.toLowerCase().trim();
    });
    if (!exists) {
      const nextCol = sheet.getLastColumn() + 1;
      const cell = sheet.getRange(1, nextCol);
      cell.setValue(colName);
      cell.setFontWeight('bold');
      cell.setBackground('#0284c7');
      cell.setFontColor('#ffffff');
    }
  });
}

/**
 * Writes the assigned group and room back into the sheet row
 */
function writeBackAllocation(sheet, rowNumber, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  function setColumnValue(colTitle, val, bgColor) {
    for (let c = 0; c < headers.length; c++) {
      if (String(headers[c]).toLowerCase().trim() === colTitle.toLowerCase().trim()) {
        const cell = sheet.getRange(rowNumber, c + 1);
        cell.setValue(val);
        if (bgColor) cell.setBackground(bgColor);
        return;
      }
    }
  }

  setColumnValue('Assigned Group', data.assignedGroup, '#e0f2fe');
  setColumnValue('Assigned Room', data.assignedRoom, '#f0fdf4');
  setColumnValue('Badge Serial No', data.serialNo ? '#' + data.serialNo : '');
  setColumnValue('Allocation Status', data.status, data.status === 'ALLOCATED' ? '#dcfce7' : '#fee2e2');
}

/**
 * Batch manual sync: Loops through all rows and registers any that are not yet allocated
 */
function syncAllUnprocessedRows() {
  const sheet = SpreadsheetApp.getActiveSheet();
  prepareOutputColumns(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No submission rows found in this sheet.');
    return;
  }

  let count = 0;
  for (let r = 2; r <= lastRow; r++) {
    processRow(sheet, r);
    count++;
    Utilities.sleep(100); // 100ms throttle between calls
  }

  SpreadsheetApp.getUi().alert('Synced ' + count + ' rows with the ICPF Registration Backend!');
}

/**
 * Health Check test function
 */
function checkBackendHealth() {
  const ui = SpreadsheetApp.getUi();
  try {
    const res = UrlFetchApp.fetch(BACKEND_URL + '/api/health', { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      ui.alert('🟢 Backend is Healthy & Connected!\n\nResponse: ' + res.getContentText());
    } else {
      ui.alert('⚠️ Backend returned HTTP ' + res.getResponseCode() + ':\n' + res.getContentText());
    }
  } catch (err) {
    ui.alert('🔴 Connection Failed!\n\nMake sure your BACKEND_URL is publicly reachable.\nError: ' + err.message);
  }
}

