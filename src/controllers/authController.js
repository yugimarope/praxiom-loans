const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../database/db');

// Simple ID generator (replaces uuid)
const generateId = (prefix = '') => {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

class AuthController {
  // Login
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password required'
        });
      }
      const user = await db.getAsync(
        'SELECT * FROM admin_users WHERE username = ?',
        [username]
      );
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      const validPassword = bcrypt.compareSync(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.user_id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.user_id,
          username: user.username,
          fullName: user.full_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;
      const user = await db.getAsync(
        'SELECT password_hash FROM admin_users WHERE user_id = ?',
        [userId]
      );
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      await db.runAsync(
        'UPDATE admin_users SET password_hash = ? WHERE user_id = ?',
        [hashedPassword, userId]
      );
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = AuthController;
