const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.join(__dirname, 'praxiom_loans.db');
const db = new sqlite3.Database(dbPath);

// Simple ID generator (replaces uuid)
const generateId = (prefix = '') => {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

async function initDatabase() {
  return new Promise((resolve, reject) => {
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    db.serialize(() => {
      // Create all tables
      db.run(schemaSQL, (err) => {
        if (err) {
          console.error('❌ Error creating tables:', err);
          reject(err);
          return;
        }
        console.log('✅ Database tables created successfully!');

        // Initialize startup liquidity
        const startupLiquidity = parseFloat(process.env.STARTUP_LIQUIDITY) || 10000;
        const transactionId = 'TXN-' + Date.now();
        db.run(
          `INSERT INTO company_treasury (transaction_id, type, amount, description, running_balance)
           VALUES (?, 'deposit', ?, 'Startup Liquidity', ?)`,
          [transactionId, startupLiquidity, startupLiquidity],
          (err) => {
            if (err) {
              console.error('❌ Error initializing treasury:', err);
            } else {
              console.log(`✅ Startup liquidity set: P${startupLiquidity}`);
            }
          }
        );

        // Create default admin user
        const adminId = generateId('ADMIN-');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(
          `INSERT INTO admin_users (user_id, username, password_hash, full_name, role)
           VALUES (?, 'admin', ?, 'Mompoloki Marope', 'super_admin')`,
          [adminId, hashedPassword],
          (err) => {
            if (err) {
              console.error('❌ Error creating admin user:', err);
            } else {
              console.log('✅ Default admin user created');
              console.log('   Username: admin');
              console.log('   Password: admin123');
              console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
            }
          }
        );

        console.log('\n🎉 Database initialization complete!');
        resolve(db);
      });
    });
  });
}

module.exports = { db, initDatabase };
