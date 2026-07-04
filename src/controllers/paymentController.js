const db = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const LoanCalculator = require('../utils/loanCalculator');
const whatsappService = require('../services/whatsappService');

class PaymentController {
  // Record payment
  static async recordPayment(req, res) {
    try {
      const { loanId, amountPaid, paymentMethod } = req.body;

      if (!loanId || !amountPaid) {
        return res.status(400).json({
          success: false,
          message: 'Loan ID and payment amount are required'
        });
      }

      const loan = await db.getAsync(
        'SELECT * FROM loans WHERE loan_id = ?',
        [loanId]
      );

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      // Calculate payment breakdown
      const paymentBreakdown = LoanCalculator.calculatePartialPayment(loan, amountPaid);

      const paymentId = 'PAY-' + uuidv4();
      const receiptNumber = 'RCP-' + Date.now();

      // Record payment
      await db.runAsync(
        `INSERT INTO payments (payment_id, loan_id, amount_paid, payment_method, receipt_number)
         VALUES (?, ?, ?, ?, ?)`,
        [paymentId, loanId, amountPaid, paymentMethod || 'cash', receiptNumber]
      );

      // Update loan
      await db.runAsync(
        `UPDATE loans 
         SET amount_paid = amount_paid + ?, outstanding_balance = ?, status = ?
         WHERE loan_id = ?`,
        [
          amountPaid,
          paymentBreakdown.newOutstandingBalance,
          paymentBreakdown.newOutstandingBalance === 0 ? 'completed' : 
          paymentBreakdown.newOutstandingBalance < loan.total_repayable ? 'partially_paid' : 'active',
          loanId
        ]
      );

      // Add to treasury
      const treasury = await db.getAsync(
        'SELECT running_balance FROM company_treasury ORDER BY date DESC LIMIT 1'
      );

      const newBalance = treasury.running_balance + amountPaid;

      await db.runAsync(
        `INSERT INTO company_treasury (transaction_id, type, amount, description, running_balance, linked_loan_id)
         VALUES (?, 'payment', ?, ?, ?, ?)`,
        [
          'TXN-' + Date.now(),
          amountPaid,
          `Payment received: ${receiptNumber}`,
          newBalance,
          loanId
        ]
      );

      // Send WhatsApp receipt
      const client = await db.getAsync(
        'SELECT phone_number FROM clients WHERE client_id = (SELECT client_id FROM loans WHERE loan_id = ?)',
        [loanId]
      );

      if (client) {
        await whatsappService.sendPaymentReceipt(
          client.phone_number,
          loanId,
          amountPaid,
          paymentBreakdown.newOutstandingBalance
        );

        // Mark receipt as sent
        await db.runAsync(
          'UPDATE payments SET whatsapp_receipt_sent = 1 WHERE payment_id = ?',
          [paymentId]
        );

        // If loan completed, send completion message
        if (paymentBreakdown.newOutstandingBalance === 0) {
          await whatsappService.sendLoanCompleted(client.phone_number, loanId);
        }
      }

      res.json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
          paymentId,
          receiptNumber,
          newOutstandingBalance: paymentBreakdown.newOutstandingBalance,
          newTreasuryBalance: newBalance
        }
      });
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get payments for a loan
  static async getLoanPayments(req, res) {
    try {
      const payments = await db.allAsync(
        'SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date DESC',
        [req.params.loanId]
      );

      res.json({
        success: true,
        count: payments.length,
        data: payments
      });
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = PaymentController;