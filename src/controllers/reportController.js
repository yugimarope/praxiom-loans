const db = require('../models/database');
const LoanCalculator = require('../utils/loanCalculator');

class ReportController {
  // Dashboard summary
  static async getDashboard(req, res) {
    try {
      // Get current treasury balance
      const treasury = await db.getAsync(
        'SELECT running_balance FROM company_treasury ORDER BY date DESC LIMIT 1'
      );

      // Get total outstanding loans
      const outstandingLoans = await db.getAsync(
        'SELECT SUM(outstanding_balance) as total FROM loans WHERE status IN ("active", "partially_paid")'
      );

      const totalOutstanding = outstandingLoans.total || 0;
      const cashAvailable = treasury.running_balance;
      const portfolioPercentage = cashAvailable > 0 
        ? (totalOutstanding / cashAvailable) * 100 
        : 0;

      // Get today's collections
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayCollections = await db.getAsync(
        `SELECT SUM(amount_paid) as total FROM payments 
         WHERE payment_date >= ?`,
        [todayStart.toISOString()]
      );

      // Get pending applications
      const pendingApps = await db.getAsync(
        `SELECT COUNT(*) as count FROM loan_applications WHERE status = 'pending'`
      );

      // Get overdue loans
      const overdueLoans = await db.allAsync(
        `SELECT * FROM loans WHERE due_date < ? AND status IN ('active', 'partially_paid')`,
        [new Date().toISOString()]
      );

      res.json({
        success: true,
        data: {
          cashAvailable,
          totalOutstanding,
          portfolioPercentage: portfolioPercentage.toFixed(2),
          portfolioAlert: portfolioPercentage > 20,
          todayCollections: todayCollections.total || 0,
          pendingApplications: pendingApps.count,
          overdueLoansCount: overdueLoans.length,
          overdueLoans
        }
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Monthly report
  static async getMonthlyReport(req, res) {
    try {
      const { year, month } = req.query;
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || new Date().getMonth() + 1;

      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

      // Opening balance (last transaction before month)
      const openingBalance = await db.getAsync(
        `SELECT running_balance FROM company_treasury 
         WHERE date < ? ORDER BY date DESC LIMIT 1`,
        [monthStart]
      );

      // All transactions in month
      const transactions = await db.allAsync(
        `SELECT * FROM company_treasury 
         WHERE date BETWEEN ? AND ? 
         ORDER BY date`,
        [monthStart, monthEnd]
      );

      // Calculate totals
      let interestIncome = 0;
      let penaltyIncome = 0;
      let principalRepaid = 0;
      let loansDisbursed = 0;
      let bankCharges = 0;
      let deposits = 0;

      transactions.forEach(txn => {
        switch (txn.type) {
          case 'interest_income':
            interestIncome += txn.amount;
            break;
          case 'penalty_income':
            penaltyIncome += txn.amount;
            break;
          case 'payment':
            principalRepaid += txn.amount;
            break;
          case 'disbursement':
            loansDisbursed += txn.amount;
            break;
          case 'bank_charge':
            bankCharges += txn.amount;
            break;
          case 'deposit':
            deposits += txn.amount;
            break;
        }
      });

      const closingBalance = transactions.length > 0 
        ? transactions[transactions.length - 1].running_balance 
        : openingBalance?.running_balance || 0;

      const netProfit = interestIncome + penaltyIncome - bankCharges;

      res.json({
        success: true,
        data: {
          period: `${monthStart} to ${monthEnd}`,
          openingBalance: openingBalance?.running_balance || 0,
          closingBalance,
          interestIncome,
          penaltyIncome,
          principalRepaid,
          loansDisbursed,
          bankCharges,
          deposits,
          netProfit,
          transactions
        }
      });
    } catch (error) {
      console.error('Monthly report error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Portfolio health report
  static async getPortfolioHealth(req, res) {
    try {
      const activeLoans = await db.allAsync(
        `SELECT * FROM loans WHERE status IN ('active', 'partially_paid')`
      );

      const totalPortfolio = activeLoans.reduce((sum, loan) => sum + loan.outstanding_balance, 0);
      const totalPrincipal = activeLoans.reduce((sum, loan) => sum + loan.principal_amount, 0);

      const tier1Loans = activeLoans.filter(l => l.tier === 1);
      const tier2Loans = activeLoans.filter(l => l.tier === 2);
      const tier3Loans = activeLoans.filter(l => l.tier === 3);

      const overdueLoans = activeLoans.filter(l => new Date(l.due_date) < new Date());

      res.json({
        success: true,
        data: {
          totalPortfolio,
          totalPrincipal,
          totalInterest: totalPortfolio - totalPrincipal,
          activeLoansCount: activeLoans.length,
          tier1Count: tier1Loans.length,
          tier2Count: tier2Loans.length,
          tier3Count: tier3Loans.length,
          overdueCount: overdueLoans.length,
          portfolioPercentage: overdueLoans.length / activeLoans.length * 100
        }
      });
    } catch (error) {
      console.error('Portfolio health error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = ReportController;