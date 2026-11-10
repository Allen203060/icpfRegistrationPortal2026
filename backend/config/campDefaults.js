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
      name: 'Masterpiece (Group 1)',
      themeColor: '#38BDF8', // Sky Blue
      targetCapacity: 30,
      description: 'Masterpiece (Group 1)'
    },
    {
      name: 'The Originals (OGs) (Group 2)',
      themeColor: '#F472B6', // Rose Pink
      targetCapacity: 30,
      description: 'The Originals (OGs) (Group 2)'
    },
    {
      name: 'Signature (Group 3)',
      themeColor: '#FACC15', // Amber Yellow
      targetCapacity: 30,
      description: 'Signature (Group 3)'
    },
    {
      name: 'DNA (Group 4)',
      themeColor: '#A78BFA', // Violet
      targetCapacity: 30,
      description: 'DNA (Group 4)'
    },
    {
      name: 'Royal (Group 5)',
      themeColor: '#34D399', // Emerald Mint
      targetCapacity: 30,
      description: 'Royal (Group 5)'
    },
    {
      name: 'Aadhar (Group 6)',
      themeColor: '#FB923C', // Tangerine Orange
      targetCapacity: 30,
      description: 'Aadhar (Group 6)'
    },
    {
      name: 'The Icons (Group 7)',
      themeColor: '#2DD4BF', // Vibrant Teal
      targetCapacity: 30,
      description: 'The Icons (Group 7)'
    },
    {
      name: 'Chosen One (Group 8)',
      themeColor: '#A3E635', // Fresh Lime
      targetCapacity: 30,
      description: 'Chosen One (Group 8)'
    },
    {
      name: 'Leader',
      themeColor: '#F59E0B', // Amber Gold
      targetCapacity: 50,
      description: 'Event Leaders, Volunteers, and Counselors'
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
