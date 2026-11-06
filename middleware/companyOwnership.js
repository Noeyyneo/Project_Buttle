function companyOwnership(paramName = 'companyId') {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.role === 'admin') {
            return next();
        }

        if (!req.user.companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company access is required'
            });
        }

        const requestedCompanyId = req.params?.[paramName];

        if (!requestedCompanyId) {
            return res.status(400).json({
                success: false,
                message: `Missing route parameter: ${paramName}`
            });
        }

        if (req.user.companyId.toString() !== requestedCompanyId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'No permission to access another company'
            });
        }

        next();
    };
}

module.exports = companyOwnership;
