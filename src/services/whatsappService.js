const path = require('path');
const twilio = require('twilio');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

class WhatsAppService {
  constructor() {
    // Only initialize if Twilio credentials exist
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
      this.enabled = true;
    } else {
      this.enabled = false;
      console.log('⚠️  WhatsApp service disabled - Twilio credentials not set');
    }
  }

  async sendMessage(toNumber, message) {
    if (!this.enabled) {
      console.log('WhatsApp not configured, skipping message');
      return { success: false, error: 'Not configured' };
    }

    try {
      // Format phone number (remove + if present, add back)
      const cleanNumber = toNumber.replace('+', '');
      const formattedTo = `whatsapp:+${cleanNumber}`;

      const result = await this.client.messages.create({
        from: this.fromNumber,
        to: formattedTo,
        body: message
      });

      console.log('✅ WhatsApp sent:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('❌ WhatsApp error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendApplicationReceived(phone, amount) {
    const message = `Dear Client,\n\nWe've received your loan application of P${amount}.\n\nWe'll respond within 24 hours.\n\nThank you!\n- ${process.env.COMPANY_NAME}`;
    return await this.sendMessage(phone, message);
  }

  async sendLoanApproved(phone, loanId, principal, total, dueDate) {
    const message = `Congratulations!\n\nYour loan of P${principal} is APPROVED.\n\nLoan ID: #${loanId}\nTotal Repayable: P${total}\nDue Date: ${dueDate}\n\nVisit us to collect.\n\n- ${process.env.COMPANY_NAME}`;
    return await this.sendMessage(phone, message);
  }

  async sendLoanRejected(phone, reason) {
    const message = `Dear Client,\n\nAfter review, we cannot process your application at this time.\n\nReason: ${reason}\n\nYou may reapply after 30 days.\n\n- ${process.env.COMPANY_NAME}`;
    return await this.sendMessage(phone, message);
  }

  async sendPaymentReminder(phone, amount, dueDate, loanId) {
    const message = `PAYMENT REMINDER\n\nAmount Due: P${amount}\nDue Date: ${dueDate}\nLoan ID: #${loanId}\n\nPlease pay on time to avoid penalties.\n\n- ${process.env.COMPANY_NAME}`;
    return await this.sendMessage(phone, message);
  }

  async sendOverdueNotice(phone, amount, daysOverdue, penalty) {
    const message = `URGENT: PAYMENT OVERDUE\n\nAmount: P${amount}\nDays Overdue: ${daysOverdue}\nPenalty: P${penalty}\n\nPay immediately to avoid further charges.\n\n- ${process.env.COMPANY_NAME}`;
    return await this.sendMessage(phone, message);
  }

  async sendPaymentReceipt(phone, loanId, amount, balance) {
    const message = `PAYMENT RECEIPT\n\nReceived: P${amount}\nLoan ID: #${loanId}\nOutstanding: P${balance}\n\nThank you for your payment!\n\n- ${process.env.COMPANY_NAME}`;
    return await this.sendMessage(phone, message);
  }

  async sendLoanCompleted(phone, loanId) {
    const message = `CONGRATULATIONS!\n\nYour loan #${loanId} is fully paid.\n\nYou're eligible for a higher limit next time.\n\nBlessings!\n- ${process.env.COMPANY_NAME}`;
    return await this.sendMessage(phone, message);
  }
}

module.exports = new WhatsAppService();