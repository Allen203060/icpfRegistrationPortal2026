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

module.exports = {
  generateIdCardsPdf,
  generateRoomListsPdf,
  abbreviateName
};
