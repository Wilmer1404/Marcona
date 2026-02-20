const usuarioService = require('./usuario.service');
const bcrypt = require('bcryptjs'); // Importamos la librería de encriptación

const getUsuarios = async (req, res) => {
    try {
        const usuarios = await usuarioService.obtenerTodos();
        res.status(200).json({ exito: true, data: usuarios });
    } catch (error) {
        console.error('Error en getUsuarios:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno' });
    }
};

// Crear usuario
const crearUsuario = async (req, res) => {
    try {
        const { dni, nombres, apellidos, correo, password, departamento_id, rol } = req.body;

        // Encriptar la contraseña (10 rondas de seguridad)
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Armamos el objeto para el servicio
        const nuevoUsuario = await usuarioService.crearUsuario({
            dni, nombres, apellidos, correo, password_hash, departamento_id, rol
        });

        res.status(201).json({
            exito: true,
            mensaje: 'Usuario creado correctamente',
            data: nuevoUsuario
        });
    } catch (error) {
        console.error('Error en crearUsuario:', error);
        // Si el DNI o correo ya existen, PostgreSQL lanzará un error que podemos atrapar
        res.status(400).json({ exito: false, mensaje: 'Error al crear usuario. Verifica los datos o si el DNI/Correo ya existe.' });
    }
};

module.exports = {
    getUsuarios,
    crearUsuario
};