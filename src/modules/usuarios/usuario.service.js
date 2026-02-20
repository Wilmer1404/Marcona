const { pool } = require('../../config/database');

const obtenerTodos = async () => {
    const query = `SELECT id, dni, nombres, apellidos, correo, rol, activo FROM usuarios ORDER BY id ASC`;
    const { rows } = await pool.query(query);
    return rows;
};

//Insertar usuario
const crearUsuario = async (datosUsuario) => {
    const { dni, nombres, apellidos, correo, password_hash, departamento_id, rol } = datosUsuario;
    
    const query = `
        INSERT INTO usuarios (dni, nombres, apellidos, correo, password_hash, departamento_id, rol)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, dni, nombres, correo, rol;
    `;
    
    const values = [dni, nombres, apellidos, correo, password_hash, departamento_id, rol];
    const { rows } = await pool.query(query, values);
    return rows[0]; // Retorna el usuario recién creado (sin la contraseña)
};

module.exports = {
    obtenerTodos,
    crearUsuario
};