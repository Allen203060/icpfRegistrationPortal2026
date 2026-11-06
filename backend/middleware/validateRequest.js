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
  if (!Number.isInteger(Number(age)) || Number(age) < 1) {
    return next(createHttpError('Participant age must be a positive integer.', 'INVALID_AGE'));
  }
  if (!['Male', 'Female'].includes(gender)) {
    return next(createHttpError('Gender must be Male or Female.', 'INVALID_GENDER'));
  }
  if (staying !== undefined && typeof staying !== 'boolean') {
    return next(createHttpError('Staying must be a boolean.', 'INVALID_STAYING'));
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
