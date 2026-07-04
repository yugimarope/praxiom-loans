-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
    client_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    national_id TEXT,
    email TEXT,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    credit_score INTEGER DEFAULT 50,
    status TEXT DEFAULT 'active'
);

-- Loan Applications Table
CREATE TABLE IF NOT EXISTS loan_applications (
    application_id TEXT PRIMARY KEY,
    client_id TEXT,
    amount_requested REAL NOT NULL,
    application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    review_date DATETIME,
    rejection_reason TEXT,
    application_link_token TEXT UNIQUE,
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
    loan_id TEXT PRIMARY KEY,
    application_id TEXT,
    client_id TEXT,
    principal_amount REAL NOT NULL,
    interest_rate_applied REAL NOT NULL,
    tier INTEGER NOT NULL,
    disbursement_date DATETIME,
    due_date DATETIME,
    total_repayable REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    outstanding_balance REAL NOT NULL,
    status TEXT DEFAULT 'active',
    last_interest_calculation_date DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (application_id) REFERENCES loan_applications(application_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    payment_id TEXT PRIMARY KEY,
    loan_id TEXT,
    amount_paid REAL NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_method TEXT,
    receipt_number TEXT UNIQUE,
    whatsapp_receipt_sent BOOLEAN DEFAULT 0,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

-- Company Treasury Table
CREATE TABLE IF NOT EXISTS company_treasury (
    transaction_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    running_balance REAL NOT NULL,
    linked_loan_id TEXT
);

-- Portfolio Metrics Table
CREATE TABLE IF NOT EXISTS portfolio_metrics (
    metric_date DATE PRIMARY KEY,
    total_cash_available REAL,
    total_outstanding_loans REAL,
    portfolio_percentage REAL,
    alert_triggered BOOLEAN DEFAULT 0
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);