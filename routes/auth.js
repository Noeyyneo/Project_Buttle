const express = require('express');

const { register, createAdmin, login, getMe, logout } = require('../controllers/auth');

const router = express.Router();

const {protect, authorize} = require('../middleware/auth');

router.post('/register', register);
router.post('/admins', protect, authorize('admin'), createAdmin);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;