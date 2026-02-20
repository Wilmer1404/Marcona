const { Pool } = require('pg');
require('dotenv').config();

// Creamos la configuración extrayendo los datos del .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Evento para confirmar en consola que se conectó bien
pool.on('connect', () => {
    console.log('Conectado a la base de datos PostgreSQL exitosamente.');
});

// Exportamos la función 'query' para usarla luego en nuestros controladores
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};