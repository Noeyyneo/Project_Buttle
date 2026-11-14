const test = require('node:test');
const assert = require('node:assert/strict');

const InterviewSession = require('../models/InterviewSession');
const InterviewBooking = require('../models/InterviewBooking');

const companyId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const sessionId = '507f1f77bcf86cd799439013';

test('interview sessions require a positive integer capacity', async () => {
    const session = new InterviewSession({
        companyId,
        startAt: '2022-05-10T09:00:00.000Z',
        endAt: '2022-05-10T09:30:00.000Z',
        capacity: 0
    });

    await assert.rejects(session.validate(), error => Boolean(error.errors.capacity));
});

test('interview bookings default to booked and only allow course-specified statuses', async () => {
    const booking = new InterviewBooking({ userId, sessionId });

    assert.equal(booking.status, 'booked');

    booking.status = 'not-a-real-status';
    await assert.rejects(booking.validate(), error => Boolean(error.errors.status));
});
