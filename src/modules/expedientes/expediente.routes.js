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

router.get('/estadisticas', verificarToken, expedienteController.obtenerEstadisticasDepartamento);
router.get('/seguimiento', verificarToken, expedienteController.obtenerSeguimiento);
router.get('/reportes', verificarToken, expedienteController.obtenerReportesDatos);
router.get('/bandeja', verificarToken, expedienteController.listarBandejaDepartamento);
router.get('/:id/detalle', verificarToken, expedienteController.verDetalleExpediente);
router.get('/:id/historial', verificarToken, expedienteController.verHistorialExpediente);
router.post('/:id/derivar', verificarToken, expedienteController.derivar);
router.patch('/:id/estado', verificarToken, expedienteController.cambiarEstado);
router.post('/:id/comentario', verificarToken, expedienteController.comentar);

module.exports = router;