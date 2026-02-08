const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get my tasks (Pending/Waiting + Completed TODAY)
// @route   GET /api/tasks
// @access  Private (Employee)
const getMyTasks = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch only tasks created today
        const tasks = await Task.find({
            user: req.user.id,
            createdAt: { $gte: todayStart, $lte: todayEnd }
        }).sort({ updatedAt: -1 });

        // Return tasks but we need to group them by DATE for the frontend history?
        // Actually, the frontend calls `getMyTasks` for the dashboard (recent)
        // AND `/my-history` for history. I need to check `getMyHistory` in controller?
        // Wait, `getMyTasks` is for the board. `getMyHistory` (which was `getHistory` in statusController) 
        // needs to be re-implemented in taskController or I need to update `taskRoutes`?

        // I see `taskRoutes` has `getMyTasks`. 
        // Frontend calls `fetch('${API_URL}/status/my-history')`. 
        // THIS IS A BUG. I DELETED `statusRoutes` but frontend still calls it.
        // I need to implement `getMyHistory` in `taskController` and route it.

        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my task history grouped by date
// @route   GET /api/tasks/history
// @access  Private (Employee)
const getMyHistory = async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user.id }).sort({ updatedAt: -1 });

        const historyMap = {};

        tasks.forEach(task => {
            // Group by Date string (YYYY-MM-DD)
            const dateStr = new Date(task.updatedAt).toLocaleDateString();

            if (!historyMap[dateStr]) {
                historyMap[dateStr] = {
                    date: task.updatedAt,
                    completed: [],
                    pending: [],
                    blockers: []
                };
            }

            // We push objects now for editing
            const item = {
                _id: task._id,
                text: task.text,
                blockerReason: task.blockerReason,
                managerReply: task.managerReply
            };

            if (task.status === 'completed') {
                historyMap[dateStr].completed.push(item);
            } else if (task.status === 'pending') {
                historyMap[dateStr].pending.push(item);
            } else if (task.status === 'waiting') {
                historyMap[dateStr].blockers.push(item);
            }
        });

        const history = Object.values(historyMap).sort((a, b) => new Date(b.date) - new Date(a.date));
        res.status(200).json(history);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private (Employee)
const createTask = async (req, res) => {
    if (!req.body.text) {
        return res.status(400).json({ message: 'Please add a task description' });
    }

    try {
        const task = await Task.create({
            user: req.user.id,
            text: req.body.text,
            status: req.body.status || 'pending', // Allow status override
            blockerReason: req.body.blockerReason || ''
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a task (Status, Text, Blocker Reason)
// @route   PUT /api/tasks/:id
// @access  Private (Employee)
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check for user
        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Make sure the logged in user matches the task user OR is an admin
        if (task.user.toString() !== req.user.id && req.user.role !== 'manager') {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const updateData = { ...req.body };
        if (updateData.managerReply) {
            updateData.managerReplyAt = new Date();
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.status(200).json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (Employee)
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: `Task not found with ID: ${req.params.id}` });
        }

        // Verbose check
        if (task.user.toString() !== req.user.id.toString()) {
            console.log(`Unauthorized Delete Attempt: Task Owner ${task.user} vs Request User ${req.user.id}`);
            return res.status(401).json({
                message: `Unauthorized! Task Owner: ${task.user} | Your ID: ${req.user.id}`
            });
        }

        await task.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        console.error('Delete Task Error:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// @desc    Get all team updates for today (Manager)
// @route   GET /api/tasks/team
// @access  Private (Manager)
const getTeamUpdates = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch all employees to identify who is missing
        const employees = await User.find({ role: 'employee' }).select('name email');

        // Find all tasks created/updated today OR tasks that have a managerReply (for history)
        const tasks = await Task.find({
            $or: [
                { updatedAt: { $gte: todayStart, $lte: todayEnd } },
                { managerReply: { $exists: true, $ne: "" } }
            ]
        }).populate('user', 'name email').sort({ updatedAt: -1 });

        const userMap = {};

        // Pre-fill userMap with all employees as "missing"
        employees.forEach(emp => {
            userMap[emp._id.toString()] = {
                user: emp,
                date: null,
                completed: [],
                pending: [],
                blockers: [],
                isMissing: true // Default to true
            };
        });

        tasks.forEach(task => {
            const userId = task.user._id.toString();

            if (!userMap[userId]) {
                userMap[userId] = {
                    user: task.user,
                    date: task.updatedAt,
                    completed: [],
                    pending: [],
                    blockers: [],
                    isMissing: false
                };
            }

            // A user is NOT missing if they have a task created today
            const taskFromToday = new Date(task.createdAt) >= todayStart;
            if (taskFromToday) {
                userMap[userId].isMissing = false;
            }

            if (!userMap[userId].date || new Date(task.updatedAt) > new Date(userMap[userId].date)) {
                userMap[userId].date = task.updatedAt;
            }

            const taskInfo = {
                id: task._id,
                text: task.text,
                managerReply: task.managerReply,
                managerReplyAt: task.managerReplyAt
            };

            if (task.status === 'completed') {
                userMap[userId].completed.push(taskInfo);
            } else if (task.status === 'pending') {
                userMap[userId].pending.push(taskInfo);
            } else if (task.status === 'waiting') {
                userMap[userId].blockers.push({
                    ...taskInfo,
                    reason: task.blockerReason,
                    rawText: task.text
                });
            }
        });

        // Sort: Active today first, then missing employees sorted by last active date (if any)
        const teamUpdates = Object.values(userMap).sort((a, b) => {
            if (a.isMissing !== b.isMissing) return a.isMissing ? 1 : -1;
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date) - new Date(a.date);
        });
        res.status(200).json(teamUpdates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get pending task reports (Manager)
// @route   GET /api/tasks/reports/pending
// @access  Private (Manager)
const getPendingReports = async (req, res) => {
    try {
        const { range } = req.query;
        let startDate = new Date();

        // "Daily Pending (Yesterday)" -> Tasks updated since yesterday start
        // "Weekly" -> Last 7 days
        // "Monthly" -> Last 30 days

        if (range === 'day') {
            startDate.setDate(startDate.getDate() - 1); // Go back 1 day
            startDate.setHours(0, 0, 0, 0); // Start of yesterday
        } else if (range === 'week') {
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
        } else if (range === 'month') {
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
        } else {
            // Default to all time or invalid? Let's default to week.
            startDate.setDate(startDate.getDate() - 7);
        }

        const tasks = await Task.find({
            status: { $in: ['pending', 'waiting'] },
            updatedAt: { $gte: startDate }
        }).populate('user', 'name email').sort({ updatedAt: -1 });

        // Group by User
        const userMap = {};

        tasks.forEach(task => {
            const userId = task.user._id.toString();
            if (!userMap[userId]) {
                userMap[userId] = {
                    user: task.user,
                    tasks: []
                };
            }
            userMap[userId].tasks.push({
                text: task.text,
                status: task.status,
                date: task.updatedAt,
                reason: task.blockerReason
            });
        });

        const reportData = Object.values(userMap);
        res.status(200).json(reportData);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Assign a task to an employee (Manager)
// @route   POST /api/tasks/assign
// @access  Private (Manager)
const createAssignedTask = async (req, res) => {
    const { text, userId, deadline } = req.body;

    if (!text || !userId) {
        return res.status(400).json({ message: 'Please add text and select a user.' });
    }

    try {
        const task = await Task.create({
            user: userId, // Assigned to this user
            text: text,
            status: 'pending',
            assignedBy: req.user.id, // Assigned by the manager
            isAssigned: true,
            deadline: deadline || ''
        });

        // We could also notify the user here via WebSocket if implemented
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get specific employee history (Manager)
// @route   GET /api/tasks/user/:userId/history
// @access  Private (Manager)
const getEmployeeHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { range } = req.query; // 'day', 'week', 'month'

        let startDate = new Date();
        if (range === 'day') {
            startDate.setHours(0, 0, 0, 0);
        } else if (range === 'week') {
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
        } else if (range === 'month') {
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate.setDate(startDate.getDate() - 7); // Default to week
        }

        const tasks = await Task.find({
            user: userId,
            updatedAt: { $gte: startDate }
        }).sort({ updatedAt: -1 });

        const historyMap = {};

        tasks.forEach(task => {
            const dateStr = new Date(task.updatedAt).toLocaleDateString();

            if (!historyMap[dateStr]) {
                historyMap[dateStr] = {
                    date: task.updatedAt,
                    completed: [],
                    pending: [],
                    blockers: []
                };
            }

            const item = {
                _id: task._id,
                text: task.text,
                blockerReason: task.blockerReason,
                managerReply: task.managerReply,
                updatedAt: task.updatedAt
            };

            if (task.status === 'completed') {
                historyMap[dateStr].completed.push(item);
            } else if (task.status === 'pending') {
                historyMap[dateStr].pending.push(item);
            } else if (task.status === 'waiting') {
                historyMap[dateStr].blockers.push(item);
            }
        });

        const history = Object.values(historyMap).sort((a, b) => new Date(b.date) - new Date(a.date));
        res.status(200).json(history);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMyTasks,
    createTask,
    updateTask,
    deleteTask,
    getTeamUpdates,
    getMyHistory,
    getPendingReports,
    createAssignedTask,
    getEmployeeHistory
};
