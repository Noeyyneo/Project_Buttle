function requireApprovedRepresentative(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Admins are not representative accounts and do not require approval.
    if (req.user.role === 'admin') {
        return next();
    }

    if (req.user.role !== 'representative') {
        return res.status(403).json({
            success: false,
            message: 'Representative role account required'
        });
    }

    if (req.user.approvalStatus !== 'approved') {
        return res.status(403).json({
            success: false,
            message: 'Representative account is not approved'
        });
    }

    next();
}

module.exports = requireApprovedRepresentative;
