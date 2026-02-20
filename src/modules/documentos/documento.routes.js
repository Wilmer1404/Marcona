const express = require('express');
const router = express.Router();
const documentoController = require('./documento.controller');
const uploadMiddleware = require('../../middlewares/upload.middleware');

// Ruta POST. Fíjate cómo ponemos el uploadMiddleware en el medio.
// Le decimos que espere un archivo que venga en un campo llamado "archivo_adjunto"
router.post('/prueba', uploadMiddleware.single('archivo_adjunto'), documentoController.subirDocumentoPrueba);

module.exports = router;