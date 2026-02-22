// solo permite el acceso a usuarios con rol ADMIN
const soloAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.rol !== 'ADMIN') {
        return res.status(403).json({ exito: false, mensaje: 'Acceso restringido: se requiere rol ADMIN' });
    }
    next();
};

module.exports = { soloAdmin };
