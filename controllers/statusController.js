const Status = require('../models/Status');

// @desc    Create or Update today's status
// @route   POST /api/status
// @access  Private
const createStatus = async (req, res) => {
    const { completed, pending, blockers } = req.body;

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const status = await Status.findOne({
            user: req.user._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (status) {
            status.completed = completed;
            status.pending = pending;
            status.blockers = blockers;
            const updatedStatus = await status.save();
            res.json(updatedStatus);
        } else {
            const newStatus = new Status({
                user: req.user._id,
                completed,
                pending,
                blockers,
                date: new Date(),
            });
            const createdStatus = await newStatus.save();
            res.status(201).json(createdStatus);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get logged in user status for today
// @route   GET /api/status/today
// @access  Private
const getTodayStatus = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const status = await Status.findOne({
            user: req.user._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        res.json(status || null);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged in user status history
// @route   GET /api/status/my-history
// @access  Private
const MyHistory = async (req, res) => {
    try {
        const statuses = await Status.find({ user: req.user._id }).sort({ date: -1 });
        res.json(statuses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all statuses (Manager only)
// @route   GET /api/status/team
// @access  Private/Manager
const getTeamStatuses = async (req, res) => {
    try {
        const statuses = await Status.find({}).populate('user', 'name email').sort({ date: -1 });
        res.json(statuses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createStatus, getTodayStatus, MyHistory, getTeamStatuses };
