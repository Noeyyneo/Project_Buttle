const express = require('express');
const { getCompanies, getCompany, createCompany, updateCompany, deleteCompany } = require('../controllers/companies');

const router = express.Router();

const {protect, authorize} = require('../middleware/auth');

router.route('/').get(getCompanies).post(protect, authorize('admin'), createCompany);
router.route('/:id').get(getCompany).put(protect, authorize('admin', 'representative'), updateCompany).delete(protect, authorize('admin'), deleteCompany);

module.exports = router;