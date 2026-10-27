const User = require('../models/User');
const Company = require('../models/Company');

//@desc Register user
//@route POST /api/v1/auth/register
//@access Public
exports.register = async (req, res, next) => {
    try {
        const {
            name,
            telephone,
            email,
            password,
            role,
            companyId
        } = req.body;
        //Validate required fields
        if (!name || !telephone || !email || !password) {
            return res.status(400).json({
                success: false,
                msg: 'Please provide name, telephone, email and password'
            });
        }

        //Only allow public registration for user and representative roles
        if (role && !['user', 'representative'].includes(role)) {
            return res.status(400).json({
                success: false,
                msg: 'Invalid role for public registration'
            });
        }
        const assignedRole = role || 'user';

        //Validate company for representative
        if (assignedRole === 'representative') {
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    msg: 'Representative must have companyId'
                });
            }
            const company = await Company.findById(companyId);

            if (!company) {
                return res.status(400).json({
                    success: false,
                    msg: 'company not founded'
                });
            }
        }
        //Normal user cannot have companyId
        if (assignedRole === 'user' && companyId) {
            return res.status(400).json({
                success: false,
                msg: 'Only representatives can have company'
            });
        }
        const normalizedEmail = email.trim().toLowerCase();

        // Check whether the email already exists
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        //Check duplicate email
        if (existingUser) {
            return res.status(400).json({
                success: false,
                msg: 'Email is already registered'
            });
        }

        //Build user data
        const userData = {
            name,
            telephone,
            email: normalizedEmail,
            passwordHash: password,
            role: assignedRole
        };

        if (assignedRole === 'representative') {
            userData.companyId = companyId,
                userData.approvalStatus = 'pending';
        }

        const user = await User.create(userData);

        sendTokenResponse(user, 201, res);

    } catch (err) {
        if (err.name === 'ValidationError') {
            for (const field in err.errors) {
                console.error(err.errors[field].message);
            }
        } else {
            console.error(err.message);
        }

        return res.status(400).json({
            success: false,
            msg: err.message
        });
    }
};

//@desc Create an admin account
//@route POST /api/v1/auth/admins
//@access Private/Admin
exports.createAdmin = async (req, res, next) => {
    try {
        const { name, telephone, email, password } = req.body;

        if(!name || !telephone || !email || !password) {
            return res.status(400).json({
                success: false,
                msg: 'Please provide name, telephone, email and password'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if(existingUser) {
            return res.status(400).json({
                success: false,
                msg: 'Email is already registered'
            });
        }

        const user = await User.create({
            name,
            telephone,
            email: normalizedEmail,
            passwordHash: password,
            role: 'admin'
        });

        res.status(201).json({
            success: true,
            msg: 'Admin account created successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        next (err);
    }
};

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    //Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }
    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token
    })
}

//@desc Login user
//@route POST /api/v1/auth/login
//@access Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        // Validate email and password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                msg: 'Please provide an email and password'
            });
        }

        // Check for user
        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        }).select('+passwordHash');

        if (!user) {
            return res.status(401).json({
                success: false,
                msg: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                msg: 'Invalid credentials'
            });
        }

        // Representatives can log in only after approval
        if (
            user.role === 'representative' &&
            user.approvalStatus !== 'approved'
        ) {
            return res.status(403).json({
                success: false,
                msg: 'Your representative account has not been approved'
            });
        }

        // Send token if credentials are valid
        sendTokenResponse(user, 200, res);

    } catch (err) {
        next(err);
    }

};

//@desc Logout user
//@route POST /api/v1/auth/Logout
//@access Private
exports.logout = async (req, res, next) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });

    res.status(200).json({
        success: true,
        msg: 'User logged out successfully'
    })
}

//@desc Get current Logged in user
//@route POST /api/v1/auth/me
//@access Private
exports.getMe = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        data: user
    });
}