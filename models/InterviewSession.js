const mongoose = require('mongoose');

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
            validator: function (value) {
                const start = new Date('2022-05-10T00:00:00.000Z');
                const end = new Date('2022-05-14T00:00:00.000Z');

                return value >= start && value < end;
            },
            msg: 'Start time must fall within May 10-13, 2022'
        }
    },
    endAt: {
        type: Date,
        required: [true, 'Please add end date and time'],
        validate: [
            {
                validator: function (value) {
                    const start = new Date('2022-05-10T00:00:00.000Z');
                    const end = new Date('2022-05-14T00:00:00.000Z');

                    return value >= start && value < end;
                },
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
        required: [true, 'Please add a capacity']
    }
}, {
    timestamps: true,
    collection: 'interviewSessions'
});

// Recommended index for querying sessions by company and start time
SessionSchema.index({ companyId: 1, startAt: 1 });

module.exports = mongoose.model('InterviewSession', SessionSchema);