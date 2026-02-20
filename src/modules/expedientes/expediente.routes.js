const express = require('express');
const router = express.Router();
const expedienteController = require('./expediente.controller');
const uploadMiddleware = require('../../middlewares/upload.middleware');
const { verificarToken } = require('../../middlewares/auth.middleware');

// Fíjate en el orden: 1° Verifica Token -> 2° Sube el archivo -> 3° Ejecuta el controlador
router.post('/nuevo', 
    verificarToken, 
    uploadMiddleware.single('archivo_adjunto'), 
    expedienteController.crearNuevoExpediente
);

module.exports = router;