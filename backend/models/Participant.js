/**
 * @file Participant.js
 * @description Mongoose model for camp participants.
 * Strictly adheres to SHARED_MEMORY.md Section 3.1 contract.
 * Enforces gender constraints, auto-incrementing serial numbers (starting at 101),
 * and high-frequency indexing for fast search and aggregation.
 */

const mongoose = require('mongoose');
const Counter = require('./Counter');

const participantSchema = new mongoose.Schema(
  {
    serialNo: {
      type: Number,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Participant name is required'],
      trim: true,
      maxlength: [120, 'Participant name cannot exceed 120 characters']
    },
    age: {
      type: Number,
      required: [true, 'Participant age is required'],
      min: [1, 'Age must be greater than 0'],
      max: [120, 'Age must be a valid human age']
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: ['Male', 'Female'],
        message: 'Gender must be either Male or Female'
      },
      index: true
    },
    church: {
      type: String,
      trim: true,
      default: ''
    },
    churchLocation: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    staying: {
      type: Boolean,
      default: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    assignedTeam: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    assignedRoom: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['Paid Online', 'Paid Cash', 'Waiting Payment', 'Partial / Balance Due', 'Exempt'],
        message: 'Invalid payment status'
      },
      default: 'Waiting Payment',
      index: true
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid cannot be negative']
    },
    feeTotal: {
      type: Number,
      default: 0,
      min: [0, 'Total fee cannot be negative']
    },
    balanceDue: {
      type: Number,
      default: 0
    },
    balanceToReturn: {
      type: Number,
      default: 0,
      min: [0, 'Balance to return cannot be negative']
    },
    paymentNotes: {
      type: String,
      trim: true,
      default: ''
    },
    groupRegistrationId: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    registeredBy: {
      type: String,
      trim: true,
      default: ''
    },
    isFirstTimer: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// High-speed text index for debounced attendee searches across name, church, churchLocation, and location
participantSchema.index({ name: 'text', church: 'text', churchLocation: 'text', location: 'text' });

// Compound index for gender + team distribution queries
participantSchema.index({ assignedTeam: 1, gender: 1 });

// Compound index for room occupancy queries
participantSchema.index({ assignedRoom: 1, gender: 1 });

/**
 * Pre-save middleware: Atomically auto-assign serialNo starting from 101 if not explicitly provided
 */
participantSchema.pre('save', async function (next) {
  if (this.isNew && (!this.serialNo || this.serialNo < 101)) {
    try {
      const highestParticipant = await this.constructor
        .findOne({}, { serialNo: 1 })
        .sort({ serialNo: -1 })
        .lean();
      const floor = Math.max(100, highestParticipant?.serialNo || 100);
      this.serialNo = await Counter.getNext('participant_serialNo', floor);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

/**
 * Static Helper: Calculate aggregate headcount per team partitioned by gender
 * Useful for M2 Allocator Service and M6 Dashboard
 */
participantSchema.statics.getTeamStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: '$assignedTeam',
        total: { $sum: 1 },
        males: {
          $sum: { $cond: [{ $eq: ['$gender', 'Male'] }, 1, 0] }
        },
        females: {
          $sum: { $cond: [{ $eq: ['$gender', 'Female'] }, 1, 0] }
        },
        averageAge: { $avg: '$age' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/**
 * Static Helper: Calculate aggregate room occupancy
 * Invariant #1 check: Ensure no room contains mixed genders
 */
participantSchema.statics.getRoomOccupancy = async function () {
  return this.aggregate([
    { $match: { assignedRoom: { $ne: '' }, staying: true } },
    {
      $group: {
        _id: '$assignedRoom',
        occupiedCount: { $sum: 1 },
        genders: { $addToSet: '$gender' },
        occupants: {
          $push: {
            serialNo: '$serialNo',
            name: '$name',
            gender: '$gender',
            church: '$church'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;
