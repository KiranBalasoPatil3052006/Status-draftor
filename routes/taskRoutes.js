const express = require('express');
const router = express.Router();
const {
    getMyTasks,
    createTask,
    updateTask,
    deleteTask,
    getTeamUpdates,
    getMyHistory,
    getPendingReports,
    createAssignedTask,
    getEmployeeHistory
} = require('../controllers/taskController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/history').get(protect, getMyHistory);
router.route('/user/:userId/history').get(protect, admin, getEmployeeHistory);

router.route('/')
    .get(protect, getMyTasks)
    .post(protect, createTask);

router.route('/:id')
    .put(protect, updateTask)
    .delete(protect, deleteTask);

router.route('/team')
    .get(protect, admin, getTeamUpdates);

router.route('/reports/pending')
    .get(protect, admin, getPendingReports);

router.route('/assign')
    .post(protect, admin, createAssignedTask);

module.exports = router;
