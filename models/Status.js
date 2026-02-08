const mongoose = require('mongoose');

const statusSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    date: {
        type: Date,
        default: Date.now,
    },
    completed: [{
        type: String,
    }],
    pending: [{
        type: String,
    }],
    blockers: [{
        type: String,
    }],
}, {
    timestamps: true,
});

const Status = mongoose.model('Status', statusSchema);

module.exports = Status;
