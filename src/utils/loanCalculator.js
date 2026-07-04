class LoanCalculator {
  /**
   * Determines loan tier based on amount
   * Tier 1: < P1000
   * Tier 2: P1000 - P2999
   * Tier 3: P3000+
   */
  static determineTier(amount) {
    if (amount < 1000) return 1;
    if (amount < 3000) return 2;
    return 3;
  }

  /**
   * Calculates loan details based on tier
   * @param {number} principal - Loan amount
   * @param {string} disbursementDate - Date loan is given
   * @returns {object} Loan calculation results
   */
  static calculateLoan(principal, disbursementDate) {
    const tier = this.determineTier(principal);
    let interestRate, dueDate, totalRepayable;

    const date = new Date(disbursementDate);

    // TIER 1: Less than P1000
    if (tier === 1) {
      interestRate = 0.30; // 30% flat
      dueDate = new Date(date.setDate(date.getDate() + 30)); // 30 days
      totalRepayable = principal + (principal * interestRate);
    
    // TIER 2: P1000 to P2999
    } else if (tier === 2) {
      interestRate = 0.25; // 25% flat
      dueDate = new Date(date.setDate(date.getDate() + 60)); // 60 days
      totalRepayable = principal + (principal * interestRate);
    
    // TIER 3: P3000 and above
    } else {
      interestRate = 0.20; // 20% monthly
      dueDate = new Date(date.setMonth(date.getMonth() + 1)); // 1 month
      totalRepayable = principal + (principal * interestRate);
    }

    return {
      tier,
      interestRate,
      dueDate,
      totalRepayable,
      outstandingBalance: totalRepayable
    };
  }

  /**
   * Calculates penalty for overdue Tier 1 & 2 loans
   * @param {number} principal - Original loan amount
   * @param {number} daysOverdue - Days past due date
   * @returns {number} Penalty amount
   */
  static calculatePenalty(principal, daysOverdue) {
    if (daysOverdue <= 0) return 0;
    
    const penaltyRate = parseFloat(process.env.PENALTY_RATE_WEEKLY) || 0.05;
    const weeksOverdue = Math.ceil(daysOverdue / 7);
    return principal * penaltyRate * weeksOverdue;
  }

  /**
   * Calculates new balance after partial payment (Tier 3)
   * @param {object} loan - Loan object
   * @param {number} paymentAmount - Amount being paid
   * @returns {object} Payment breakdown
   */
  static calculatePartialPayment(loan, paymentAmount) {
    if (loan.tier === 3) {
      // First pay interest, then principal
      const monthlyInterest = loan.outstandingBalance * 0.20;
      
      let interestPortion, principalPortion;
      
      if (paymentAmount >= monthlyInterest) {
        interestPortion = monthlyInterest;
        principalPortion = paymentAmount - monthlyInterest;
      } else {
        interestPortion = paymentAmount;
        principalPortion = 0;
      }
      
      const newBalance = loan.outstandingBalance - principalPortion;
      
      return {
        newOutstandingBalance: newBalance > 0 ? newBalance : 0,
        interestCharged: interestPortion,
        principalPaid: principalPortion
      };
    } else {
      // Tier 1 & 2: Simple deduction
      const newBalance = loan.outstandingBalance - paymentAmount;
      return {
        newOutstandingBalance: newBalance > 0 ? newBalance : 0,
        interestCharged: 0,
        principalPaid: paymentAmount
      };
    }
  }

  /**
   * Calculates monthly interest for Tier 3 loans
   * @param {number} outstandingBalance - Current balance
   * @returns {number} Interest for one month
   */
  static calculateMonthlyInterest(outstandingBalance) {
    return outstandingBalance * 0.20;
  }
}

module.exports = LoanCalculator;