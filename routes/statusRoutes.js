const express = require('express');
const router = express.Router();
const { createStatus, getTodayStatus, MyHistory, getTeamStatuses } = require('../controllers/statusController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').post(protect, createStatus);
router.route('/today').get(protect, getTodayStatus);
router.route('/my-history').get(protect, MyHistory);
router.route('/team').get(protect, admin, getTeamStatuses);

module.exports = router;
