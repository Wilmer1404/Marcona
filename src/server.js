require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 4000;

// Probamos la conexión a la base de datos antes de levantar el servidor
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error crítico: No se pudo conectar a PostgreSQL.');
        console.error('Revisa tus credenciales en el archivo .env', err);
        process.exit(1); // Detiene la aplicación por completo
    } else {
        console.log(`Base de datos verificada. Hora del servidor BD: ${res.rows[0].now}`);
        
        // Si la base de datos responde, recién encendemos Express
        app.listen(PORT, () => {
            console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
        });
    }
});