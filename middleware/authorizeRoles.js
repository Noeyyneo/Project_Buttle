function authorizeRoles(...allowedRoles) {
    return function (req,res,next) {
        if(!req.user) { // user didn't login yet
            return res.status(401).json({
                success:false,
                message: `Authentication required`
            });
        }
        if(!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ // user's role is not allowed to view this path
                success:false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    }
};
module.exports = authorizeRoles;
