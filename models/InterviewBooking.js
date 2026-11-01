const mongoose = require('mongoose');

const interviewBookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    session: {
        type: mongoose.Schema.ObjectId,
        ref: 'InterviewSession',
        required: true
    },
    
})