const mongoose = require('mongoose');

const BOOKING_STATUSES = [
    'booked',
    'checked_in',
    'completed',
    'cancelled',
    'no_show'
];

const interviewBookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please provide a user']
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession',
        required: [true, 'Please provide an interview session']
    },
    status: {
        type: String,
        enum: BOOKING_STATUSES,
        default: 'booked',
        required: true
    },
    checkedInAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'interviewBookings'
});

interviewBookingSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
interviewBookingSchema.index({ sessionId: 1, status: 1 });
interviewBookingSchema.index({ userId: 1, status: 1 });

const InterviewBooking = mongoose.model('InterviewBooking', interviewBookingSchema);

module.exports = InterviewBooking;
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
