/**
 * @file index.js
 * @description Central export gateway for all Mongoose models in ICPF Camp System.
 */

const Participant = require('./Participant');
const CampConfig = require('./CampConfig');
const Team = require('./Team');
const Room = require('./Room');
const Counter = require('./Counter');

module.exports = {
  Participant,
  CampConfig,
  Team,
  Room,
  Counter
};
