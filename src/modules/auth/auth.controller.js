const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { correo, password } = req.body;

        // 1. Buscamos al usuario por su correo
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE correo = $1 AND activo = true', [correo]);
        const usuario = rows[0];

        if (!usuario) {
            return res.status(401).json({ exito: false, mensaje: 'Correo o contraseña incorrectos' });
        }

        // 2. Comparamos la contraseña escrita con la encriptada en PostgreSQL
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        
        if (!passwordValida) {
            return res.status(401).json({ exito: false, mensaje: 'Correo o contraseña incorrectos' });
        }

        // 3. Generamos el Token (El "Fotocheck" virtual)
        // Guardamos su ID, departamento y rol dentro del token
        const payload = {
            id: usuario.id,
            departamento_id: usuario.departamento_id,
            rol: usuario.rol
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' }); // Dura una jornada laboral (8 horas)

        res.status(200).json({
            exito: true,
            mensaje: 'Inicio de sesión exitoso',
            token: token,
            usuario: {
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno en el servidor' });
    }
};

module.exports = { login };