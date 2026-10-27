const Company = require('../models/Company');
const Session = require('../models/InterviewSession');

exports.getCompanies = async (req, res, next) => {
    try {
        const companies = await Company.find();

        res.status(200).json({
            success: true,
            count: companies.length,
            data: companies
        });
    } catch (err) {
        res.status(400).json({ success: false });
    }
}

//GET
exports.getCompany = async (req, res, next) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({
                success: false,
                msg: 'Company not found'
            });
        }

        res.status(200).json({ success: true, data: company });
    } catch (err) {
        res.status(400).json({ success: false });
    }
}

//POST
exports.createCompany = async (req, res, next) => {
    try {
        const company = await Company.create(req.body);
        res.status(201).json({
            success: true,
            data: company,
            msg: 'Creation succesfully'
        })
    } catch (err) {
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(
                error => error.message
            );

            return res.status(400).json({
                success: false,
                msg: error.join(', ')
            });
        }
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                msg: 'A company with this name already exists'
            });
        }
        next(err);
    }
};

//PUT
exports.updateCompany = async (req, res, next) => {
    try {
        const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!company) {
            return res.status(400).json({
                success: false,
                msg: 'Company not found'
            });
        }

        res.status(200).json({
            success: true,
            data: company
        });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//DELETE
exports.deleteCompany = async (req, res, next) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(400).json({
                success: false,
                msg: `Company not found with id of ${req.params.id}`
            });
        }
        await Session.deleteMany({ company: req.params.id });
        await Company.deleteOne({ _id: req.params.id });
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false });
    }
}