const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { verificarToken } = require('../../middlewares/auth.middleware');

// lista todos los departamentos activos para poblar selectores
router.get('/', verificarToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nombre, siglas FROM departamentos WHERE activo = TRUE ORDER BY nombre ASC'
        );
        res.status(200).json({ exito: true, data: rows });
    } catch (error) {
        console.error('Error al listar departamentos:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener departamentos' });
    }
});

module.exports = router;
