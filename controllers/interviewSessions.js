const mongoose = require('mongoose');
const Company = require('../models/Company');
const InterviewSession = require('../models/InterviewSession');
const InterviewBooking = require('../models/InterviewBooking');
const { BOOKING_STATUSES } = InterviewBooking;
const { validateSessionData } = require('../lib/interviewSessionRules');

const REPRESENTATIVE_STATUSES = BOOKING_STATUSES.filter(status => status !== 'booked');
const SESSION_FIELDS = ['startAt', 'endAt', 'capacity'];

function isRepresentative(req) {
    return req.user?.role === 'representative';
}

function canAccessSession(req, session) {
    if (!isRepresentative(req)) {
        return true;
    }

    const sessionCompanyId = session.companyId?._id || session.companyId;
    const userCompanyId = req.user.companyId?._id || req.user.companyId;

    return sessionCompanyId.toString() === userCompanyId.toString();
}

function sessionData(body, existing = {}) {
    const data = {};

    for (const field of SESSION_FIELDS) {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    }

    return {
        startAt: data.startAt ?? existing.startAt,
        endAt: data.endAt ?? existing.endAt,
        capacity: data.capacity ?? existing.capacity,
        data
    };
}

async function overlapsAnotherSession(companyId, startAt, endAt, sessionId, databaseSession) {
    const query = {
        companyId,
        startAt: { $lt: new Date(endAt) },
        endAt: { $gt: new Date(startAt) }
    };

    if (sessionId) {
        query._id = { $ne: sessionId };
    }

    const overlapQuery = InterviewSession.exists(query);

    if (databaseSession) {
        overlapQuery.session(databaseSession);
    }

    return Boolean(await overlapQuery);
}

function sessionValidationProblem(message) {
    const error = new Error(message);
    error.code = 'SESSION_VALIDATION';
    return error;
}

async function runWithCompanyScheduleLock(companyId, operation) {
    const databaseSession = await mongoose.startSession();

    try {
        let result;

        await databaseSession.withTransaction(async () => {
            const company = await Company.findByIdAndUpdate(
                companyId,
                { $set: { updatedAt: new Date() } },
                { new: false, session: databaseSession }
            );

            if (!company) {
                throw new Error('Company not found');
            }

            result = await operation(databaseSession);
        });

        return result;
    } finally {
        await databaseSession.endSession();
    }
}

function validationError(res, message) {
    return res.status(400).json({ success: false, message });
}

function notFound(res, message = 'Interview session not found') {
    return res.status(404).json({ success: false, message });
}

//@desc Get all interview sessions available to the authenticated user
//@route GET /api/v1/interviewSessions
//@access Private
exports.getInterviewSessions = async (req, res, next) => {
    try {
        const query = isRepresentative(req) ? { companyId: req.user.companyId } : {};
        const sessions = await InterviewSession.find(query).populate({
            path: 'companyId',
            select: 'name address description telephone website'
        });

        res.status(200).json({ success: true, count: sessions.length, data: sessions });
    } catch (err) {
        next(err);
    }
};

//@desc Get one interview session
//@route GET /api/v1/interviewSessions/:id
//@access Private
exports.getInterviewSession = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return notFound(res);
        }

        const session = await InterviewSession.findById(req.params.id).populate({
            path: 'companyId',
            select: 'name address description telephone website'
        });

        if (!session || !canAccessSession(req, session)) {
            return notFound(res);
        }

        res.status(200).json({ success: true, data: session });
    } catch (err) {
        next(err);
    }
};

//@desc Create an interview session for the representative's company
//@route POST /api/v1/interviewSessions
//@access Private/Representative
exports.createInterviewSession = async (req, res, next) => {
    try {
        const { startAt, endAt, capacity } = sessionData(req.body || {});
        const error = validateSessionData({ startAt, endAt, capacity });

        if (error) {
            return validationError(res, error);
        }

        const session = await runWithCompanyScheduleLock(req.user.companyId, async databaseSession => {
            if (await overlapsAnotherSession(req.user.companyId, startAt, endAt, null, databaseSession)) {
                throw sessionValidationProblem('Interview sessions for the same company must not overlap');
            }

            const [createdSession] = await InterviewSession.create([{
                companyId: req.user.companyId,
                startAt,
                endAt,
                capacity
            }], { session: databaseSession });

            return createdSession;
        });

        res.status(201).json({ success: true, data: session });
    } catch (err) {
        if (err.code === 'SESSION_VALIDATION') {
            return validationError(res, err.message);
        }

        next(err);
    }
};

//@desc Update an own-company interview session
//@route PUT /api/v1/interviewSessions/:id
//@access Private/Representative
exports.updateInterviewSession = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return notFound(res);
        }

        const session = await InterviewSession.findById(req.params.id);

        // Make sure representative owns the interview session's company.
        if (!session || !canAccessSession(req, session)) {
            return notFound(res);
        }

        const { startAt, endAt, capacity, data } = sessionData(req.body || {}, session);

        if (Object.keys(data).length === 0) {
            return validationError(res, 'Please provide startAt, endAt or capacity');
        }

        const error = validateSessionData({ startAt, endAt, capacity });

        if (error) {
            return validationError(res, error);
        }

        const updatedSession = await runWithCompanyScheduleLock(session.companyId, async databaseSession => {
            if (await overlapsAnotherSession(session.companyId, startAt, endAt, session._id, databaseSession)) {
                throw sessionValidationProblem('Interview sessions for the same company must not overlap');
            }

            const participantCount = await InterviewBooking.countDocuments({
                sessionId: session._id,
                status: { $ne: 'cancelled' }
            }).session(databaseSession);

            if (capacity < participantCount) {
                throw sessionValidationProblem('Capacity cannot be lower than the current participant count');
            }

            return InterviewSession.findByIdAndUpdate(req.params.id, data, {
                new: true,
                runValidators: true,
                session: databaseSession
            });
        });

        res.status(200).json({ success: true, data: updatedSession });
    } catch (err) {
        if (err.code === 'SESSION_VALIDATION') {
            return validationError(res, err.message);
        }

        next(err);
    }
};

//@desc Delete an own-company interview session
//@route DELETE /api/v1/interviewSessions/:id
//@access Private/Representative
exports.deleteInterviewSession = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return notFound(res);
        }

        const session = await InterviewSession.findById(req.params.id);

        // Make sure representative owns the interview session's company.
        if (!session || !canAccessSession(req, session)) {
            return notFound(res);
        }

        await session.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

//@desc Get candidates for an own-company interview session
//@route GET /api/v1/interviewSessions/:id/candidates
//@access Private/Representative
exports.getSessionCandidates = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return notFound(res);
        }

        const session = await InterviewSession.findById(req.params.id);

        if (!session || !canAccessSession(req, session)) {
            return notFound(res);
        }

        const bookings = await InterviewBooking.find({ sessionId: session._id })
            .populate('userId', 'name telephone email');

        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (err) {
        next(err);
    }
};

//@desc Update a candidate status for an own-company interview session
//@route PATCH /api/v1/interviewSessions/:id/bookings/:bookingId/status
//@access Private/Representative
exports.updateBookingStatus = async (req, res, next) => {
    try {
        const { id, bookingId } = req.params;
        const { status } = req.body || {};

        if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(bookingId)) {
            return notFound(res);
        }

        if (!REPRESENTATIVE_STATUSES.includes(status)) {
            return validationError(res, 'status must be checked_in, completed, cancelled or no_show');
        }

        const session = await InterviewSession.findById(id);

        if (!session || !canAccessSession(req, session)) {
            return notFound(res);
        }

        const update = { status };
        if (status === 'checked_in') {
            update.checkedInAt = new Date();
        }

        const booking = await InterviewBooking.findOneAndUpdate(
            { _id: bookingId, sessionId: session._id },
            { $set: update },
            { new: true, runValidators: true }
        ).populate('userId', 'name telephone email');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Interview booking not found' });
        }

        res.status(200).json({ success: true, data: booking });
    } catch (err) {
        next(err);
    }
};
