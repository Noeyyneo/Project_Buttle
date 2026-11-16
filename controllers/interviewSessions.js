const mongoose = require('mongoose');
const Company = require('../models/Company');
const InterviewSession = require('../models/InterviewSession');
const InterviewBooking = require('../models/InterviewBooking');
const { validateSessionData } = require('../lib/interviewSessionRules');

const REPRESENTATIVE_STATUSES = ['checked_in', 'completed', 'cancelled', 'no_show'];
const SESSION_FIELDS = ['startAt', 'endAt', 'capacity'];

function canAccessSession(req, session) {
    if (req.user.role !== 'representative') {
        return true;
    }

    const sessionCompanyId = session.companyId?._id || session.companyId;
    const userCompanyId = req.user.companyId?._id || req.user.companyId;

    if (!sessionCompanyId || !userCompanyId) {
        return false;
    }

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

function notFoundProblem(message) {
    const error = new Error(message);
    error.code = 'SESSION_NOT_FOUND';
    return error;
}

async function runWithCompanyScheduleLock(companyId, operation) {
    const databaseSession = await mongoose.startSession();

    try {
        let result;

        await databaseSession.withTransaction(async () => {
            // A company write is the shared lock for its representatives' schedules.
            const company = await Company.findByIdAndUpdate(
                companyId,
                { $set: { updatedAt: new Date() } },
                { new: false, session: databaseSession }
            );

            if (!company) {
                throw notFoundProblem('Company not found');
            }

            result = await operation(databaseSession);
        });

        return result;
    } finally {
        await databaseSession.endSession();
    }
}

async function runWithSessionBookingLock(sessionId, operation) {
    const databaseSession = await mongoose.startSession();

    try {
        let result;

        await databaseSession.withTransaction(async () => {
            const session = await InterviewSession.findByIdAndUpdate(
                sessionId,
                { $set: { updatedAt: new Date() } },
                { new: true, session: databaseSession }
            );

            if (!session) {
                throw notFoundProblem();
            }

            result = await operation(session, databaseSession);
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

function forbidden(res, message = 'No permission to access another company') {
    return res.status(403).json({ success: false, message });
}

//@desc Get all interview sessions available to the authenticated user
//@route GET /api/v1/interviewSessions
//@route GET /api/v1/companies/:companyId/interviewSessions
//@access Private
exports.getInterviewSessions = async (req, res, next) => {
    try {
        let query;

        if (req.user.role === 'representative') {
            query = InterviewSession.find({ companyId: req.user.companyId });
        } else if (req.params.companyId) {
            query = InterviewSession.find({ companyId: req.params.companyId });
        } else {
            query = InterviewSession.find();
        }

        const sessions = await query.populate({
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
//@route GET /api/v1/companies/:companyId/interviewSessions/:id
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

        if (!session) {
            return notFound(res);
        }

        // Make sure the interview session belongs to the company in the URL.
        const sessionCompanyId = session.companyId?._id || session.companyId;
        if (
            req.params.companyId &&
            sessionCompanyId.toString() !== req.params.companyId.toString()
        ) {
            return notFound(res);
        }

        // Make sure representative owns the interview session's company.
        if (!canAccessSession(req, session)) {
            return forbidden(res);
        }

        res.status(200).json({ success: true, data: session });
    } catch (err) {
        next(err);
    }
};

//@desc Create an interview session for the representative's company
//@route POST /api/v1/interviewSessions
//@route POST /api/v1/companies/:companyId/interviewSessions
//@access Private/Representative
exports.createInterviewSession = async (req, res, next) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;

        if (
            req.params.companyId &&
            req.params.companyId.toString() !== req.user.companyId.toString()
        ) {
            return notFound(res, 'Company not found');
        }

        const { startAt, endAt, capacity } = sessionData(req.body || {});
        const error = validateSessionData({ startAt, endAt, capacity });

        if (error) {
            return validationError(res, error);
        }

        const session = await runWithCompanyScheduleLock(companyId, async databaseSession => {
            if (await overlapsAnotherSession(companyId, startAt, endAt, null, databaseSession)) {
                throw sessionValidationProblem('Interview sessions for the same company must not overlap');
            }

            const [createdSession] = await InterviewSession.create([{
                companyId,
                startAt,
                endAt,
                capacity
            }], { session: databaseSession });

            return createdSession;
        });

        await session.populate({
            path: 'companyId',
            select: 'name address description telephone website'
        });

        res.status(201).json({ success: true, data: session });
    } catch (err) {
        if (err.code === 'SESSION_VALIDATION') {
            return validationError(res, err.message);
        }

        if (err.code === 'SESSION_NOT_FOUND') {
            return notFound(res, err.message);
        }

        next(err);
    }
};

//@desc Update an own-company interview session
//@route PUT /api/v1/interviewSessions/:id
//@route PUT /api/v1/companies/:companyId/interviewSessions/:id
//@access Private/Representative
exports.updateInterviewSession = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return notFound(res);
        }

        let session = await InterviewSession.findById(req.params.id);

        if (!session) {
            return notFound(res);
        }

        // Make sure the interview session belongs to the company in the URL.
        if (
            req.params.companyId &&
            session.companyId.toString() !== req.params.companyId.toString()
        ) {
            return notFound(res);
        }

        // Make sure representative owns the interview session's company.
        if (!canAccessSession(req, session)) {
            return forbidden(res);
        }

        const { startAt, endAt, capacity, data } = sessionData(req.body || {}, session);

        if (Object.keys(data).length === 0) {
            return validationError(res, 'Please provide startAt, endAt or capacity');
        }

        const error = validateSessionData({ startAt, endAt, capacity });

        if (error) {
            return validationError(res, error);
        }

        session = await runWithCompanyScheduleLock(session.companyId, async databaseSession => {
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

        await session.populate({
            path: 'companyId',
            select: 'name address description telephone website'
        });

        res.status(200).json({ success: true, data: session });
    } catch (err) {
        if (err.code === 'SESSION_VALIDATION') {
            return validationError(res, err.message);
        }

        if (err.code === 'SESSION_NOT_FOUND') {
            return notFound(res, err.message);
        }

        next(err);
    }
};

//@desc Delete an own-company interview session
//@route DELETE /api/v1/interviewSessions/:id
//@route DELETE /api/v1/companies/:companyId/interviewSessions/:id
//@access Private/Representative
exports.deleteInterviewSession = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return notFound(res);
        }

        const session = await InterviewSession.findById(req.params.id);

        if (!session) {
            return notFound(res);
        }

        // Make sure the interview session belongs to the company in the URL.
        if (
            req.params.companyId &&
            session.companyId.toString() !== req.params.companyId.toString()
        ) {
            return notFound(res);
        }

        // Make sure representative owns the interview session's company.
        if (!canAccessSession(req, session)) {
            return forbidden(res);
        }

        await runWithCompanyScheduleLock(session.companyId, async databaseSession => {
            await InterviewBooking.updateMany(
                { sessionId: session._id, status: { $ne: 'cancelled' } },
                { $set: { status: 'cancelled', checkedInAt: null } },
                { session: databaseSession }
            );

            await session.deleteOne({ session: databaseSession });
        });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        if (err.code === 'SESSION_NOT_FOUND') {
            return notFound(res, err.message);
        }

        next(err);
    }
};

//@desc Get candidates for an own-company interview session
//@route GET /api/v1/interviewSessions/:id/candidates
//@route GET /api/v1/companies/:companyId/interviewSessions/:id/candidates
//@access Private/Representative
exports.getSessionCandidates = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return notFound(res);
        }

        const session = await InterviewSession.findById(req.params.id);

        if (!session) {
            return notFound(res);
        }

        // Make sure the interview session belongs to the company in the URL.
        if (
            req.params.companyId &&
            session.companyId.toString() !== req.params.companyId.toString()
        ) {
            return notFound(res);
        }

        // Make sure representative owns the interview session's company.
        if (!canAccessSession(req, session)) {
            return forbidden(res);
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
//@route PATCH /api/v1/companies/:companyId/interviewSessions/:id/bookings/:bookingId/status
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

        if (!session) {
            return notFound(res);
        }

        // Make sure the interview session belongs to the company in the URL.
        if (
            req.params.companyId &&
            session.companyId.toString() !== req.params.companyId.toString()
        ) {
            return notFound(res);
        }

        // Make sure representative owns the interview session's company.
        if (!canAccessSession(req, session)) {
            return forbidden(res);
        }

        const booking = await runWithSessionBookingLock(session._id, async (lockedSession, databaseSession) => {
            const existingBooking = await InterviewBooking.findOne({
                _id: bookingId,
                sessionId: lockedSession._id
            }).session(databaseSession);

            if (!existingBooking) {
                throw notFoundProblem('Interview booking not found');
            }

            if (existingBooking.status === 'cancelled' && status !== 'cancelled') {
                const participantCount = await InterviewBooking.countDocuments({
                    sessionId: lockedSession._id,
                    _id: { $ne: existingBooking._id },
                    status: { $ne: 'cancelled' }
                }).session(databaseSession);

                if (participantCount >= lockedSession.capacity) {
                    throw sessionValidationProblem('Interview session is already at full capacity');
                }
            }

            existingBooking.status = status;
            if (status === 'checked_in') {
                existingBooking.checkedInAt = new Date();
            } else if (status === 'cancelled' || status === 'no_show') {
                existingBooking.checkedInAt = null;
            }

            await existingBooking.save({ session: databaseSession });
            return existingBooking.populate('userId', 'name telephone email');
        });

        res.status(200).json({ success: true, data: booking });
    } catch (err) {
        if (err.code === 'SESSION_VALIDATION') {
            return validationError(res, err.message);
        }

        if (err.code === 'SESSION_NOT_FOUND') {
            return notFound(res, err.message);
        }

        next(err);
    }
};
