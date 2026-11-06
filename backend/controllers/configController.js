const mongoose = require('mongoose');
const { CampConfig } = require('../models');
const { createHttpError } = require('../middleware/validateRequest');

function getMongoError(error) {
  if (/Transaction numbers are only allowed|replica set/i.test(error.message || '')) {
    error.statusCode = 503;
    error.code = 'DATABASE_TRANSACTIONS_REQUIRED';
  }
  return error;
}

async function findAndLockActiveConfig(session) {
  const config = await CampConfig.findOne({ active: true }).session(session);
  if (!config) throw createHttpError('No active camp configuration exists.', 'ACTIVE_CONFIG_NOT_FOUND', 503);
  // Use the same serialization point as participant registration and overrides.
  await CampConfig.updateOne({ _id: config._id }, { $inc: { __v: 1 } }, { session });
  config.__v = (config.__v || 0) + 1;
  return config;
}

async function getActiveConfig(req, res, next) {
  try {
    const config = await CampConfig.getActiveConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
}

async function updateTeams(req, res, next) {
  let session;
  try {
    const teams = req.body?.teams;
    if (!Array.isArray(teams) || teams.length === 0) {
      throw createHttpError('At least one team must be provided.', 'INVALID_TEAMS');
    }
    const names = teams.map((team) => typeof team?.name === 'string' ? team.name.trim() : '');
    if (names.some((name) => !name) || new Set(names).size !== names.length) {
      throw createHttpError('Team names must be present and unique.', 'INVALID_TEAMS');
    }
    session = await mongoose.startSession();
    let updatedConfig;
    await session.withTransaction(async () => {
      const config = await findAndLockActiveConfig(session);
      const counts = await CampConfig.db.model('Participant').aggregate([
        { $group: { _id: '$assignedTeam', count: { $sum: 1 } } }
      ]).session(session);
      const countsByTeam = new Map(counts.map((entry) => [entry._id, entry.count]));
      for (const [name, count] of countsByTeam) {
        const replacement = teams.find((team) => team.name.trim() === name);
        if (!replacement) {
          throw createHttpError(`Team "${name}" still has participants and cannot be removed.`, 'TEAM_IN_USE', 409);
        }
        if (replacement.targetCapacity && replacement.targetCapacity < count) {
          throw createHttpError(`Team "${name}" target capacity is below its current headcount.`, 'TEAM_CAPACITY_TOO_SMALL', 409);
        }
      }
      config.teams = teams;
      await config.save({ session });
      updatedConfig = config;
    });
    res.json({ success: true, data: updatedConfig });
  } catch (error) {
    next(getMongoError(error));
  } finally {
    if (session) await session.endSession();
  }
}

async function updateRooms(req, res, next) {
  let session;
  try {
    const rooms = req.body?.rooms;
    if (!Array.isArray(rooms) || rooms.length === 0) {
      throw createHttpError('At least one room must be provided.', 'INVALID_ROOMS');
    }
    const names = rooms.map((room) => typeof room?.name === 'string' ? room.name.trim() : '');
    if (names.some((name) => !name) || new Set(names).size !== names.length) {
      throw createHttpError('Room names must be present and unique.', 'INVALID_ROOMS');
    }
    session = await mongoose.startSession();
    let updatedConfig;
    await session.withTransaction(async () => {
      const config = await findAndLockActiveConfig(session);
      const occupancy = await CampConfig.db.model('Participant').aggregate([
        { $match: { staying: true, assignedRoom: { $ne: '' } } },
        { $group: { _id: { name: '$assignedRoom', gender: '$gender' }, count: { $sum: 1 } } }
      ]).session(session);
      for (const entry of occupancy) {
        const roomName = entry._id.name;
        const replacement = rooms.find((room) => room.name.trim() === roomName);
        if (!replacement) {
          throw createHttpError(`Room "${roomName}" is occupied and cannot be removed.`, 'ROOM_IN_USE', 409);
        }
        if (replacement.gender !== entry._id.gender) {
          throw createHttpError(`Room "${roomName}" contains participants of a different gender.`, 'ROOM_GENDER_MISMATCH', 409);
        }
        if (replacement.capacity < entry.count) {
          throw createHttpError(`Room "${roomName}" capacity is below its current occupancy.`, 'ROOM_CAPACITY_TOO_SMALL', 409);
        }
      }
      config.rooms = rooms;
      await config.save({ session });
      updatedConfig = config;
    });
    res.json({ success: true, data: updatedConfig });
  } catch (error) {
    next(getMongoError(error));
  } finally {
    if (session) await session.endSession();
  }
}

module.exports = { getActiveConfig, updateTeams, updateRooms };
