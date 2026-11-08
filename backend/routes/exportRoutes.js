const express = require('express');
const multer = require('multer');
const {
  exportIdCards,
  exportRoomLists,
  exportStatsPdf,
  exportExcel,
  importExcel
} = require('../controllers/exportController');

const router = express.Router();

// Memory storage for Excel file uploads (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/stats-pdf', exportStatsPdf);
router.get('/id-cards', exportIdCards);
router.get('/room-lists', exportRoomLists);
router.get('/excel', exportExcel);
router.post('/import-excel', upload.single('file'), importExcel);

module.exports = router;
