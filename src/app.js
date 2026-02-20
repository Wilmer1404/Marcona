const express = require('express');
const cors = require('cors');

// 1. Importamos las rutas de tu módulo de usuarios
const usuarioRoutes = require('./modules/usuarios/usuario.routes');

const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.get('/', (req, res) => {
    res.json({ 
        mensaje: 'API del Sistema de Gestión Documental - Marcona funcionando',
        estado: 'Online'
    });
});

// 2. Activamos la ruta. Todo lo que vaya a /api/usuarios lo manejará usuario.routes.js
app.use('/api/usuarios', usuarioRoutes);

module.exports = app;