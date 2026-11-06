const express = require('express');
const {
  registerParticipant,
  registerGroup,
  updateParticipantNotes,
  listParticipants,
  getParticipant,
  updateParticipant,
  deleteParticipant
} = require('../controllers/participantController');
const {
  validateRegistration,
  validateParticipantId
} = require('../middleware/validateRequest');

const router = express.Router();

router.post('/register', validateRegistration, registerParticipant);
router.post('/register-group', registerGroup);
router.get('/', listParticipants);
router.get('/:id', validateParticipantId, getParticipant);
router.put('/:id', validateParticipantId, updateParticipant);
router.put('/:id/notes', validateParticipantId, updateParticipantNotes);
router.patch('/:id/notes', validateParticipantId, updateParticipantNotes);
router.delete('/:id', validateParticipantId, deleteParticipant);

module.exports = router;
