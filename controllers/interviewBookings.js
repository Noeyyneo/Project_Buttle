const mongoose = require('mongoose');
const User = require('../models/User');
const InterviewBooking = require('../models/InterviewBooking');
const InterviewSession = require('../models/InterviewSession');

// Helper to run operations strictly within a MongoDB transaction
async function runInTransaction(operation) {
    const dbSession = await mongoose.startSession();
    try {
        let result;
        await dbSession.withTransaction(async () => {
            result = await operation(dbSession);
        });
        return result;
    } finally {
        await dbSession.endSession();
    }
}

//@desc Get all booking
//@route GET /api/v1/bookings
//@access Private
exports.getInterviewBookings = async (req, res, next) => {
    let query;
    // Normal users can see only their own bookings
    if (req.user.role === 'user') {
        query = InterviewBooking.find({ userId: req.user.id }).populate({
            path: 'sessionId',
            select: 'startAt endAt capacity companyId',
            populate: {
                path: 'companyId',
                select: 'name telephone website'
            }
        });
    } else if (req.user.role === 'representative') {
        const companySessions = await InterviewSession.find({ companyId: req.user.companyId }).select('_id');
        const sessionIds = companySessions.map(s => s._id);

        query = InterviewBooking.find({ sessionId: { $in: sessionIds } }).populate({
            path: 'userId',
            select: 'name email telephone'
        }).populate({
            path: 'sessionId',
            select: 'startAt endAt capacity companyId'
        });
    } else {
        //Admin sees all booking
        query = InterviewBooking.find().populate({
            path: 'userId',
            select: 'name email telephone'
        }).populate({
            path: 'sessionId',
            select: 'startAt endAt capacity companyId'
        });
    }
    try {
        const interviewBookings = await query;
        res.status(200).json({
            success: true,
            count: interviewBookings.length,
            data: interviewBookings
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot find Booking'
        });
    }
};

//@desc Get single booking
//@route GET /api/v1/bookings/:id
//@access Private
exports.getInterviewBooking = async (req, res, next) => {
    try {
        const interviewBooking = await InterviewBooking.findById(req.params.id).populate({
            path: 'sessionId',
            select: 'startAt endAt capacity companyId'
        });

        if (!interviewBooking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Ownership guard: booking owner OR admin
        const bookingOwnerId = interviewBooking.userId?._id || interviewBooking.userId;
        if (bookingOwnerId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: `User ${req.user.id} is not authorized to view this booking`
            });
        }

        res.status(200).json({
            success: true,
            data: interviewBooking
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot find Booking" });
    }
};

//@desc Add booking
//@route POST /api/v1/bookings
//@access Private/User
exports.addInterviewBooking = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId || req.body.sessionId;
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a sessionId'
            });
        }
        const targetUserId = req.user.id;

        const booking = await runInTransaction(async (dbSession) => {
            // Serialize reservations per user to prevent concurrent requests from bypassing the 3-active-booking limit
            const user = await User.findByIdAndUpdate(
                targetUserId,
                { $set: { updatedAt: new Date() } },
                { session: dbSession }
            );

            if (!user) {
                const err = new Error(`User with ID ${targetUserId} not found`);
                err.statusCode = 404;
                throw err;
            }

            const session = await InterviewSession.findById(sessionId).session(dbSession);

            if (!session) {
                const err = new Error(`No session with the id of ${sessionId}`);
                err.statusCode = 404;
                throw err;
            }

            // User cannot have more than 3 active bookings
            const activeBookingCount = await InterviewBooking.countDocuments({
                userId: targetUserId,
                status: { $in: ['booked', 'checked_in'] }
            }).session(dbSession);

            if (activeBookingCount >= 3) {
                const err = new Error('The user with ID ' + targetUserId + ' has already made 3 bookings');
                err.statusCode = 400;
                throw err;
            }

            // Cannot book the same session more than once
            const existingBookingForSession = await InterviewBooking.findOne({
                userId: targetUserId,
                sessionId: session._id,
                status: { $in: ['booked', 'checked_in'] }
            }).session(dbSession);

            if (existingBookingForSession) {
                const err = new Error('You have already booked this interview session');
                err.statusCode = 400;
                throw err;
            }

            // Session capacity limit
            const sessionBookingsCount = await InterviewBooking.countDocuments({
                sessionId: session._id,
                status: { $in: ['booked', 'checked_in'] }
            }).session(dbSession);

            if (sessionBookingsCount >= session.capacity) {
                const err = new Error('This interview session is already at full capacity');
                err.statusCode = 400;
                throw err;
            }

            // Prevent overlapping session times for the same user
            const userActiveBookings = await InterviewBooking.find({
                userId: targetUserId,
                status: { $in: ['booked', 'checked_in'] }
            }).session(dbSession).populate('sessionId');

            const isOverlapping = userActiveBookings.some((b) => {
                if (!b.sessionId) return false;
                return (
                    session.startAt < b.sessionId.endAt &&
                    session.endAt > b.sessionId.startAt
                );
            });

            if (isOverlapping) {
                const err = new Error('This session overlaps with another session you have already booked');
                err.statusCode = 400;
                throw err;
            }

            // Touch session document within transaction to ensure atomic capacity reservation across concurrent requests
            await InterviewSession.findByIdAndUpdate(
                session._id,
                { $set: { updatedAt: new Date() } },
                { session: dbSession }
            );

            const created = await InterviewBooking.create(
                [{
                    userId: targetUserId,
                    sessionId: session._id,
                    status: 'booked'
                }],
                { session: dbSession }
            );

            return created[0];
        });

        res.status(201).json({
            success: true,
            data: booking
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        // Handle unique compound index violation ({ userId, sessionId })
        if (error.code === 11000 || (error.errorResponse && error.errorResponse.code === 11000)) {
            return res.status(400).json({
                success: false,
                message: 'You have already booked this interview session'
            });
        }

        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot create Booking'
        });
    }
};

//@desc Update booking
//@route PUT /api/v1/bookings/:id
//@access Private/User or Admin
exports.updateInterviewBooking = async (req, res, next) => {
    try {
        const reqBody = req.body || {};

        // Status cannot be edited via update endpoint
        if (reqBody.status) {
            return res.status(400).json({
                success: false,
                message: 'Status cannot be updated through this endpoint. Status updates are only allowed via the check-in endpoint.'
            });
        }

        const newSessionId = reqBody.sessionId || reqBody.session_id || reqBody.session || req.params.sessionId;

        if (!newSessionId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a sessionId to update'
            });
        }

        const updatedBooking = await runInTransaction(async (dbSession) => {
            let booking = await InterviewBooking.findById(req.params.id).session(dbSession);

            if (!booking) {
                const err = new Error(`No booking with the id of ${req.params.id}`);
                err.statusCode = 404;
                throw err;
            }

            // Ownership guard (only owner and admin can update)
            const bookingOwnerId = booking.user?._id || booking.userId;
            if (bookingOwnerId.toString() !== req.user.id && req.user.role !== 'admin') {
                const err = new Error(`User ${req.user.id} is not authorized to update this booking`);
                err.statusCode = 403;
                throw err;
            }

            // Serialize reservations per user to prevent concurrent requests from bypassing limits
            await User.findByIdAndUpdate(
                bookingOwnerId,
                { $set: { updatedAt: new Date() } },
                { session: dbSession }
            );

            if (booking.status !== 'booked') {
                const err = new Error(`Booking on status ${booking.status} can not be edited`);
                err.statusCode = 400;
                throw err;
            }

            // Changing session
            const currentSessionId = booking.sessionId?._id?.toString() || booking.sessionId?.toString();
            if (newSessionId && newSessionId.toString() !== currentSessionId) {
                const newSession = await InterviewSession.findById(newSessionId).session(dbSession);

                if (!newSession) {
                    const err = new Error(`No session with the id of ${newSessionId}`);
                    err.statusCode = 404;
                    throw err;
                }

                // Check if user already booked the new session
                const existingBooking = await InterviewBooking.findOne({
                    userId: bookingOwnerId,
                    sessionId: newSession._id,
                    _id: { $ne: booking._id },
                    status: { $in: ['booked', 'checked_in'] }
                }).session(dbSession);

                if (existingBooking) {
                    const err = new Error('You have already booked this interview session');
                    err.statusCode = 400;
                    throw err;
                }

                const newSessionCount = await InterviewBooking.countDocuments({
                    sessionId: newSession._id,
                    status: { $in: ['booked', 'checked_in'] }
                }).session(dbSession);

                if (newSessionCount >= newSession.capacity) {
                    const err = new Error('The new interview session is already at full capacity');
                    err.statusCode = 400;
                    throw err;
                }

                // Check overlap booking
                const otherUserBookings = await InterviewBooking.find({
                    userId: bookingOwnerId,
                    _id: { $ne: booking._id },
                    status: { $in: ['booked', 'checked_in'] }
                }).session(dbSession).populate('sessionId');

                const hasOverlap = otherUserBookings.some((b) => {
                    if (!b.sessionId) return false;
                    return (
                        newSession.startAt < b.sessionId.endAt &&
                        newSession.endAt > b.sessionId.startAt
                    );
                });

                if (hasOverlap) {
                    const err = new Error('The new session overlaps with another session you booked');
                    err.statusCode = 400;
                    throw err;
                }

                await InterviewSession.findByIdAndUpdate(
                    newSession._id,
                    { $set: { updatedAt: new Date() } },
                    { session: dbSession }
                );
            }

            const updateData = {
                sessionId: newSessionId,
                updatedAt: Date.now()
            };

            return await InterviewBooking.findByIdAndUpdate(
                req.params.id,
                updateData,
                { returnDocument: 'after', runValidators: true, session: dbSession }
            ).populate({
                path: 'sessionId',
                select: 'startAt endAt capacity companyId'
            });
        });

        res.status(200).json({
            success: true,
            data: updatedBooking
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        if (error.code === 11000 || (error.errorResponse && error.errorResponse.code === 11000)) {
            return res.status(400).json({
                success: false,
                message: 'You have already booked this interview session'
            });
        }
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Cannot update Booking'
        });
    }
};

exports.deleteInterviewBooking = async (req, res, next) => {
    try {
        const booking = await InterviewBooking.findById(req.params.id);

        if(!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        const bookingOwnerId = booking.userId?._id || booking.userId;
        if(bookingOwnerId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: `User ${req.user.id} is not authorized to delete this booking`
            });
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot delete Booking'
        });
    }
};

//@desc Check in to interview session
//@route PUT /api/v1/bookings/:id/check-in
//@access Private (User / Admin)
exports.checkInInterviewBooking = async (req, res, next) => {
    try {
        const booking = await InterviewBooking.findById(req.params.id).populate('sessionId');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Ownership guard (only booking owner or admin can check in)
        const bookingOwnerId = booking.userId?._id || booking.userId;
        if (bookingOwnerId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: `User ${req.user.id} is not authorized to check in to this booking`
            });
        }

        // Check-in only allows status to be 'checked_in'
        if (req.body?.status && req.body.status !== 'checked_in') {
            return res.status(400).json({
                success: false,
                message: "Check-in only allows updating status to 'checked_in'"
            });
        }

        if (booking.status === 'checked_in') {
            return res.status(400).json({
                success: false,
                message: 'User is already checked in for this booking'
            });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot check in to a cancelled booking'
            });
        }

        if (booking.status === 'completed' || booking.status === 'no_show') {
            return res.status(400).json({
                success: false,
                message: `Cannot check in to a booking that is marked as ${booking.status}`
            });
        }

        const session = booking.sessionId;
        if (!session || !session.startAt || !session.endAt) {
            return res.status(400).json({
                success: false,
                message: 'Associated interview session not found or has invalid timing'
            });
        }

        const windowBeforeMinutes = parseInt(process.env.CHECKIN_WINDOW_BEFORE_MINUTES, 10) || 30;
        const windowStart = new Date(new Date(session.startAt).getTime() - windowBeforeMinutes * 60 * 1000);
        const windowEnd = new Date(session.endAt);

        const reqTime = req.body?.checkInTime || req.body?.currentTime || req.headers['x-mock-time'] || req.query?.currentTime;
        const checkInTime = reqTime ? new Date(reqTime) : new Date();

        if (isNaN(checkInTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format for check-in time'
            });
        }

        if (checkInTime < windowStart) {
            return res.status(400).json({
                success: false,
                message: `Check-in is not open yet. Check-in opens ${windowBeforeMinutes} minutes before session starts (at ${windowStart.toISOString()}).`
            });
        }

        if (checkInTime > windowEnd) {
            return res.status(400).json({
                success: false,
                message: `Check-in window has closed. The session ended at ${windowEnd.toISOString()}.`
            });
        }

        const updatedBooking = await InterviewBooking.findByIdAndUpdate(
            booking._id,
            {
                status: 'checked_in',
                checkedInAt: checkInTime,
                updatedAt: Date.now()
            },
            { returnDocument: 'after', runValidators: true }
        ).populate({
            path: 'sessionId',
            select: 'startAt endAt capacity companyId'
        });

        res.status(200).json({
            success: true,
            message: 'Successfully checked in to interview session',
            data: updatedBooking
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Cannot process check-in'
        });
    }
};
