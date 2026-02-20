const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares Globales
app.use(cors()); // Permite que React se comunique con este backend
app.use(express.json()); // Permite a Node entender los JSON que envíe el frontend
app.use(express.urlencoded({ extended: true })); // Permite entender datos de formularios tradicionales

// Ruta base de prueba para saber que la API vive
app.get('/', (req, res) => {
    res.json({ 
        mensaje: 'API del Sistema de Gestión Documental - Marcona funcionando',
        estado: 'Online'
    });
});

module.exports = app;