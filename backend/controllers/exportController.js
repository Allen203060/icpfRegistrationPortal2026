const { Participant, CampConfig } = require('../models');
const { generateIdCardsPdf, generateRoomListsPdf } = require('../services/pdfService');
const { generateParticipantsWorkbook, parseParticipantsExcel } = require('../services/excelService');
const { allocateParticipant } = require('../services/allocatorService');
const { createHttpError } = require('../middleware/validateRequest');

/**
 * GET /api/export/id-cards
 * Stream 6-cards-per-A4 PDF ID cards
 */
async function exportIdCards(req, res, next) {
  try {
    const filter = {};
    if (req.query.team) filter.assignedTeam = req.query.team;
    if (req.query.gender) filter.gender = req.query.gender;

    const [participants, config] = await Promise.all([
      Participant.find(filter).sort({ assignedTeam: 1, serialNo: 1 }).lean(),
      CampConfig.getActiveConfig()
    ]);

    if (participants.length === 0) {
      throw createHttpError('No participants found matching export criteria.', 'NO_PARTICIPANTS', 404);
    }

    const teamColorsMap = new Map(
      (config.teams || []).map((t) => [t.name, t.themeColor || '#93C5FD'])
    );

    const filename = req.query.team
      ? `icpf_badges_${req.query.team.replace(/\s+/g, '_')}.pdf`
      : 'icpf_camp_2026_badges.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    generateIdCardsPdf(participants, teamColorsMap, res);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/export/room-lists
 * Stream PDF room attendance rosters with leader signature lines
 */
async function exportRoomLists(req, res, next) {
  try {
    const [config, participants] = await Promise.all([
      CampConfig.getActiveConfig(),
      Participant.find({ staying: true }).sort({ assignedRoom: 1, serialNo: 1 }).lean()
    ]);

    const rooms = config.rooms || [];
    if (rooms.length === 0) {
      throw createHttpError('No rooms configured in active camp config.', 'NO_ROOMS_CONFIGURED', 404);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="icpf_camp_2026_room_rosters.pdf"');

    generateRoomListsPdf(rooms, participants, res);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/export/excel
 * Download complete participant roster as formatted .xlsx
 */
async function exportExcel(req, res, next) {
  try {
    const participants = await Participant.find().sort({ serialNo: 1 }).lean();
    const workbook = await generateParticipantsWorkbook(participants);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="icpf_camp_2026_roster.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/export/import-excel
 * Batch import participants from an Excel spreadsheet
 */
async function importExcel(req, res, next) {
  try {
    const fileBuffer = req.file?.buffer || req.body;
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw createHttpError('Please provide a valid Excel file buffer.', 'INVALID_FILE', 400);
    }

    const candidates = await parseParticipantsExcel(fileBuffer);
    if (candidates.length === 0) {
      throw createHttpError('No participant rows found in uploaded Excel.', 'EMPTY_EXCEL', 400);
    }

    const config = await CampConfig.getActiveConfig();
    const existing = await Participant.find({}, {
      name: 1, age: 1, gender: 1, church: 1, location: 1, staying: 1, assignedTeam: 1, assignedRoom: 1
    }).lean();

    const teams = config.teams.map((t) => ({
      ...t.toObject ? t.toObject() : t,
      members: existing.filter((p) => p.assignedTeam === t.name)
    }));

    const rooms = config.rooms.map((r) => ({
      ...r.toObject ? r.toObject() : r,
      occupiedCount: existing.filter((p) => p.staying && p.assignedRoom === r.name).length
    }));

    const createdList = [];

    for (const candidate of candidates) {
      // Allocate team and room dynamically
      const allocation = allocateParticipant(candidate, teams, rooms);

      // Add to tracking state for next candidate
      const teamObj = teams.find((t) => t.name === allocation.assignedTeam);
      if (teamObj) {
        teamObj.members = teamObj.members || [];
        teamObj.members.push({ ...candidate, assignedTeam: allocation.assignedTeam });
      }

      if (candidate.staying && allocation.assignedRoom) {
        const roomObj = rooms.find((r) => r.name === allocation.assignedRoom);
        if (roomObj) roomObj.occupiedCount = (roomObj.occupiedCount || 0) + 1;
      }

      const participantDoc = await Participant.create({
        ...candidate,
        ...allocation
      });
      createdList.push(participantDoc);
    }

    res.status(201).json({
      success: true,
      count: createdList.length,
      message: `Successfully allocated and imported ${createdList.length} participants.`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  exportIdCards,
  exportRoomLists,
  exportExcel,
  importExcel
};
