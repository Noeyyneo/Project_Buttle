const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a company name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Company name can not be more than 50 characters']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    website: {
        type: String,
        trim: true,
        validate: {
            validator: function (value) {
                if (!value) return true;

                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            message: 'Please provide a valid website URL'
        }
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        trim: true,
        maxlength: [1200, 'Company description can not be more than 1200 characters']
    },
    telephone: {
        type: String,
        required: [true, 'Please add telephone number']
    }
}, {
    timestamps: true,
    collection: 'companies'
});

CompanySchema.virtual('interviewSessions', {
    ref: 'Session',
    localField: '_id',
    foreignField: 'company',
    justOne: false
});

module.exports = mongoose.model('Company', CompanySchema);