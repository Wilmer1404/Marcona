const express = require('express');
const cors = require('cors');

// Importaciones de rutas
const usuarioRoutes = require('./modules/usuarios/usuario.routes');
const documentoRoutes = require('./modules/documentos/documento.routes');
const expedienteRoutes = require('./modules/expedientes/expediente.routes');
const authRoutes = require('./modules/auth/auth.routes');

const app = express();

// 1. PRIMERO: Los middlewares (Los traductores)
app.use(cors()); 
app.use(express.json()); // <- ¡Esta es la línea mágica que lee el req.body!
app.use(express.urlencoded({ extended: true })); 

// 2. SEGUNDO: Las rutas base
app.get('/', (req, res) => {
    res.json({ mensaje: 'API del SGD - Marcona funcionando' });
});

// 3. TERCERO: Las rutas de tus módulos
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/expedientes', expedienteRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;