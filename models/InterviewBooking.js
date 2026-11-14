const mongoose = require('mongoose');
const BookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: mongoose.Schema.ObjectId,
        ref: 'InterviewSession',
        required: true
    },
    status: {
        type: String,
        enum: ['booked', 'checked_in', 'completed', 'cancelled', 'no_show'],
        default: 'booked'
    },
    checkedInAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: null
    }
});
module.exports = mongoose.model('InterviewBooking', BookingSchema);