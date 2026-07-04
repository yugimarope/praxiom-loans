const db = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const whatsappService = require('../services/whatsappService');

class ClientController {
  // Get all clients
  static async getAllClients(req, res) {
    try {
      const clients = await db.allAsync(
        'SELECT * FROM clients ORDER BY registration_date DESC'
      );

      res.json({
        success: true,
        count: clients.length,
        data: clients
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get single client
  static async getClient(req, res) {
    try {
      const client = await db.getAsync(
        'SELECT * FROM clients WHERE client_id = ?',
        [req.params.id]
      );

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      res.json({
        success: true,
        data: client
      });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create new client
  static async createClient(req, res) {
    try {
      const { fullName, phoneNumber, nationalId, email } = req.body;

      if (!fullName || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Full name and phone number are required'
        });
      }

      const clientId = 'CLIENT-' + uuidv4();

      await db.runAsync(
        `INSERT INTO clients (client_id, full_name, phone_number, national_id, email)
         VALUES (?, ?, ?, ?, ?)`,
        [clientId, fullName, phoneNumber, nationalId, email]
      );

      const newClient = await db.getAsync(
        'SELECT * FROM clients WHERE client_id = ?',
        [clientId]
      );

      res.status(201).json({
        success: true,
        message: 'Client created successfully',
        data: newClient
      });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }

      console.error('Create client error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update client
  static async updateClient(req, res) {
    try {
      const { fullName, phoneNumber, nationalId, email, status, creditScore } = req.body;

      await db.runAsync(
        `UPDATE clients 
         SET full_name = ?, phone_number = ?, national_id = ?, email = ?, status = ?, credit_score = ?
         WHERE client_id = ?`,
        [fullName, phoneNumber, nationalId, email, status, creditScore, req.params.id]
      );

      const updatedClient = await db.getAsync(
        'SELECT * FROM clients WHERE client_id = ?',
        [req.params.id]
      );

      res.json({
        success: true,
        message: 'Client updated successfully',
        data: updatedClient
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete client
  static async deleteClient(req, res) {
    try {
      await db.runAsync(
        'DELETE FROM clients WHERE client_id = ?',
        [req.params.id]
      );

      res.json({
        success: true,
        message: 'Client deleted successfully'
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = ClientController;