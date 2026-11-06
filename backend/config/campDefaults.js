/**
 * @file campDefaults.js
 * @description Default 2026 Camp configuration metadata, teams, and room inventory.
 * Strictly adheres to ICPF Camp Domain Invariant #3: Configuration-as-Data (Zero Hardcoding).
 */

const defaultCampConfig = {
  year: 2026,
  campTitle: 'ICPF Camp 2026',
  active: true,
  teams: [
    {
      name: 'Group A',
      themeColor: '#38BDF8', // Sky Blue
      targetCapacity: 25,
      description: 'Group A'
    },
    {
      name: 'Group B',
      themeColor: '#F472B6', // Rose Pink
      targetCapacity: 25,
      description: 'Group B'
    },
    {
      name: 'Group C',
      themeColor: '#FACC15', // Amber Yellow
      targetCapacity: 25,
      description: 'Group C'
    },
    {
      name: 'Group D',
      themeColor: '#A78BFA', // Violet
      targetCapacity: 25,
      description: 'Group D'
    },
    {
      name: 'Group E',
      themeColor: '#34D399', // Emerald Mint
      targetCapacity: 25,
      description: 'Group E'
    },
    {
      name: 'Group F',
      themeColor: '#FB923C', // Tangerine Orange
      targetCapacity: 25,
      description: 'Group F'
    },
    {
      name: 'Group G',
      themeColor: '#2DD4BF', // Vibrant Teal
      targetCapacity: 25,
      description: 'Group G'
    },
    {
      name: 'Group H',
      themeColor: '#A3E635', // Fresh Lime
      targetCapacity: 25,
      description: 'Group H'
    },
    {
      name: 'Group I',
      themeColor: '#818CF8', // Indigo
      targetCapacity: 25,
      description: 'Group I'
    },
    {
      name: 'Group J',
      themeColor: '#F87171', // Coral Red
      targetCapacity: 25,
      description: 'Group J'
    }
  ],
  rooms: [
    // Male residential accommodations (Invariant #1: Absolute Gender Segregation)
    { name: 'Male Room 1', gender: 'Male', capacity: 10, leaderName: 'Male Counselor 1' },
    { name: 'Male Room 2', gender: 'Male', capacity: 10, leaderName: 'Male Counselor 2' },
    { name: 'Male Room 3', gender: 'Male', capacity: 10, leaderName: 'Male Counselor 3' },
    { name: 'Male Room 4', gender: 'Male', capacity: 10, leaderName: 'Male Counselor 4' },
    { name: 'Male Room 5', gender: 'Male', capacity: 10, leaderName: 'Male Counselor 5' },

    // Female residential accommodations (Invariant #1: Absolute Gender Segregation)
    { name: 'Female Room 6', gender: 'Female', capacity: 10, leaderName: 'Female Counselor 1' },
    { name: 'Female Room 7', gender: 'Female', capacity: 10, leaderName: 'Female Counselor 2' },
    { name: 'Female Room 8', gender: 'Female', capacity: 10, leaderName: 'Female Counselor 3' },
    { name: 'Female Room 9', gender: 'Female', capacity: 10, leaderName: 'Female Counselor 4' },
    { name: 'Female Room 10', gender: 'Female', capacity: 10, leaderName: 'Female Counselor 5' }
  ]
};

module.exports = {
  defaultCampConfig
};
