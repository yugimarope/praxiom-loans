const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { initDatabase } = require('./database/init');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./src/routes/authRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const loanRoutes = require('./src/routes/loanRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Praxiom Loans API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Initialize database BEFORE starting server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║     PRAXIUM LOANS API SERVER                 ║
╠══════════════════════════════════════════════╣
║  Server running on port ${PORT}               ║
║  Environment: ${process.env.NODE_ENV}                    ║
║  Database: ${process.env.DB_PATH}           ║
╚══════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
