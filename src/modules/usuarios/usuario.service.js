const { pool } = require('../../config/database');

const obtenerTodos = async () => {
    // Traemos los datos básicos sin exponer la contraseña
    const query = `
        SELECT id, dni, nombres, apellidos, correo, rol, activo 
        FROM usuarios 
        ORDER BY id ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

module.exports = {
    obtenerTodos
};