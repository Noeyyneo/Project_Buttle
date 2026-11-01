const express = require('express');

const { getInterviewSessions, getInterviewSession } = require('../controllers/interviewSessions');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');


router.route('/')
    .get(protect, getInterviewSessions)
router.route('/:id')
    .get(protect, getInterviewSession)

module.exports = router;