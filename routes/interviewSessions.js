const express = require('express');
const {
    getInterviewSessions,
    getInterviewSession,
    createInterviewSession,
    updateInterviewSession,
    deleteInterviewSession,
    getSessionCandidates,
    updateBookingStatus
} = require('../controllers/interviewSessions');
const { protect, authorize } = require('../middleware/auth');
const requireApprovedRepresentative = require('../middleware/requireApprovedRepresentative');

const router = express.Router({ mergeParams: true });

router.route('/')
    .get(protect, getInterviewSessions)
    .post(protect, authorize('representative'), requireApprovedRepresentative, createInterviewSession);

router.route('/:id/candidates')
    .get(protect, authorize('representative'), requireApprovedRepresentative, getSessionCandidates);

router.route('/:id/bookings/:bookingId/status')
    .patch(protect, authorize('representative'), requireApprovedRepresentative, updateBookingStatus);

router.route('/:id')
    .get(protect, getInterviewSession)
    .put(protect, authorize('representative'), requireApprovedRepresentative, updateInterviewSession)
    .delete(protect, authorize('representative'), requireApprovedRepresentative, deleteInterviewSession);

module.exports = router;
