const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', ClientController.getAllClients);
router.get('/:id', ClientController.getClient);
router.post('/', ClientController.createClient);
router.put('/:id', ClientController.updateClient);
router.delete('/:id', ClientController.deleteClient);

module.exports = router;