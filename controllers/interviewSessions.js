const InterviewSession = require('../models/InterviewSession');
const Company = require('../models/Company');

//@desc Get all session
//@route GET /api/v1/sessions
//@access Public
exports.getInterviewSessions = async (req, res, next) => {
    try {
    const sessions = await InterviewSession.find().populate({
            path: 'companyId',
            select: 'name address description telephone website'
        });

        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: 'Cannot find Session'
        })
    }
};

//@desc Get single session
//@route GET /api/v1/session/:id
//@access Public
exports.getInterviewSession = async (req, res, next) => {
    try {
        const session = await InterviewSession.findById(req.params.id).populate({
            path: 'companyId',
            select: 'name address description telephone website'
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                msg: `No session with the id of ${req.params.id}`
            });
        }
        res.status(200).json({
            success: true,
            data: session
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: 'Cannot find Session'
        });
    }
};
