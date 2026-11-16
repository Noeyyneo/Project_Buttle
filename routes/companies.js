const express = require('express');
const { getCompanies, getCompany, createCompany, updateCompany, deleteCompany } = require('../controllers/companies');

const router = express.Router();

const {protect, authorize} = require('../middleware/auth');
const requireApprovedRepresentative = require('../middleware/requireApprovedRepresentative');
const companyOwnership = require('../middleware/companyOwnership');
const interviewSessionRouter = require('./interviewSessions');

// Re-route into other resource routers
router.use('/:companyId/interviewSessions', interviewSessionRouter);

router.route('/').get(getCompanies).post(protect, authorize('admin'), createCompany);
router.route('/:id')
    .get(getCompany)
    .put(
        protect,
        authorize('admin', 'representative'),
        requireApprovedRepresentative,
        companyOwnership('id'),
        updateCompany
    )
    .delete(protect, authorize('admin'), deleteCompany);

module.exports = router;
