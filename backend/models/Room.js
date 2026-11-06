/**
 * @file Room.js
 * @description Modular Mongoose model for camp residential rooms.
 * Enforces Invariant #1: Absolute Gender Segregation and physical capacity limits.
 */

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      unique: true,
      index: true
    },
    gender: {
      type: String,
      required: [true, 'Room gender designation is required'],
      enum: {
        values: ['Male', 'Female'],
        message: 'Room gender must be either Male or Female'
      },
      index: true
    },
    capacity: {
      type: Number,
      required: [true, 'Bed capacity is required'],
      min: [1, 'Room capacity must be at least 1']
    },
    leaderName: {
      type: String,
      trim: true,
      default: ''
    },
    campYear: {
      type: Number,
      default: 2026,
      index: true
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

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
