const express = require('express');
const router = express.Router();
const usuarioController = require('./usuario.controller');

router.get('/', usuarioController.getUsuarios);
router.post('/', usuarioController.crearUsuario);

module.exports = router;