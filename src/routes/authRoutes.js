const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/login', AuthController.login);
router.post('/change-password', authMiddleware, AuthController.changePassword);

module.exports = router;