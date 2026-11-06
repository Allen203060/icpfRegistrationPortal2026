const express = require('express');
const {
  getActiveConfig,
  updateTeams,
  updateRooms
} = require('../controllers/configController');

const router = express.Router();

router.get('/active', getActiveConfig);
router.put('/teams', updateTeams);
router.put('/rooms', updateRooms);

module.exports = router;
