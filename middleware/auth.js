const jwt = require('jsonwebtoken');
const User = require('../models/User');

//Project routes
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // 2. If no Bearer token, read token from HTTP-only cookie
    if (!token && req.cookies) {
        token = req.cookies.token;
    }

    //Make sure token exists
    if (!token || token === 'none') {
        return res.status(401).json({ success: false, message: 'Not authorize to access this route' });
    }

    try {
        //Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the authenticated user
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found or not authorized'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Not authorize to access this route' });
    }
}

//Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found or not authorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: `User role ${req.user.role} is not authorized to access this route` });
        }
        next();
    }
}