const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', PaymentController.recordPayment);
router.get('/loan/:loanId', PaymentController.getLoanPayments);

module.exports = router;