const mongoose = require('mongoose');
const { isEventDate } = require('../lib/interviewSessionRules');

const SessionSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'Please provide a company']
    },
    startAt: {
        type: Date,
        required: [true, 'Please add start date and time'],
        validate: {
            validator: isEventDate,
            msg: 'Start time must fall within May 10-13, 2022'
        }
    },
    endAt: {
        type: Date,
        required: [true, 'Please add end date and time'],
        validate: [
            {
                validator: isEventDate,
                msg: 'End time must fall within May 10-13, 2022'
            }, {
                validator: function (value) {
                    return value > this.startAt;
                },
                msg: 'End time must be later than start time'
            }
        ]
    },
    capacity: {
        type: Number,
        required: [true, 'Please add a capacity'],
        validate: {
            validator: Number.isInteger,
            msg: 'Capacity must be a positive integer'
        },
        min: [1, 'Capacity must be a positive integer']
    }
}, {
    timestamps: true,
    collection: 'interviewSessions'
});

// Recommended index for querying sessions by company and start time
SessionSchema.index({ companyId: 1, startAt: 1 });

module.exports = mongoose.model('InterviewSession', SessionSchema);
