function companyOwnership(req,res,next) {
    if(!req.user?.companyId) {
        return res.status(403).json({
            success: false,
            message: `company access is required`
        });
    }
    if(req.user.companyId.toString() !== req.params.companyId) {
        return res.status(403).json({
            success:false,
            message: `no permission to access other company`
        });
    }
    next();
}

module.exports = companyOwnership;