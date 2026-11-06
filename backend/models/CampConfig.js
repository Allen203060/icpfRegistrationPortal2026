/**
 * @file CampConfig.js
 * @description Mongoose model for dynamic camp configurations (teams, rooms, metadata).
 * Strictly adheres to SHARED_MEMORY.md Section 3.1 contract and Invariant #3 (Configuration-as-Data).
 */

const mongoose = require('mongoose');
const { defaultCampConfig } = require('../config/campDefaults');

const teamConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true
    },
    themeColor: {
      type: String,
      required: [true, 'Theme color hex code is required'],
      trim: true,
      match: [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Theme color must be a valid hex code (e.g. #3B82F6)']
    },
    targetCapacity: {
      type: Number,
      default: 25,
      min: [1, 'Target capacity must be at least 1']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const roomConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true
    },
    gender: {
      type: String,
      required: [true, 'Room gender designation is required'],
      enum: {
        values: ['Male', 'Female'],
        message: 'Room gender must be either Male or Female'
      }
    },
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required'],
      min: [1, 'Room capacity must be at least 1']
    },
    leaderName: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const campConfigSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: [true, 'Camp year is required'],
      default: 2026,
      index: true
    },
    campTitle: {
      type: String,
      required: [true, 'Camp title is required'],
      trim: true,
      default: 'ICPF Camp 2026'
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    teams: {
      type: [teamConfigSchema],
      validate: {
        validator: function (teams) {
          return teams && teams.length > 0;
        },
        message: 'At least one team must be configured'
      }
    },
    rooms: {
      type: [roomConfigSchema],
      validate: {
        validator: function (rooms) {
          return rooms && rooms.length > 0;
        },
        message: 'At least one room must be configured'
      }
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Pre-save middleware: Enforce single active configuration invariant
 * If saving with active: true, deactivate all other configs
 */
campConfigSchema.pre('save', async function (next) {
  if (this.isModified('active') && this.active) {
    try {
      await this.constructor.updateMany(
        { _id: { $ne: this._id } },
        { $set: { active: false } }
      );
    } catch (err) {
      return next(err);
    }
  }
  next();
});

/**
 * Static Helper: Retrieve the currently active camp configuration
 * Falls back to seeding default 2026 config if no record exists
 */
campConfigSchema.statics.getActiveConfig = async function () {
  let activeConfig = await this.findOne({ active: true }).lean();

  if (!activeConfig) {
    // If no active config exists, check if any config exists
    const anyConfig = await this.findOne().sort({ year: -1 });
    if (anyConfig) {
      anyConfig.active = true;
      await anyConfig.save();
      return anyConfig.toObject();
    }

    // Auto-seed default 2026 configuration
    console.log('[CampConfig] No active camp configuration found. Auto-seeding default 2026 configuration...');
    const createdConfig = await this.create(defaultCampConfig);
    activeConfig = createdConfig.toObject();
  }

  return activeConfig;
};

/**
 * Static Helper: Seed or reset to default 2026 configuration
 */
campConfigSchema.statics.seedDefaults = async function (force = false) {
  const existing = await this.findOne({ year: 2026 });
  if (existing && !force) {
    return existing;
  }

  if (existing && force) {
    await this.deleteOne({ _id: existing._id });
  }

  return await this.create(defaultCampConfig);
};

const CampConfig = mongoose.model('CampConfig', campConfigSchema);

module.exports = CampConfig;
