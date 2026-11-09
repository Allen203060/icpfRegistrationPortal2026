/**
 * Deterministic camp team and room allocator.
 *
 * Team selection uses the project contract's lexicographic priority:
 * size parity, gender balance, age dispersion, then church/locality dispersion.
 * This module is pure: callers provide the current configuration and occupancy,
 * and it returns an assignment without writing to the database.
 */

const VALID_GENDERS = new Set(['male', 'female']);

function allocationError(message, code, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizedText(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

function compareNames(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function numericCount(value, fallback = 0) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : fallback;
}

function getMembers(team) {
  if (Array.isArray(team.members)) return team.members;
  if (Array.isArray(team.participants)) return team.participants;
  return [];
}

function getTeamCount(team, members) {
  if (members.length) return members.length;
  return numericCount(team.count ?? team.total ?? team.memberCount, 0);
}

function getGenderCounts(team, members) {
  if (members.length) {
    return members.reduce(
      (counts, member) => {
        const gender = normalizedText(member.gender);
        if (gender === 'male') counts.males += 1;
        if (gender === 'female') counts.females += 1;
        return counts;
      },
      { males: 0, females: 0 }
    );
  }

  return {
    males: numericCount(team.males ?? team.maleCount, 0),
    females: numericCount(team.females ?? team.femaleCount, 0)
  };
}

function minimumAgeGap(candidateAge, members) {
  const ages = members
    .map((member) => Number(member.age))
    .filter((age) => Number.isFinite(age) && age > 0);

  if (ages.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...ages.map((age) => Math.abs(candidateAge - age)));
}

function affiliationConflicts(candidate, members) {
  const church = normalizedText(candidate.church);
  const location = normalizedText(candidate.location);

  if (!church && !location) return 0;

  return members.reduce((conflicts, member) => {
    const sameChurch = church && normalizedText(member.church) === church;
    const sameLocation = location && normalizedText(member.location) === location;
    return conflicts + (sameChurch || sameLocation ? 1 : 0);
  }, 0);
}

function chooseTeam(candidate, teams, options = {}) {
  if (!Array.isArray(teams) || teams.length === 0) {
    throw allocationError('No teams are configured.', 'NO_TEAMS_CONFIGURED', 503);
  }

  const allTeams = teams
    .filter((team) => team && typeof team.name === 'string' && team.name.trim())
    .map((team) => {
      const members = getMembers(team);
      const count = getTeamCount(team, members);
      const capacity = Number(team.targetCapacity ?? team.capacity);
      return {
        team,
        members,
        count,
        full: Number.isFinite(capacity) && capacity > 0 && count >= capacity,
        genderCounts: getGenderCounts(team, members)
      };
    });

  // Explicit Override: If user requested a specific team (e.g. manual Leader assignment or Keep Together)
  if (options.requestedTeam) {
    const requested = allTeams.find(
      (entry) => entry.team.name.trim().toLowerCase() === options.requestedTeam.trim().toLowerCase()
    );
    if (requested) {
      return requested.team.name.trim();
    }
  }

  // The "Leader" team is strictly reserved for manual assignment of leaders/volunteers.
  // Exclude it from automatic 4-tier heuristic parity distribution for regular campers.
  const regularTeams = allTeams.filter(
    (entry) => entry.team.name.trim().toLowerCase() !== 'leader'
  );

  let available = regularTeams.filter((entry) => !entry.full);

  if (available.length === 0) {
    // If all configured teams reached capacity, allocate into least populated regular team
    available = regularTeams.length > 0 ? regularTeams : allTeams;
  }

  // Base Constraint: Size Parity (Teams must maintain balanced headcount)
  const smallest = Math.min(...available.map((entry) => entry.count));
  const sizeTies = available.filter((entry) => entry.count === smallest);

  // Priority Tier 1: Age Diversity (Maximize age gap to closest member in candidate team)
  const ageScores = sizeTies.map((entry) => ({
    ...entry,
    ageGap: minimumAgeGap(candidate.age, entry.members)
  }));
  const bestAgeGap = Math.max(...ageScores.map((entry) => entry.ageGap));
  const ageTies = ageScores.filter((entry) => entry.ageGap === bestAgeGap);

  // Priority Tier 2: Gender Parity (Minimize absolute difference |males - females|)
  const genderScores = ageTies.map((entry) => {
    const males = entry.genderCounts.males + (candidate.gender === 'Male' ? 1 : 0);
    const females = entry.genderCounts.females + (candidate.gender === 'Female' ? 1 : 0);
    return { ...entry, genderImbalance: Math.abs(males - females) };
  });
  const bestGenderScore = Math.min(...genderScores.map((entry) => entry.genderImbalance));
  const genderTies = genderScores.filter((entry) => entry.genderImbalance === bestGenderScore);

  // Priority Tier 3: Location / Church Dispersion (Minimize duplicate church/city members)
  const affiliationScores = genderTies.map((entry) => ({
    ...entry,
    affiliationPenalty: affiliationConflicts(candidate, entry.members)
  }));
  const bestAffiliationScore = Math.min(...affiliationScores.map((entry) => entry.affiliationPenalty));
  const affiliationTies = affiliationScores.filter((entry) => entry.affiliationPenalty === bestAffiliationScore);

  // Priority Tier 4: Anti-Consecutive Registration Penalty
  // Prevent attendees arriving consecutively from clustering in the same team
  const antiConsecutiveScores = affiliationTies.map((entry) => {
    const isConsecutive =
      options.lastAssignedTeam &&
      entry.team.name.trim().toLowerCase() === options.lastAssignedTeam.trim().toLowerCase();
    return { ...entry, consecutivePenalty: isConsecutive ? 1 : 0 };
  });
  const bestConsecutiveScore = Math.min(...antiConsecutiveScores.map((entry) => entry.consecutivePenalty));

  // Deterministic Tie-Breaker: Alphabetical by team name
  return antiConsecutiveScores
    .filter((entry) => entry.consecutivePenalty === bestConsecutiveScore)
    .sort((a, b) => compareNames(a.team.name, b.team.name))[0].team.name.trim();
}

function roomOccupancy(room) {
  if (Array.isArray(room.members)) return room.members.length;
  if (Array.isArray(room.occupants)) return room.occupants.length;
  return numericCount(room.occupiedCount ?? room.occupancy ?? room.count, 0);
}

function chooseRoom(candidate, rooms, options = {}) {
  // Day participants do not consume residential room capacity.
  if (candidate.staying === false) return '';

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return 'Unassigned (No Rooms Configured)';
  }

  // Find all rooms matching the candidate's gender (strict invariant #1: Absolute Gender Segregation)
  const allMatchingGenderRooms = rooms
    .filter((room) => {
      if (!room || typeof room.name !== 'string' || !room.name.trim()) return false;
      return normalizedText(room.gender) === normalizedText(candidate.gender);
    })
    .map((room) => ({
      room,
      capacity: Number(room.capacity) || 0,
      occupied: roomOccupancy(room)
    }));

  if (allMatchingGenderRooms.length === 0) {
    return 'Unassigned (No Rooms Configured)';
  }

  // Explicit Room Override if specified and matches gender
  if (options.requestedRoom) {
    const requested = allMatchingGenderRooms.find(
      (entry) => entry.room.name.trim().toLowerCase() === options.requestedRoom.trim().toLowerCase()
    );
    if (requested) {
      return requested.room.name.trim();
    }
  }

  // 1. First preference: Rooms with remaining capacity under physical ceiling
  const availableRooms = allMatchingGenderRooms.filter(
    (entry) => entry.capacity > 0 && entry.occupied < entry.capacity
  );

  if (availableRooms.length > 0) {
    availableRooms.sort((a, b) =>
      a.occupied - b.occupied || compareNames(a.room.name, b.room.name)
    );
    return availableRooms[0].room.name.trim();
  }

  // 2. ALL ROOMS FOR THIS GENDER ARE FULL:
  // Allocate them regardless into the matching-gender room with lowest occupancy!
  // This balances bed overflow across dorms while strictly maintaining gender segregation.
  if (options.overflowTarget === 'unassigned') {
    return 'Unassigned (Dorm Full)';
  }

  allMatchingGenderRooms.sort((a, b) =>
    a.occupied - b.occupied || compareNames(a.room.name, b.room.name)
  );
  return allMatchingGenderRooms[0].room.name.trim();
}

/**
 * Assign a participant to a team and, when residential, a room.
 *
 * @param {{name: string, age: number, gender: 'Male'|'Female', church?: string, location?: string, staying?: boolean}} candidate
 * @param {Array<Object>} currentTeams Team configuration with member lists or counts.
 * @param {Array<Object>} currentRooms Room configuration with occupancy or occupants.
 * @returns {{assignedTeam: string, assignedRoom: string}}
 */
function allocateParticipant(candidate, currentTeams, currentRooms, options = {}) {
  if (!candidate || typeof candidate !== 'object') {
    throw allocationError('A participant record is required.', 'INVALID_CANDIDATE');
  }

  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    throw allocationError('Participant name is required.', 'INVALID_NAME');
  }

  const age = Number(candidate.age);
  if (!Number.isInteger(age) || age < 1) {
    throw allocationError('Participant age must be a positive integer.', 'INVALID_AGE');
  }

  if (!VALID_GENDERS.has(normalizedText(candidate.gender))) {
    throw allocationError('Participant gender must be Male or Female.', 'INVALID_GENDER');
  }

  const normalizedCandidate = {
    ...candidate,
    age,
    gender: normalizedText(candidate.gender) === 'male' ? 'Male' : 'Female'
  };

  const assignedTeam = chooseTeam(normalizedCandidate, currentTeams, options);
  const assignedRoom = chooseRoom(normalizedCandidate, currentRooms, options);

  return { assignedTeam, assignedRoom };
}

module.exports = {
  allocateParticipant,
  chooseTeam,
  chooseRoom
};
