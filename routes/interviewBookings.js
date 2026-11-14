const express = require('express');

const {
    getInterviewBookings,
    getInterviewBooking,
    addInterviewBooking,
    updateInterviewBooking,
    deleteInterviewBooking,
    checkInInterviewBooking
} = require('../controllers/interviewBookings');

const router = express.Router({mergeParams: true});

const {protect, authorize} = require('../middleware/auth');

router.route('/')
    .get(protect, getInterviewBookings)
    .post(protect, authorize('user'), addInterviewBooking);

// Check-in endpoints for registered users (and admin)
router.route('/:id/check-in')
    .put(protect, authorize('admin', 'user'), checkInInterviewBooking);

router.route('/:id/checkin')
    .put(protect, authorize('admin', 'user'), checkInInterviewBooking);

router.route('/:id')
    .get(protect, getInterviewBooking)
    .put(protect, authorize('admin', 'user'), updateInterviewBooking)
    .delete(protect, authorize('admin', 'user'), deleteInterviewBooking);

module.exports = router;
