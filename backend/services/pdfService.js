const PDFDocument = require('pdfkit');

// Physical card dimensions (85mm x 54mm, 6 cards per A4 page)
const MM_TO_PT = 2.834645669291339;
const CARD_WIDTH = 85 * MM_TO_PT;   // ~240.94 pt
const CARD_HEIGHT = 54 * MM_TO_PT;  // ~153.07 pt

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const MARGIN_X = 35;
const MARGIN_Y = 50;
const GAP_X = (A4_WIDTH - 2 * MARGIN_X - 2 * CARD_WIDTH);
const GAP_Y = 40;

/**
 * Abbreviate long names preserving first and last name in full
 * (Maintains parity with 2025 legacy script_cards.py)
 */
function abbreviateName(name, maxLength = 24) {
  if (!name || name.length <= maxLength) return name || '';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 2) {
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const middleInitials = parts.slice(1, -1).map((m) => `${m[0]}.`).join(' ');
    const candidate = `${firstName} ${middleInitials} ${lastName}`;
    return candidate.length <= maxLength ? candidate : candidate.slice(0, maxLength - 3) + '...';
  }
  return name.slice(0, maxLength - 3) + '...';
}

/**
 * Convert Hex Color to RGB components
 */
function hexToRgb(hex) {
  const clean = (hex || '#93C5FD').replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/**
 * Generate PDF containing 6 ID cards per A4 page
 * @param {Array} participants
 * @param {Map|Object} teamColorsMap - team name -> hex color string
 * @param {WritableStream} outputStream
 */
function generateIdCardsPdf(participants, teamColorsMap, outputStream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: true,
    info: {
      Title: 'ICPF Camp 2026 — ID Badges',
      Author: 'ICPF Camp Management System'
    }
  });

  doc.pipe(outputStream);

  const getTeamColor = (teamName) => {
    if (!teamName) return '#93C5FD';
    if (teamColorsMap instanceof Map) return teamColorsMap.get(teamName) || '#93C5FD';
    return teamColorsMap[teamName] || '#93C5FD';
  };

  const positions = [
    { x: MARGIN_X, y: MARGIN_Y },
    { x: MARGIN_X + CARD_WIDTH + GAP_X, y: MARGIN_Y },
    { x: MARGIN_X, y: MARGIN_Y + CARD_HEIGHT + GAP_Y },
    { x: MARGIN_X + CARD_WIDTH + GAP_X, y: MARGIN_Y + CARD_HEIGHT + GAP_Y },
    { x: MARGIN_X, y: MARGIN_Y + 2 * (CARD_HEIGHT + GAP_Y) },
    { x: MARGIN_X + CARD_WIDTH + GAP_X, y: MARGIN_Y + 2 * (CARD_HEIGHT + GAP_Y) }
  ];

  participants.forEach((participant, index) => {
    if (index > 0 && index % 6 === 0) {
      doc.addPage();
    }

    const pos = positions[index % 6];
    const hex = getTeamColor(participant.assignedTeam);
    const [r, g, b] = hexToRgb(hex);

    // Card Background with Rounded Border
    doc.save();
    doc.roundedRect(pos.x, pos.y, CARD_WIDTH, CARD_HEIGHT, 8)
      .fillColor([r, g, b])
      .fillOpacity(0.9)
      .fill();

    doc.roundedRect(pos.x, pos.y, CARD_WIDTH, CARD_HEIGHT, 8)
      .strokeColor('#18181b')
      .lineWidth(1)
      .stroke();
    doc.restore();

    // Top Header: "ICPF CAMP 2026 • ATTENDEE" & Serial Number Badge
    doc.fillColor('#18181b')
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .text('ICPF CAMP 2026 • ATTENDEE', pos.x + 10, pos.y + 10, { width: CARD_WIDTH - 60 });

    // Serial No Badge Box
    const badgeText = `#${participant.serialNo || 101}`;
    doc.roundedRect(pos.x + CARD_WIDTH - 42, pos.y + 8, 32, 14, 3)
      .fillColor('#ffffff')
      .fill();
    doc.fillColor('#18181b')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text(badgeText, pos.x + CARD_WIDTH - 42, pos.y + 11, { width: 32, align: 'center' });

    // Camper Name
    const displayName = abbreviateName(participant.name, 22);
    doc.fillColor('#09090b')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(displayName, pos.x + 10, pos.y + 32, { width: CARD_WIDTH - 20, align: 'center' });

    // Demographics Row: Assigned Team & Room
    const teamName = participant.assignedTeam || 'Unassigned';
    const roomName = participant.assignedRoom || (participant.staying === false ? 'Day Scholar' : 'Pending');

    // Inner White Info Box
    doc.roundedRect(pos.x + 10, pos.y + 54, CARD_WIDTH - 20, 52, 5)
      .fillColor('#ffffff')
      .fillOpacity(0.85)
      .fill();

    doc.fillColor('#71717a')
      .fontSize(7)
      .font('Helvetica-Bold')
      .text('ASSIGNED TEAM', pos.x + 16, pos.y + 60);

    doc.fillColor('#09090b')
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text(teamName, pos.x + 16, pos.y + 70, { width: (CARD_WIDTH - 40) / 2 });

    doc.fillColor('#71717a')
      .fontSize(7)
      .font('Helvetica-Bold')
      .text('ROOM ALLOCATION', pos.x + 16 + (CARD_WIDTH - 40) / 2, pos.y + 60);

    doc.fillColor('#09090b')
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text(roomName, pos.x + 16 + (CARD_WIDTH - 40) / 2, pos.y + 70, { width: (CARD_WIDTH - 40) / 2 });

    // Church or Location
    const churchOrLoc = participant.church || participant.location || 'General Camper';
    doc.fillColor('#52525b')
      .fontSize(8)
      .font('Helvetica')
      .text(`Church/City: ${churchOrLoc}`, pos.x + 16, pos.y + 90, { width: CARD_WIDTH - 32, lineBreak: false, ellipsis: true });

    // Footer Info: Gender & Age
    doc.fillColor('#27272a')
      .fontSize(7.5)
      .font('Helvetica')
      .text(`${participant.gender} • ${participant.age} years`, pos.x + 10, pos.y + CARD_HEIGHT - 16, { width: CARD_WIDTH - 20, align: 'center' });
  });

  doc.end();
}

/**
 * Generate PDF Room Attendance Rosters with Leader Signature block
 * (Parity with origin/Edwin/script_room_lists.py)
 * @param {Array} rooms - Array of room configuration objects
 * @param {Array} participants - Array of participant objects
 * @param {WritableStream} outputStream
 */
function generateRoomListsPdf(rooms, participants, outputStream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    autoFirstPage: false,
    info: {
      Title: 'ICPF Camp 2026 — Room Attendance Rosters',
      Author: 'ICPF Camp Management System'
    }
  });

  doc.pipe(outputStream);

  rooms.forEach((room) => {
    doc.addPage();

    const roomAttendees = participants.filter(
      (p) => p.staying !== false && p.assignedRoom?.toLowerCase() === room.name?.toLowerCase()
    );

    // Page Header
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#09090b')
      .text(room.name.toUpperCase(), { align: 'center' });

    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#52525b')
      .text(`Gender: ${room.gender} Block  •  Capacity: ${roomAttendees.length}/${room.capacity} Beds`, { align: 'center' });

    doc.moveDown(1.5);

    // Table Header
    const tableTop = doc.y;
    const colWidths = [45, 175, 150, 75, 70];
    const headers = ['S.No.', 'Attendee Name', 'Church / Location', 'Gender/Age', 'Staying'];

    doc.rect(40, tableTop, 515, 22)
      .fillColor('#e4e4e7')
      .fill();

    doc.fillColor('#18181b')
      .fontSize(9)
      .font('Helvetica-Bold');

    let curX = 45;
    headers.forEach((h, i) => {
      doc.text(h, curX, tableTop + 6, { width: colWidths[i] - 10, align: i === 0 ? 'center' : 'left' });
      curX += colWidths[i];
    });

    let rowY = tableTop + 22;

    if (roomAttendees.length === 0) {
      doc.rect(40, rowY, 515, 24).strokeColor('#e4e4e7').stroke();
      doc.fillColor('#71717a')
        .fontSize(9)
        .font('Helvetica-Oblique')
        .text('No campers currently assigned to this room.', 50, rowY + 7);
      rowY += 24;
    } else {
      roomAttendees.forEach((attendee, idx) => {
        // Alternate zebra rows
        if (idx % 2 === 1) {
          doc.rect(40, rowY, 515, 20).fillColor('#fafafa').fill();
        }
        doc.rect(40, rowY, 515, 20).strokeColor('#e4e4e7').stroke();

        doc.fillColor('#18181b')
          .fontSize(8.5)
          .font('Helvetica');

        let cellX = 45;
        doc.text(String(attendee.serialNo || idx + 1), cellX, rowY + 5, { width: colWidths[0] - 10, align: 'center' });
        cellX += colWidths[0];

        doc.font('Helvetica-Bold')
          .text(attendee.name, cellX, rowY + 5, { width: colWidths[1] - 10, ellipsis: true });
        cellX += colWidths[1];

        doc.font('Helvetica')
          .text(attendee.church || attendee.location || '—', cellX, rowY + 5, { width: colWidths[2] - 10, ellipsis: true });
        cellX += colWidths[2];

        doc.text(`${attendee.gender} (${attendee.age}y)`, cellX, rowY + 5, { width: colWidths[3] - 10 });
        cellX += colWidths[3];

        doc.text(attendee.staying !== false ? 'Yes' : 'No', cellX, rowY + 5, { width: colWidths[4] - 10 });

        rowY += 20;
      });
    }

    // Room Leader & Verification Block at Bottom
    const footerY = Math.max(rowY + 40, 720);
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#d4d4d8').stroke();

    doc.fillColor('#18181b')
      .fontSize(9.5)
      .font('Helvetica')
      .text('Room Leader Signature: ___________________________', 45, footerY + 18);

    doc.text('Date / Verified: ___________________________', 330, footerY + 18);
  });

  doc.end();
}

/**
 * Generate Executive Statistics and Analytics PDF Report
 * Streamed via /api/export/stats-pdf
 */
function generateStatsReportPdf(config, participants = [], outputStream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 36,
    autoFirstPage: true,
    info: {
      Title: 'ICPF Camp 2026 — Executive Statistics & Analytics Report',
      Author: 'ICPF Camp Management System'
    }
  });

  doc.pipe(outputStream);

  const total = participants.length;
  const males = participants.filter((p) => p.gender === 'Male').length;
  const females = participants.filter((p) => p.gender === 'Female').length;
  const staying = participants.filter((p) => p.staying !== false).length;
  const dayScholars = total - staying;

  const isFirstTimer = (p) =>
    p.isFirstTimer === true ||
    /first\s*timer?:\s*yes/i.test(p.notes || '') ||
    /first\s*time/i.test(p.notes || '');

  const firstTimers = participants.filter(isFirstTimer).length;
  const returning = total - firstTimers;
  const firstTimerPct = total > 0 ? Math.round((firstTimers / total) * 100) : 0;
  const returningPct = total > 0 ? 100 - firstTimerPct : 0;

  const validAges = participants
    .map((p) => Number(p.age))
    .filter((a) => Number.isFinite(a) && a > 0);
  const avgAge =
    validAges.length > 0
      ? (validAges.reduce((s, a) => s + a, 0) / validAges.length).toFixed(1)
      : '—';

  const totalExpected = participants.reduce((s, p) => s + Number(p.feeTotal || 0), 0);
  const totalCollected = participants.reduce((s, p) => s + Number(p.amountPaid || 0), 0);
  const totalDues = participants.reduce((s, p) => s + Number(p.balanceDue || 0), 0);
  const onlineCollected = participants
    .filter((p) => p.paymentStatus === 'Paid Online')
    .reduce((s, p) => s + Number(p.amountPaid || 0), 0);
  const cashCollected = participants
    .filter((p) => p.paymentStatus === 'Paid Cash')
    .reduce((s, p) => s + Number(p.amountPaid || 0), 0);
  const realizationRate =
    totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Header Banner
  doc.rect(36, 36, 523, 54).fillColor('#06141B').fill();
  doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold').text(
    'ICPF CAMP 2026 — REGISTRATION & ANALYTICS REPORT',
    50,
    47
  );
  doc.fillColor('#9BA8AB').fontSize(8.5).font('Helvetica').text(
    `Official Camp Summary • Generated: ${new Date().toLocaleString('en-IN')}`,
    50,
    66
  );

  // KPI Grid Cards (Row 1)
  let y = 102;
  const cardW = 122;
  const cardH = 48;
  const gap = 11;

  const kpis = [
    { label: 'TOTAL ATTENDEES', val: `${total}`, sub: `Avg ${avgAge} yrs` },
    { label: 'FIRST-TIME CAMPERS', val: `${firstTimers}`, sub: `${firstTimerPct}% of attendees` },
    { label: 'RETURNING CAMPERS', val: `${returning}`, sub: `${returningPct}% of attendees` },
    {
      label: 'GENDER PARITY',
      val: `${males}M : ${females}F`,
      sub: `${total > 0 ? Math.round((males / total) * 100) : 50}% Boys • ${
        total > 0 ? Math.round((females / total) * 100) : 50
      }% Girls`
    }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 36 + idx * (cardW + gap);
    doc.roundedRect(x, y, cardW, cardH, 6).fillColor('#F2F5F5').fill();
    doc.roundedRect(x, y, cardW, cardH, 6).strokeColor('#CCD0CF').lineWidth(0.5).stroke();
    doc.fillColor('#4A5C6A').fontSize(7).font('Helvetica-Bold').text(kpi.label, x + 8, y + 7);
    doc.fillColor('#06141B').fontSize(14).font('Helvetica-Bold').text(kpi.val, x + 8, y + 17);
    doc.fillColor('#4A5C6A').fontSize(7.5).font('Helvetica').text(kpi.sub, x + 8, y + 34);
  });

  // KPI Grid Cards (Row 2)
  y += cardH + 8;
  const kpis2 = [
    { label: 'RESIDENTIAL DORMS', val: `${staying} Beds`, sub: `${dayScholars} Day Scholars` },
    {
      label: 'FEE REALIZATION',
      val: `${realizationRate}%`,
      sub: `₹${totalCollected.toLocaleString('en-IN')} / ₹${totalExpected.toLocaleString('en-IN')}`
    },
    {
      label: 'ONLINE UPI STREAM',
      val: `₹${onlineCollected.toLocaleString('en-IN')}`,
      sub: `Cash: ₹${cashCollected.toLocaleString('en-IN')}`
    },
    {
      label: 'PENDING DUES',
      val: `₹${totalDues.toLocaleString('en-IN')}`,
      sub: `${participants.filter((p) => Number(p.balanceDue) > 0).length} campers with balance`
    }
  ];

  kpis2.forEach((kpi, idx) => {
    const x = 36 + idx * (cardW + gap);
    doc.roundedRect(x, y, cardW, cardH, 6).fillColor('#F2F5F5').fill();
    doc.roundedRect(x, y, cardW, cardH, 6).strokeColor('#CCD0CF').lineWidth(0.5).stroke();
    doc.fillColor('#4A5C6A').fontSize(7).font('Helvetica-Bold').text(kpi.label, x + 8, y + 7);
    doc.fillColor(idx === 3 && totalDues > 0 ? '#E11D48' : '#06141B').fontSize(14).font('Helvetica-Bold').text(kpi.val, x + 8, y + 17);
    doc.fillColor('#4A5C6A').fontSize(7.5).font('Helvetica').text(kpi.sub, x + 8, y + 34);
  });

  // Section: 8-Group Parity Table
  y += cardH + 16;
  doc.fillColor('#06141B').fontSize(10).font('Helvetica-Bold').text(
    '8-Group Dynamic Allocation & Balance Matrix',
    36,
    y
  );
  y += 14;

  // Table header
  doc.rect(36, y, 523, 17).fillColor('#253745').fill();
  doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
  doc.text('GROUP NAME', 44, y + 5, { width: 110 });
  doc.text('TOTAL', 160, y + 5, { width: 45, align: 'center' });
  doc.text('MALES', 215, y + 5, { width: 45, align: 'center' });
  doc.text('FEMALES', 270, y + 5, { width: 45, align: 'center' });
  doc.text('PARITY (|M-F|)', 325, y + 5, { width: 65, align: 'center' });
  doc.text('AVG AGE', 400, y + 5, { width: 50, align: 'center' });
  doc.text('FEES COLLECTED', 460, y + 5, { width: 90, align: 'right' });
  y += 17;

  const teams = config?.teams || [];
  teams.forEach((t, i) => {
    const tMembers = participants.filter(
      (p) => p.assignedTeam?.toLowerCase() === t.name?.toLowerCase()
    );
    const tMales = tMembers.filter((p) => p.gender === 'Male').length;
    const tFemales = tMembers.filter((p) => p.gender === 'Female').length;
    const parityDiff = Math.abs(tMales - tFemales);
    const tAges = tMembers
      .map((p) => Number(p.age))
      .filter((a) => Number.isFinite(a) && a > 0);
    const tAvg =
      tAges.length > 0
        ? (tAges.reduce((s, a) => s + a, 0) / tAges.length).toFixed(1)
        : '—';
    const tPaid = tMembers.reduce((s, p) => s + Number(p.amountPaid || 0), 0);

    const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFA';
    doc.rect(36, y, 523, 15).fillColor(bg).fill();

    doc.fillColor('#06141B').fontSize(7.5).font('Helvetica-Bold').text(t.name, 44, y + 4);
    doc.font('Helvetica').text(`${tMembers.length}`, 160, y + 4, { width: 45, align: 'center' });
    doc.text(`${tMales}`, 215, y + 4, { width: 45, align: 'center' });
    doc.text(`${tFemales}`, 270, y + 4, { width: 45, align: 'center' });
    doc.text(`±${parityDiff}`, 325, y + 4, { width: 65, align: 'center' });
    doc.text(`${tAvg}y`, 400, y + 4, { width: 50, align: 'center' });
    doc.text(`₹${tPaid.toLocaleString('en-IN')}`, 460, y + 4, { width: 90, align: 'right' });
    y += 15;
  });

  // Section: Demographics & Room Breakdown (Two Columns)
  y += 14;
  const colW = 254;

  // Left column: Age Brackets
  doc.fillColor('#06141B').fontSize(10).font('Helvetica-Bold').text(
    'Age Bracket Demographics',
    36,
    y
  );
  // Right column: Dorm Quotas
  doc.fillColor('#06141B').fontSize(10).font('Helvetica-Bold').text(
    'Residential Dorm Quotas',
    36 + colW + 15,
    y
  );
  y += 14;

  const ageBrackets = [
    { label: 'Teens (13-17 yrs)', count: validAges.filter((a) => a <= 17).length, isCount: true },
    { label: 'Youth (18-21 yrs)', count: validAges.filter((a) => a >= 18 && a <= 21).length, isCount: true },
    { label: 'Seniors (22-25 yrs)', count: validAges.filter((a) => a >= 22 && a <= 25).length, isCount: true },
    { label: 'Leaders (26+ yrs)', count: validAges.filter((a) => a >= 26).length, isCount: true },
    { label: 'First-Timers vs Returning', count: `${firstTimers} New • ${returning} Ret`, isCount: false }
  ];

  const leftYStart = y;
  ageBrackets.forEach((b, idx) => {
    const rowTop = leftYStart + idx * 16;
    doc.rect(36, rowTop, colW, 14).fillColor(idx % 2 === 0 ? '#FFFFFF' : '#F8FAFA').fill();
    doc.fillColor('#06141B').fontSize(7.5).font('Helvetica').text(b.label, 42, rowTop + 3.5);
    if (b.isCount) {
      const pct = validAges.length > 0 ? Math.round((b.count / validAges.length) * 100) : 0;
      doc.font('Helvetica-Bold').text(`${b.count} (${pct}%)`, 36 + colW - 75, rowTop + 3.5, {
        width: 70,
        align: 'right'
      });
    } else {
      doc.font('Helvetica-Bold').text(b.count, 36 + colW - 95, rowTop + 3.5, {
        width: 90,
        align: 'right'
      });
    }
  });

  // Right column: Rooms & Staying vs Day Scholars by Gender
  const rooms = config?.rooms || [];
  const maleRooms = rooms.filter((r) => r.gender === 'Male');
  const femaleRooms = rooms.filter((r) => r.gender === 'Female');
  const maleCap = maleRooms.reduce((s, r) => s + Number(r.capacity || 0), 0);
  const femaleCap = femaleRooms.reduce((s, r) => s + Number(r.capacity || 0), 0);
  const maleStaying = participants.filter((p) => p.staying !== false && p.gender === 'Male').length;
  const femaleStaying = participants.filter((p) => p.staying !== false && p.gender === 'Female').length;
  const maleDay = participants.filter((p) => p.staying === false && p.gender === 'Male').length;
  const femaleDay = participants.filter((p) => p.staying === false && p.gender === 'Female').length;

  const roomStats = [
    {
      label: `Male Dorms (${maleRooms.length} rooms)`,
      occ: `${maleStaying} / ${maleCap} beds`,
      pct: maleCap > 0 ? Math.round((maleStaying / maleCap) * 100) : 0
    },
    {
      label: `Female Dorms (${femaleRooms.length} rooms)`,
      occ: `${femaleStaying} / ${femaleCap} beds`,
      pct: femaleCap > 0 ? Math.round((femaleStaying / femaleCap) * 100) : 0
    },
    {
      label: 'Boys Lodging (Staying vs Day)',
      occ: `${maleStaying} Stay • ${maleDay} Day`,
      pct: males > 0 ? Math.round((maleStaying / males) * 100) : 0
    },
    {
      label: 'Girls Lodging (Staying vs Day)',
      occ: `${femaleStaying} Stay • ${femaleDay} Day`,
      pct: females > 0 ? Math.round((femaleStaying / females) * 100) : 0
    },
    {
      label: 'Total Lodging Capacity Utilization',
      occ: `${staying} / ${maleCap + femaleCap} beds`,
      pct: maleCap + femaleCap > 0 ? Math.round((staying / (maleCap + femaleCap)) * 100) : 0
    }
  ];

  roomStats.forEach((r, idx) => {
    const rowTop = leftYStart + idx * 16;
    const rx = 36 + colW + 15;
    doc.rect(rx, rowTop, colW, 14).fillColor(idx % 2 === 0 ? '#FFFFFF' : '#F8FAFA').fill();
    doc.fillColor('#06141B').fontSize(7.5).font('Helvetica').text(r.label, rx + 6, rowTop + 3.5);
    doc.font('Helvetica-Bold').text(`${r.occ} (${r.pct}%)`, rx + colW - 105, rowTop + 3.5, {
      width: 100,
      align: 'right'
    });
  });

  // Footer Signature Block
  const footerY = 765;
  doc.moveTo(36, footerY).lineTo(559, footerY).strokeColor('#CCD0CF').lineWidth(0.5).stroke();
  doc.fillColor('#4A5C6A').fontSize(7.5).font('Helvetica').text(
    'Report Verified By: ___________________________',
    42,
    footerY + 12
  );
  doc.text('Camp Director Signature: ___________________________', 240, footerY + 12);
  doc.text('Date: ________________', 470, footerY + 12);

  doc.end();
}

module.exports = {
  generateIdCardsPdf,
  generateRoomListsPdf,
  generateStatsReportPdf,
  abbreviateName
};
