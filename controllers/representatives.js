const mongoose = require('mongoose');

const User = require('../models/User');
const Company = require('../models/Company');

const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

//@desc Get all representative accounts
//@route GET /api/v1/admin/representatives
//@access Private/Admin
exports.getRepresentatives = async (req, res, next) => {
    try {
        const representatives = await User.find({ role: 'representative' })
            .select('-tokenVersion')
            .populate('companyId', 'name');

        res.status(200).json({
            success: true,
            count: representatives.length,
            data: representatives
        });
    } catch (err) {
        next(err);
    }
};

//@desc Get a representative account
//@route GET /api/v1/admin/representatives/:id
//@access Private/Admin
exports.getRepresentative = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({
                success: false,
                msg: `No representative with the id of ${req.params.id}`
            });
        }

        const representative = await User.findOne({
            _id: req.params.id,
            role: 'representative'
        })
            .select('-tokenVersion')
            .populate('companyId', 'name');

        if (!representative) {
            return res.status(404).json({
                success: false,
                msg: `No representative with the id of ${req.params.id}`
            });
        }

        res.status(200).json({
            success: true,
            data: representative
        });
    } catch (err) {
        next(err);
    }
};

//@desc Update a representative account
//@route PUT /api/v1/admin/representatives/:id
//@access Private/Admin
exports.updateRepresentative = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({
                success: false,
                msg: `No representative with the id of ${req.params.id}`
            });
        }

        const { approvalStatus, companyId, rejectionReason } = req.body || {};

        if (
            approvalStatus === undefined &&
            companyId === undefined &&
            rejectionReason === undefined
        ) {
            return res.status(400).json({
                success: false,
                msg: 'Please provide approvalStatus, companyId or rejectionReason'
            });
        }

        if (
            approvalStatus !== undefined &&
            !APPROVAL_STATUSES.includes(approvalStatus)
        ) {
            return res.status(400).json({
                success: false,
                msg: 'approvalStatus must be pending, approved or rejected'
            });
        }

        if (
            rejectionReason !== undefined &&
            rejectionReason !== null &&
            typeof rejectionReason !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                msg: 'rejectionReason must be a string'
            });
        }

        const normalizedRejectionReason =
            typeof rejectionReason === 'string'
                ? rejectionReason.trim() || null
                : null;

        if (companyId !== undefined) {
            if (!mongoose.isValidObjectId(companyId)) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid companyId'
                });
            }

            const company = await Company.findById(companyId);

            if (!company) {
                return res.status(404).json({
                    success: false,
                    msg: `No company with the id of ${companyId}`
                });
            }
        }

        const representative = await User.findOne({
            _id: req.params.id,
            role: 'representative'
        });

        if (!representative) {
            return res.status(404).json({
                success: false,
                msg: `No representative with the id of ${req.params.id}`
            });
        }

        const updateData = {};

        if (companyId !== undefined) {
            updateData.companyId = companyId;
        }

        const statusChanged =
            approvalStatus !== undefined &&
            representative.approvalStatus !== approvalStatus;

        if (approvalStatus !== undefined) {

            updateData.approvalStatus = approvalStatus;
            updateData.reviewedAt =
                approvalStatus === 'pending' ? null : new Date();
            updateData.rejectionReason =
                approvalStatus === 'rejected'
                    ? normalizedRejectionReason
                    : null;

        } else if (rejectionReason !== undefined) {
            if (representative.approvalStatus !== 'rejected') {
                return res.status(400).json({
                    success: false,
                    msg: 'rejectionReason can be updated only for a rejected representative'
                });
            }

            updateData.rejectionReason = normalizedRejectionReason;
        }

        const updateOperation = { $set: updateData };

        if (statusChanged) {
            updateOperation.$inc = { tokenVersion: 1 };
        }

        const updatedRepresentative = await User.findOneAndUpdate(
            {
                _id: req.params.id,
                role: 'representative'
            },
            updateOperation,
            {
                new: true,
                runValidators: true
            }
        )
            .select('-tokenVersion')
            .populate('companyId', 'name');

        res.status(200).json({
            success: true,
            data: updatedRepresentative
        });
    } catch (err) {
        next(err);
    }
};
