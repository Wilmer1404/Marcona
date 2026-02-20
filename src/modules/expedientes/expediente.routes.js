const express = require('express');
const router = express.Router();
const expedienteController = require('./expediente.controller');
const uploadMiddleware = require('../../middlewares/upload.middleware');

// Esperamos que el archivo venga en el campo "archivo_adjunto"
router.post('/nuevo', uploadMiddleware.single('archivo_adjunto'), expedienteController.crearNuevoExpediente);

module.exports = router;