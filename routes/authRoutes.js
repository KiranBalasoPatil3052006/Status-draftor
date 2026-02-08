const express = require('express');
const { registerUser, authUser, getAllEmployees } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/employees', protect, admin, getAllEmployees);

module.exports = router;
