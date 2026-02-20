const express = require('express');
const router = express.Router();
const usuarioController = require('./usuario.controller');

// Ruta: GET /api/usuarios/
router.get('/', usuarioController.getUsuarios);

module.exports = router;