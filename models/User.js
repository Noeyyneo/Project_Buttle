const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    telephone: {
        type: String,
        required: [true, 'Please add a telephone number'],
        unique: true,
        match: [
            /^0[0-9]{9}$/,
            'Please add a valid phone number'
        ]
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please add a valid email'
        ]
    },
    passwordHash: {
        type: String,
        required: [true, 'Please add a password'],
        minlenght: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'representative'],
        default: 'user'
    },
    companyID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: function () {
            return this.role === 'representative';
        },
        validate: {
            validator: function (value) {
                return this.role === 'representative' || value == null;
            },
            message: 'Only representatives can have a company'
        }
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        required: function (){
            return this.role === 'representative';
        },
        validate: {
            validator: function (value) {
                return this.role === 'representative' || value == null;
            },
            message: 'Only representative can have a approval status'
        }
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        trim: true,
        default: null,
        required: function () {
            return this.role === 'representative' && this.approvalStatus === 'rejected';
        },
        validate: {
            validator: function (value) {
                return this.role === 'representative' || value == null;
            },
            message: 'Only representatives can have rejection reason'
        }
    }
},{
    timestamps: true,
    collection: 'users'
});

//Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

//Sign JWT and return
UserSchema.methods.getSignedJwtToken = function (){
    return jwt.sign({id: this._id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
}

//Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.passwordHash);
}

module.exports = mongoose.model('User', UserSchema);