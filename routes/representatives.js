const express = require('express');

const {
    getRepresentatives,
    getRepresentative,
    updateRepresentative
} = require('../controllers/representatives');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.route('/')
    .get(getRepresentatives);

router.route('/:id')
    .get(getRepresentative)
    .put(updateRepresentative);

module.exports = router;
