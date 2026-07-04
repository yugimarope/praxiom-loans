const db = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const LoanCalculator = require('../utils/loanCalculator');
const whatsappService = require('../services/whatsappService');

class LoanController {
  // Get all loans
  static async getAllLoans(req, res) {
    try {
      const { status, tier, clientId } = req.query;

      let query = `
        SELECT l.*, c.full_name, c.phone_number 
        FROM loans l 
        JOIN clients c ON l.client_id = c.client_id 
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND l.status = ?';
        params.push(status);
      }

      if (tier) {
        query += ' AND l.tier = ?';
        params.push(tier);
      }

      if (clientId) {
        query += ' AND l.client_id = ?';
        params.push(clientId);
      }

      query += ' ORDER BY l.disbursement_date DESC';

      const loans = await db.allAsync(query, params);

      res.json({
        success: true,
        count: loans.length,
        data: loans
      });
    } catch (error) {
      console.error('Get loans error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get single loan
  static async getLoan(req, res) {
    try {
      const loan = await db.getAsync(
        `SELECT l.*, c.full_name, c.phone_number 
         FROM loans l 
         JOIN clients c ON l.client_id = c.client_id 
         WHERE l.loan_id = ?`,
        [req.params.id]
      );

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: 'Loan not found'
        });
      }

      res.json({
        success: true,
        data: loan
      });
    } catch (error) {
      console.error('Get loan error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create loan application
  static async createApplication(req, res) {
    try {
      const { clientId, amountRequested, applicationLinkToken } = req.body;

      if (!clientId || !amountRequested) {
        return res.status(400).json({
          success: false,
          message: 'Client ID and amount requested are required'
        });
      }

      const applicationId = 'APP-' + uuidv4();
      const token = applicationLinkToken || uuidv4();

      await db.runAsync(
        `INSERT INTO loan_applications (application_id, client_id, amount_requested, application_link_token)
         VALUES (?, ?, ?, ?)`,
        [applicationId, clientId, amountRequested, token]
      );

      const newApplication = await db.getAsync(
        'SELECT * FROM loan_applications WHERE application_id = ?',
        [applicationId]
      );

      // Send WhatsApp notification
      const client = await db.getAsync(
        'SELECT phone_number FROM clients WHERE client_id = ?',
        [clientId]
      );

      if (client) {
        await whatsappService.sendApplicationReceived(client.phone_number, amountRequested);
      }

      res.status(201).json({
        success: true,
        message: 'Application created successfully',
        data: newApplication,
        applicationLink: `https://invarholdings.com/apply?token=${token}`
      });
    } catch (error) {
      console.error('Create application error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Review application (approve/reject)
  static async reviewApplication(req, res) {
    try {
      const { applicationId, approved, rejectionReason } = req.body;
      const reviewerId = req.user.userId;

      const application = await db.getAsync(
        'SELECT * FROM loan_applications WHERE application_id = ?',
        [applicationId]
      );

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const status = approved ? 'approved' : 'rejected';
      const reviewDate = new Date().toISOString();

      await db.runAsync(
        `UPDATE loan_applications 
         SET status = ?, reviewed_by = ?, review_date = ?, rejection_reason = ?
         WHERE application_id = ?`,
        [status, reviewerId, reviewDate, rejectionReason || null, applicationId]
      );

      // If approved, create the loan
      if (approved) {
        const loanId = 'LOAN-' + uuidv4();
        const calculation = LoanCalculator.calculateLoan(
          application.amount_requested,
          new Date()
        );

        await db.runAsync(
          `INSERT INTO loans (loan_id, application_id, client_id, principal_amount, 
           interest_rate_applied, tier, disbursement_date, due_date, total_repayable, 
           outstanding_balance, last_interest_calculation_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            loanId, applicationId, application.client_id,
            application.amount_requested, calculation.interestRate, calculation.tier,
            new Date().toISOString(), calculation.dueDate.toISOString(),
            calculation.totalRepayable, calculation.outstandingBalance,
            new Date().toISOString()
          ]
        );

        // Deduct from treasury
        const treasury = await db.getAsync(
          'SELECT running_balance FROM company_treasury ORDER BY date DESC LIMIT 1'
        );

        const newBalance = treasury.running_balance - application.amount_requested;

        await db.runAsync(
          `INSERT INTO company_treasury (transaction_id, type, amount, description, running_balance, linked_loan_id)
           VALUES (?, 'disbursement', ?, ?, ?, ?)`,
          [
            'TXN-' + Date.now(),
            application.amount_requested,
            `Loan disbursement: ${loanId}`,
            newBalance,
            loanId
          ]
        );

        // Send approval WhatsApp
        const client = await db.getAsync(
          'SELECT phone_number FROM clients WHERE client_id = ?',
          [application.client_id]
        );

        if (client) {
          await whatsappService.sendLoanApproved(
            client.phone_number,
            loanId,
            application.amount_requested,
            calculation.totalRepayable,
            calculation.dueDate.toISOString().split('T')[0]
          );
        }
      } else {
        // Send rejection WhatsApp
        const client = await db.getAsync(
          'SELECT phone_number FROM clients WHERE client_id = ?',
          [application.client_id]
        );

        if (client) {
          await whatsappService.sendLoanRejected(client.phone_number, rejectionReason);
        }
      }

      res.json({
        success: true,
        message: `Application ${approved ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Review application error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Disburse loan
  static async disburseLoan(req, res) {
    try {
      const { loanId } = req.body;

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

      // Update treasury
      const treasury = await db.getAsync(
        'SELECT running_balance FROM company_treasury ORDER BY date DESC LIMIT 1'
      );

      const newBalance = treasury.running_balance - loan.principal_amount;

      await db.runAsync(
        `INSERT INTO company_treasury (transaction_id, type, amount, description, running_balance, linked_loan_id)
         VALUES (?, 'disbursement', ?, ?, ?, ?)`,
        [
          'TXN-' + Date.now(),
          loan.principal_amount,
          `Loan disbursement: ${loanId}`,
          newBalance,
          loanId
        ]
      );

      res.json({
        success: true,
        message: 'Loan disbursed successfully',
        newBalance
      });
    } catch (error) {
      console.error('Disburse loan error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = LoanController;