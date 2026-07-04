const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/dashboard', ReportController.getDashboard);
router.get('/monthly', ReportController.getMonthlyReport);
router.get('/portfolio-health', ReportController.getPortfolioHealth);

module.exports = router;