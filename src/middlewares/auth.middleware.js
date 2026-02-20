const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // 1. Buscamos el token en las cabeceras (headers) de la petición
    const authHeader = req.headers['authorization'];
    
    // El formato estándar es "Bearer eyJhbGciOi..." separando la palabra Bearer del token real
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ 
            exito: false, 
            mensaje: 'Acceso denegado. Se requiere iniciar sesión (Token no proporcionado).' 
        });
    }

    try {
        // 2. Verificamos que el token sea auténtico usando tu llave secreta
        const usuarioDecodificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Si es válido, guardamos los datos del usuario en la petición y le damos pase libre
        req.usuario = usuarioDecodificado; 
        next(); 
        
    } catch (error) {
        return res.status(401).json({ 
            exito: false, 
            mensaje: 'Token inválido o tu sesión ha expirado. Vuelve a iniciar sesión.' 
        });
    }
};

module.exports = { verificarToken };