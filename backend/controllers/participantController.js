const mongoose = require('mongoose');
const { CampConfig, Participant } = require('../models');
const { allocateParticipant } = require('../services/allocatorService');
const { createHttpError } = require('../middleware/validateRequest');

const participantFields = [
  'name',
  'age',
  'gender',
  'church',
  'location',
  'staying',
  'phone',
  'assignedTeam',
  'assignedRoom',
  'notes',
  'paymentStatus',
  'amountPaid',
  'feeTotal',
  'balanceDue',
  'balanceToReturn',
  'paymentNotes',
  'registeredBy',
  'groupRegistrationId'
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMongoError(error) {
  return error;
}

function isPaymentComplete(status, balanceDue, feeTotal, amountPaid) {
  if (status === 'Paid Online' || status === 'Paid Cash' || status === 'Exempt') {
    return true;
  }
  if (status === 'Waiting Payment' || status === 'Partial / Balance Due') {
    return false;
  }
  if (typeof balanceDue === 'number' && balanceDue <= 0 && Number(amountPaid) >= Number(feeTotal) && Number(amountPaid) > 0) {
    return true;
  }
  return false;
}

/**
 * ICPF Camp 2026 Fee Schedule:
 * - Students (13–24 yrs): ₹400
 * - Seniors (25+ yrs): ₹500
 */
function getRegistrationFeeByAge(age) {
  const num = Number(age);
  if (!num || isNaN(num)) return 400; // default student rate
  return num >= 25 ? 500 : 400;
}

async function allocateIfEligible(participant, config, session = null) {
  // If already allocated a team, do not reallocate
  if (participant.assignedTeam && participant.assignedTeam.trim()) {
    return participant;
  }

  // Check if payment is complete
  const paymentComplete = isPaymentComplete(
    participant.paymentStatus,
    participant.balanceDue,
    participant.feeTotal,
    participant.amountPaid
  );

  if (!paymentComplete) {
    return participant;
  }

  // Load existing participants to build live team and room stats
  const existingQuery = Participant.find(
    { _id: { $ne: participant._id } },
    { name: 1, age: 1, gender: 1, church: 1, location: 1, staying: 1, assignedTeam: 1, assignedRoom: 1 }
  );
  if (session) existingQuery.session(session);
  const existing = await existingQuery.lean();

  const teams = config.teams.map((team) => ({
    ...(team.toObject ? team.toObject() : team),
    members: existing.filter((p) => p.assignedTeam === team.name)
  }));
  const rooms = config.rooms.map((room) => ({
    ...(room.toObject ? room.toObject() : room),
    occupiedCount: existing.filter((p) => p.staying && p.assignedRoom === room.name).length
  }));

  const lastParticipant = existing.filter((p) => p.assignedTeam).pop();
  const lastAssignedTeam = lastParticipant ? lastParticipant.assignedTeam : null;

  const candidate = participant.toObject ? participant.toObject() : participant;
  const allocation = allocateParticipant(candidate, teams, rooms, {
    lastAssignedTeam
  });

  participant.assignedTeam = allocation.assignedTeam;
  participant.assignedRoom = allocation.assignedRoom;
  return participant;
}

async function withOptionalTransaction(fn) {
  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (error) {
    if (/Transaction numbers are only allowed|replica set/i.test(error.message || '')) {
      // Standalone MongoDB without replica sets: fallback to non-transactional execution
      return await fn(null);
    }
    throw error;
  } finally {
    if (session) await session.endSession();
  }
}

async function registerParticipant(req, res, next) {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const createdParticipant = await withOptionalTransaction(async (session) => {
        const configQuery = CampConfig.findOne({ active: true });
        if (session) configQuery.session(session);
        const config = await configQuery;
        if (!config) {
          throw createHttpError('No active camp configuration exists.', 'ACTIVE_CONFIG_NOT_FOUND', 503);
        }

        // Serialize concurrent registrations when session is active
        if (session) {
          await CampConfig.updateOne({ _id: config._id }, { $inc: { __v: 1 } }, { session });
        }

        const existingQuery = Participant.find({}, {
          name: 1,
          age: 1,
          gender: 1,
          church: 1,
          location: 1,
          staying: 1,
          assignedTeam: 1,
          assignedRoom: 1
        });
        if (session) existingQuery.session(session);
        const existing = await existingQuery.lean();

        const teams = config.teams.map((team) => ({
          ...team.toObject(),
          members: existing.filter((participant) => participant.assignedTeam === team.name)
        }));
        const rooms = config.rooms.map((room) => ({
          ...room.toObject(),
          occupiedCount: existing.filter((participant) =>
            participant.staying && participant.assignedRoom === room.name
          ).length
        }));

        const lastParticipant = existing.length > 0 ? existing[existing.length - 1] : null;
        const lastAssignedTeam = lastParticipant ? lastParticipant.assignedTeam : null;

        const ageNum = Number(req.body.age);
        const defaultFee = getRegistrationFeeByAge(ageNum);
        const feeTotal = (req.body.feeTotal !== undefined && req.body.feeTotal !== null && req.body.feeTotal !== '')
          ? Number(req.body.feeTotal)
          : defaultFee;
        const paymentStatus = req.body.paymentStatus || 'Waiting Payment';
        let amountPaid = Number(req.body.amountPaid || 0);
        if ((paymentStatus === 'Paid Online' || paymentStatus === 'Paid Cash') && req.body.amountPaid === undefined) {
          amountPaid = feeTotal;
        }
        const balanceDue = req.body.balanceDue !== undefined ? Number(req.body.balanceDue) : Math.max(0, feeTotal - amountPaid);
        const balanceToReturn = req.body.balanceToReturn !== undefined ? Number(req.body.balanceToReturn) : Math.max(0, amountPaid - feeTotal);

        const participantData = {
          name: req.body.name.trim(),
          age: ageNum,
          gender: req.body.gender,
          church: req.body.church || '',
          location: req.body.location || '',
          staying: req.body.staying !== false,
          phone: req.body.phone || '',
          notes: req.body.notes || '',
          paymentStatus,
          amountPaid,
          feeTotal,
          balanceDue,
          balanceToReturn,
          paymentNotes: req.body.paymentNotes || '',
          registeredBy: req.body.registeredBy || '',
          groupRegistrationId: req.body.groupRegistrationId || ''
        };

        // Immediately allocate team and room irrespective of payment status upon registration
        const allocation = allocateParticipant(participantData, teams, rooms, {
          lastAssignedTeam,
          requestedTeam: req.body.requestedTeam || req.body.assignedTeam,
          allowOverflow: true
        });

        const [participant] = await Participant.create([{
          ...participantData,
          ...allocation
        }], session ? { session } : {});

        return participant;
      });

      return res.status(201).json({ success: true, data: createdParticipant });
    } catch (error) {
      if ((error.code === 11000 || error.message?.includes('duplicate key')) && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 15 * (attempt + 1)));
        continue;
      }
      return next(getMongoError(error));
    }
  }
}

/**
 * Batch register multiple attendees under a parent or pastor.
 * Supports keeping them in one team if requested, or dispersing fairly.
 */
async function registerGroup(req, res, next) {
  try {
    const {
      registeredBy = '',
      phone = '',
      church = '',
      location = '',
      keepTogether = false,
      paymentStatus = 'Waiting Payment',
      amountPaid = 0,
      feeTotal = 0,
      balanceDue = 0,
      balanceToReturn = 0,
      paymentNotes = '',
      members = []
    } = req.body;

    if (!Array.isArray(members) || members.length === 0) {
      throw createHttpError('At least one member is required for group registration.', 'INVALID_GROUP_MEMBERS', 400);
    }

    const createdMembers = await withOptionalTransaction(async (session) => {
      const configQuery = CampConfig.findOne({ active: true });
      if (session) configQuery.session(session);
      const config = await configQuery;
      if (!config) {
        throw createHttpError('No active camp configuration exists.', 'ACTIVE_CONFIG_NOT_FOUND', 503);
      }

      if (session) {
        await CampConfig.updateOne({ _id: config._id }, { $inc: { __v: 1 } }, { session });
      }

      const existingQuery = Participant.find({}, {
        name: 1, age: 1, gender: 1, church: 1, location: 1, staying: 1, assignedTeam: 1, assignedRoom: 1
      });
      if (session) existingQuery.session(session);
      const existing = await existingQuery.lean();

      const teams = config.teams.map((t) => ({
        ...t.toObject(),
        members: existing.filter((p) => p.assignedTeam === t.name)
      }));
      const rooms = config.rooms.map((r) => ({
        ...r.toObject(),
        occupiedCount: existing.filter((p) => p.staying && p.assignedRoom === r.name).length
      }));

      const groupRegistrationId = `GRP_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const savedList = [];
      let groupCommonTeam = null;
      let lastTeam = existing.length > 0 ? existing[existing.length - 1].assignedTeam : null;

      const calculatedGroupFee = feeTotal > 0 ? feeTotal : members.reduce((sum, mem) => sum + getRegistrationFeeByAge(mem.age), 0);

      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        if (!m.name || !m.name.trim()) {
          throw createHttpError(`Member #${i + 1} is missing a name.`, 'INVALID_NAME', 400);
        }
        const age = Number(m.age);
        if (!Number.isInteger(age) || age < 1) {
          throw createHttpError(`Member "${m.name}" has an invalid age.`, 'INVALID_AGE', 400);
        }

        const memberFee = Number(m.feeTotal ?? getRegistrationFeeByAge(age));

        const participantData = {
          name: m.name.trim(),
          age,
          gender: m.gender === 'Female' ? 'Female' : 'Male',
          church: m.church || church || '',
          location: m.location || location || '',
          staying: m.staying !== false,
          phone: m.phone || phone || '',
          notes: m.notes || '',
          registeredBy: registeredBy || '',
          groupRegistrationId,
          paymentStatus: m.paymentStatus || paymentStatus,
          amountPaid: Number(m.amountPaid ?? (i === 0 ? amountPaid : 0)),
          feeTotal: Number(m.feeTotal ?? (i === 0 ? calculatedGroupFee : memberFee)),
          balanceDue: Number(m.balanceDue ?? (i === 0 ? balanceDue : 0)),
          balanceToReturn: Number(m.balanceToReturn ?? (i === 0 ? balanceToReturn : 0)),
          paymentNotes: m.paymentNotes || (i === 0 ? paymentNotes : '')
        };

        const allocOptions = {
          requestedTeam: keepTogether ? groupCommonTeam : null,
          lastAssignedTeam: lastTeam,
          allowOverflow: true
        };

        const allocation = allocateParticipant(participantData, teams, rooms, allocOptions);
        if (keepTogether && !groupCommonTeam) {
          groupCommonTeam = allocation.assignedTeam;
        }
        lastTeam = allocation.assignedTeam;

        // Mutate local state for subsequent member allocations in same batch
        const tObj = teams.find((t) => t.name === allocation.assignedTeam);
        if (tObj) tObj.members.push({ ...participantData, ...allocation });

        if (allocation.assignedRoom) {
          const rObj = rooms.find((r) => r.name === allocation.assignedRoom);
          if (rObj) rObj.occupiedCount = (rObj.occupiedCount || 0) + 1;
        }

        const [created] = await Participant.create([{
          ...participantData,
          ...allocation
        }], session ? { session } : {});

        savedList.push(created);
      }

      return savedList;
    });

    res.status(201).json({
      success: true,
      count: createdMembers.length,
      data: createdMembers
    });
  } catch (error) {
    next(getMongoError(error));
  }
}

/**
 * Quick inline notes & payment status update
 */
async function updateParticipantNotes(req, res, next) {
  try {
    const { notes, paymentNotes, paymentStatus, amountPaid, balanceDue, balanceToReturn } = req.body;
    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      throw createHttpError('Participant was not found.', 'PARTICIPANT_NOT_FOUND', 404);
    }

    if (notes !== undefined) participant.notes = notes;
    if (paymentNotes !== undefined) participant.paymentNotes = paymentNotes;
    if (paymentStatus !== undefined) participant.paymentStatus = paymentStatus;
    if (amountPaid !== undefined) participant.amountPaid = Number(amountPaid);
    if (balanceDue !== undefined) participant.balanceDue = Number(balanceDue);
    if (balanceToReturn !== undefined) participant.balanceToReturn = Number(balanceToReturn);

    // If currently unallocated, trigger allocation if payment is now complete
    if (!participant.assignedTeam) {
      const config = await CampConfig.findOne({ active: true });
      if (config) {
        await allocateIfEligible(participant, config);
      }
    }

    await participant.save();
    res.status(200).json({ success: true, data: participant });
  } catch (error) {
    next(getMongoError(error));
  }
}

async function listParticipants(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = req.query.limit !== undefined
      ? Math.min(2500, Math.max(1, Number.parseInt(req.query.limit, 10) || 25))
      : 2500; // Default to full camp roster (up to 2,500 attendees) so stats & lookups are complete
    const filter = {};

    if (req.query.team) filter.assignedTeam = req.query.team;
    if (req.query.gender) filter.gender = req.query.gender;
    if (req.query.search) {
      const pattern = new RegExp(escapeRegExp(String(req.query.search).trim()), 'i');
      filter.$or = [
        { name: pattern },
        { church: pattern },
        { location: pattern },
        { phone: pattern }
      ];
    }

    const [data, total] = await Promise.all([
      Participant.find(filter)
        .sort({ serialNo: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Participant.countDocuments(filter)
    ]);

    res.json({ success: true, count: data.length, total, page, limit, data });
  } catch (error) {
    next(error);
  }
}

async function getParticipant(req, res, next) {
  try {
    const participant = await Participant.findById(req.params.id).lean();
    if (!participant) throw createHttpError('Participant was not found.', 'PARTICIPANT_NOT_FOUND', 404);
    res.json({ success: true, data: participant });
  } catch (error) {
    next(error);
  }
}

async function updateParticipant(req, res, next) {
  try {
    const updates = Object.fromEntries(
      participantFields
        .filter((field) => Object.hasOwn(req.body || {}, field))
        .map((field) => [field, req.body[field]])
    );
    if (Object.keys(updates).length === 0) {
      throw createHttpError('No supported participant fields were provided.', 'NO_UPDATES');
    }
    if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim())) {
      throw createHttpError('Participant name cannot be empty.', 'INVALID_NAME');
    }
    if (updates.age !== undefined && (!Number.isInteger(Number(updates.age)) || Number(updates.age) < 1)) {
      throw createHttpError('Participant age must be a positive integer.', 'INVALID_AGE');
    }
    if (updates.gender !== undefined && !['Male', 'Female'].includes(updates.gender)) {
      throw createHttpError('Gender must be Male or Female.', 'INVALID_GENDER');
    }
    if (updates.staying !== undefined && typeof updates.staying !== 'boolean') {
      throw createHttpError('Staying must be a boolean.', 'INVALID_STAYING');
    }

    const updatedParticipant = await withOptionalTransaction(async (session) => {
      const q = Participant.findById(req.params.id);
      if (session) q.session(session);
      const participant = await q;
      if (!participant) throw createHttpError('Participant was not found.', 'PARTICIPANT_NOT_FOUND', 404);

      const cfgQuery = CampConfig.findOne({ active: true });
      if (session) cfgQuery.session(session);
      const config = await cfgQuery;
      if (!config) throw createHttpError('No active camp configuration exists.', 'ACTIVE_CONFIG_NOT_FOUND', 503);

      // Serialize manual overrides with registration so capacity checks cannot race.
      if (session) {
        await CampConfig.updateOne({ _id: config._id }, { $inc: { __v: 1 } }, { session });
      }

      const nextGender = updates.gender || participant.gender;
      const nextStaying = updates.staying ?? participant.staying;
      if (updates.assignedTeam !== undefined) {
        const team = config.teams.find((entry) => entry.name === updates.assignedTeam);
        if (!team) throw createHttpError('Assigned team is not configured.', 'INVALID_TEAM');
        const countQuery = Participant.countDocuments({
          _id: { $ne: participant._id },
          assignedTeam: updates.assignedTeam
        });
        if (session) countQuery.session(session);
        const count = await countQuery;
        if (team.targetCapacity && count >= team.targetCapacity) {
          throw createHttpError('Assigned team has reached capacity.', 'TEAM_CAPACITY_EXHAUSTED', 409);
        }
      }

      const targetRoom = updates.assignedRoom !== undefined
        ? updates.assignedRoom
        : (nextStaying ? participant.assignedRoom : '');
      if (nextStaying && targetRoom) {
        const room = config.rooms.find((entry) => entry.name === targetRoom);
        if (!room) throw createHttpError('A valid room is required for a residential participant.', 'INVALID_ROOM');
        if (room.gender !== nextGender) {
          throw createHttpError('Room gender must match participant gender.', 'ROOM_GENDER_MISMATCH', 409);
        }
        const occQuery = Participant.countDocuments({
          _id: { $ne: participant._id },
          staying: true,
          assignedRoom: room.name
        });
        if (session) occQuery.session(session);
        const occupancy = await occQuery;
        if (occupancy >= room.capacity) {
          throw createHttpError('Room has reached its bed capacity.', 'ROOM_CAPACITY_EXHAUSTED', 409);
        }
      } else if (!nextStaying) {
        updates.assignedRoom = '';
      }

      Object.assign(participant, updates);
      if (updates.name !== undefined) participant.name = updates.name.trim();
      if (updates.age !== undefined) participant.age = Number(updates.age);
      if (updates.amountPaid !== undefined) participant.amountPaid = Number(updates.amountPaid);
      if (updates.feeTotal !== undefined) participant.feeTotal = Number(updates.feeTotal);
      if (updates.balanceDue !== undefined) participant.balanceDue = Number(updates.balanceDue);
      if (updates.balanceToReturn !== undefined) participant.balanceToReturn = Number(updates.balanceToReturn);

      // If unallocated and updates did not manually assign a team, allocate if payment is complete!
      if (!participant.assignedTeam && updates.assignedTeam === undefined) {
        await allocateIfEligible(participant, config, session);
      }

      await participant.save(session ? { session } : {});
      return participant;
    });

    res.json({ success: true, data: updatedParticipant });
  } catch (error) {
    next(getMongoError(error));
  }
}

async function deleteParticipant(req, res, next) {
  try {
    const participant = await Participant.findByIdAndDelete(req.params.id);
    if (!participant) throw createHttpError('Participant was not found.', 'PARTICIPANT_NOT_FOUND', 404);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerParticipant,
  registerGroup,
  updateParticipantNotes,
  listParticipants,
  getParticipant,
  updateParticipant,
  deleteParticipant
};
