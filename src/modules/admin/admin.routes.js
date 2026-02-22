const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../../config/database');
const { verificarToken } = require('../../middlewares/auth.middleware');
const { soloAdmin } = require('../../middlewares/admin.middleware');

// GET /api/admin/usuarios - listar todos los usuarios
router.get('/usuarios', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                u.id, u.dni, u.nombres, u.apellidos, u.correo,
                u.rol, u.activo, u.creado_en,
                d.nombre AS departamento, d.siglas
            FROM usuarios u
            LEFT JOIN departamentos d ON u.departamento_id = d.id
            ORDER BY u.creado_en DESC
        `);
        res.status(200).json({ exito: true, data: rows });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener usuarios' });
    }
});

// POST /api/admin/usuarios - crear nuevo usuario
router.post('/usuarios', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { dni, nombres, apellidos, correo, password, rol, departamento_id } = req.body;
        if (!dni || !nombres || !apellidos || !correo || !password) {
            return res.status(400).json({ exito: false, mensaje: 'Todos los campos obligatorios deben completarse' });
        }
        const hash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            `INSERT INTO usuarios (dni, nombres, apellidos, correo, password_hash, rol, departamento_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, dni, nombres, apellidos, correo, rol`,
            [dni, nombres, apellidos, correo, hash, rol || 'ASISTENTE', departamento_id || null]
        );
        res.status(201).json({ exito: true, data: rows[0], mensaje: 'Usuario creado exitosamente' });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.code === '23505') {
            return res.status(409).json({ exito: false, mensaje: 'El DNI o correo ya están registrados' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error al crear el usuario' });
    }
});

// PATCH /api/admin/usuarios/:id - actualizar usuario (sin cambiar password)
router.patch('/usuarios/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombres, apellidos, correo, rol, departamento_id, activo } = req.body;
        await pool.query(
            `UPDATE usuarios SET
                nombres = COALESCE($1, nombres),
                apellidos = COALESCE($2, apellidos),
                correo = COALESCE($3, correo),
                rol = COALESCE($4, rol),
                departamento_id = COALESCE($5, departamento_id),
                activo = COALESCE($6, activo)
             WHERE id = $7`,
            [nombres, apellidos, correo, rol, departamento_id, activo, id]
        );
        res.status(200).json({ exito: true, mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el usuario' });
    }
});

// PATCH /api/admin/usuarios/:id/password - cambiar contraseña
router.patch('/usuarios/:id/password', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nueva_password } = req.body;
        if (!nueva_password || nueva_password.length < 6) {
            return res.status(400).json({ exito: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const hash = await bcrypt.hash(nueva_password, 10);
        await pool.query(`UPDATE usuarios SET password_hash = $1 WHERE id = $2`, [hash, id]);
        res.status(200).json({ exito: true, mensaje: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al cambiar la contraseña' });
    }
});

// GET /api/admin/departamentos - listar departamentos
router.get('/departamentos', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT d.id, d.nombre, d.siglas, d.activo,
                COUNT(u.id) AS total_usuarios
            FROM departamentos d
            LEFT JOIN usuarios u ON u.departamento_id = d.id
            GROUP BY d.id ORDER BY d.nombre ASC
        `);
        res.status(200).json({ exito: true, data: rows });
    } catch (error) {
        console.error('Error al listar departamentos:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener departamentos' });
    }
});

// POST /api/admin/departamentos - crear departamento
router.post('/departamentos', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { nombre, siglas } = req.body;
        if (!nombre || !siglas) {
            return res.status(400).json({ exito: false, mensaje: 'Nombre y siglas son obligatorios' });
        }
        const { rows } = await pool.query(
            `INSERT INTO departamentos (nombre, siglas) VALUES ($1, $2) RETURNING *`,
            [nombre.trim(), siglas.trim().toUpperCase()]
        );
        res.status(201).json({ exito: true, data: rows[0], mensaje: 'Departamento creado exitosamente' });
    } catch (error) {
        console.error('Error al crear departamento:', error);
        if (error.code === '23505') {
            return res.status(409).json({ exito: false, mensaje: 'Ya existe un departamento con ese nombre o siglas' });
        }
        res.status(500).json({ exito: false, mensaje: 'Error al crear el departamento' });
    }
});

// PATCH /api/admin/departamentos/:id - actualizar departamento
router.patch('/departamentos/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, siglas, activo } = req.body;
        await pool.query(
            `UPDATE departamentos SET
                nombre = COALESCE($1, nombre),
                siglas = COALESCE($2, siglas),
                activo = COALESCE($3, activo)
             WHERE id = $4`,
            [nombre, siglas, activo, id]
        );
        res.status(200).json({ exito: true, mensaje: 'Departamento actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar departamento:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el departamento' });
    }
});

module.exports = router;
