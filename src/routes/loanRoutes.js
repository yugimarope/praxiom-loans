const express = require('express');
const router = express.Router();
const LoanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', LoanController.getAllLoans);
router.get('/:id', LoanController.getLoan);
router.post('/application', LoanController.createApplication);
router.post('/application/review', LoanController.reviewApplication);
router.post('/disburse', LoanController.disburseLoan);

module.exports = router;