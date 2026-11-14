const test = require('node:test');
const assert = require('node:assert/strict');

const InterviewSession = require('../models/InterviewSession');
const InterviewBooking = require('../models/InterviewBooking');
const {
    createInterviewSession,
    getSessionCandidates,
    updateBookingStatus
} = require('../controllers/interviewSessions');

const companyId = '507f1f77bcf86cd799439011';
const otherCompanyId = '507f1f77bcf86cd799439099';
const sessionId = '507f1f77bcf86cd799439013';
const bookingId = '507f1f77bcf86cd799439014';

function response() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test('session creation always uses the authenticated representative company', async () => {
    const originalExists = InterviewSession.exists;
    const originalCreate = InterviewSession.create;
    const res = response();

    InterviewSession.exists = async () => null;
    InterviewSession.create = async data => data;

    try {
        await createInterviewSession({
            user: { role: 'representative', companyId },
            body: {
                companyId: otherCompanyId,
                startAt: '2022-05-10T09:00:00.000Z',
                endAt: '2022-05-10T09:30:00.000Z',
                capacity: 4
            }
        }, res, assert.fail);

        assert.equal(res.statusCode, 201);
        assert.equal(res.body.data.companyId, companyId);
    } finally {
        InterviewSession.exists = originalExists;
        InterviewSession.create = originalCreate;
    }
});

test('candidate lookup includes the representative company in its session ownership query', async () => {
    const originalFindOne = InterviewSession.findOne;
    const originalFind = InterviewBooking.find;
    const res = response();
    let sessionQuery;

    InterviewSession.findOne = async query => {
        sessionQuery = query;
        return { _id: sessionId };
    };
    InterviewBooking.find = () => ({ populate: async () => [] });

    try {
        await getSessionCandidates({
            user: { role: 'representative', companyId },
            params: { id: sessionId }
        }, res, assert.fail);

        assert.equal(res.statusCode, 200);
        assert.equal(sessionQuery.companyId, companyId);
    } finally {
        InterviewSession.findOne = originalFindOne;
        InterviewBooking.find = originalFind;
    }
});

test('representatives cannot restore a booking to booked status', async () => {
    const res = response();

    await updateBookingStatus({
        user: { role: 'representative', companyId },
        params: { id: sessionId, bookingId },
        body: { status: 'booked' }
    }, res, assert.fail);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /checked_in, completed, cancelled or no_show/);
});
