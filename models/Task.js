const mongoose = require('mongoose');

const taskSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    text: {
        type: String,
        required: [true, 'Please add a task description']
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'waiting'],
        default: 'pending'
    },
    blockerReason: {
        type: String, // Only required if status is 'waiting'
        default: ''
    },
    managerReply: {
        type: String,
        default: ''
    },
    managerReplyAt: {
        type: Date
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deadline: {
        type: String // We'll store this as a string for flexibility as requested ("time for that work")
    },
    isAssigned: {
        type: Boolean,
        default: false
    }
    // We strictly track when it was created and last updated
}, {
    timestamps: true
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
