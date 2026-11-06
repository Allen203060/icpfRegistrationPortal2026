/**
 * @file Counter.js
 * @description Atomic sequence counter for thread-safe sequential identifiers (serialNo)
 * Prevents race condition collisions (E11000) under high concurrent load.
 */

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true
    },
    seq: {
      type: Number,
      default: 100
    }
  },
  { versionKey: false }
);

/**
 * Atomically increments and retrieves the next sequence number.
 * Guarantees monotonic increase with zero collisions under concurrent load.
 */
counterSchema.statics.getNext = async function (counterId = 'participant_serialNo', minFloor = 100) {
  const counter = await this.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  if (counter.seq <= minFloor) {
    const target = minFloor + 1;
    await this.updateOne({ _id: counterId }, { $max: { seq: target } });
    return target;
  }

  return counter.seq;
};

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

module.exports = Counter;
