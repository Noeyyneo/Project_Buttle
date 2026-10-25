function requireApprovedRepresentative(req,res,next) {
    if(!req.user) {
        return res.status(401).json({
            success:false,
            message:`Authentication required`
        });
    }
    if(req.user.role !== 'representative') {
        return res.status(403).json({
            success: false,
            message: `representative role account required`
        });
    }
    if(req.user.approvalStatus !== 'approved') {
        return res.status(403).json({
            success:false,
            message:`Representative account is not approved`
        })
    }
    next();
}

module.exports = requireApprovedRepresentative;
