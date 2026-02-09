const express = require('express');
const { registerUser, authUser, getAllEmployees, deleteUser } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/employees', protect, admin, getAllEmployees);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;
