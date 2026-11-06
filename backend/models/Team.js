/**
 * @file Team.js
 * @description Modular Mongoose model for individual camp teams.
 * Allows independent querying and synchronization alongside CampConfig.
 */

const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      unique: true,
      index: true
    },
    themeColor: {
      type: String,
      required: [true, 'Theme color is required'],
      trim: true,
      match: [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Theme color must be a valid hex code']
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
    },
    campYear: {
      type: Number,
      default: 2026,
      index: true
    },
    leaderName: {
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

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
