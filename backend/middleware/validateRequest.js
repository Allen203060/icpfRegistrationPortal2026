const mongoose = require('mongoose');

function createHttpError(message, code, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function validateRegistration(req, res, next) {
  const { name, age, gender, staying } = req.body || {};

  if (typeof name !== 'string' || !name.trim()) {
    return next(createHttpError('Participant name is required.', 'INVALID_NAME'));
  }
  req.body.name = name.trim();

  const numAge = Number(age);
  if (!Number.isInteger(numAge) || numAge < 1 || numAge > 120) {
    return next(createHttpError('Participant age must be a positive integer between 1 and 120.', 'INVALID_AGE'));
  }
  req.body.age = numAge;

  // Case-insensitive gender normalization
  const normalizedGender = typeof gender === 'string' ? gender.trim().toLowerCase() : '';
  if (normalizedGender === 'male' || normalizedGender === 'm') {
    req.body.gender = 'Male';
  } else if (normalizedGender === 'female' || normalizedGender === 'f') {
    req.body.gender = 'Female';
  } else {
    return next(createHttpError('Gender must be Male or Female.', 'INVALID_GENDER'));
  }

  // Permissive staying parsing (handles boolean, string "true"/"yes"/"no", 1/0)
  if (staying !== undefined) {
    if (typeof staying === 'boolean') {
      req.body.staying = staying;
    } else if (typeof staying === 'string') {
      const lower = staying.trim().toLowerCase();
      req.body.staying = lower === 'true' || lower === 'yes' || lower === '1';
    } else if (typeof staying === 'number') {
      req.body.staying = staying === 1;
    } else {
      req.body.staying = true;
    }
  }

  next();
}

function validateParticipantId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(createHttpError('Participant ID is invalid.', 'INVALID_ID'));
  }
  next();
}

module.exports = {
  createHttpError,
  validateRegistration,
  validateParticipantId
};
