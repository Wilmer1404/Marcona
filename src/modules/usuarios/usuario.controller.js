const usuarioService = require('./usuario.service');

const getUsuarios = async (req, res) => {
    try {
        const usuarios = await usuarioService.obtenerTodos();
        
        res.status(200).json({
            exito: true,
            data: usuarios
        });
    } catch (error) {
        console.error('Error en getUsuarios:', error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno al obtener los usuarios'
        });
    }
};

module.exports = {
    getUsuarios
};