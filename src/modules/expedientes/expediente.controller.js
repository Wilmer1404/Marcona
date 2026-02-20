const expedienteService = require('./expediente.service');

const crearNuevoExpediente = async (req, res) => {
    try {
        // req.body tiene los textos, req.file tiene el PDF
        if (!req.file) {
            return res.status(400).json({ exito: false, mensaje: 'El archivo adjunto es obligatorio' });
        }

        const datosTexto = {
            asunto: req.body.asunto,
            tipo_origen: req.body.tipo_origen, // INTERNO o EXTERNO
            usuario_creador_id: req.body.usuario_creador_id,
            departamento_origen_id: req.body.departamento_origen_id,
            departamento_destino_id: req.body.departamento_destino_id
        };

        const resultado = await expedienteService.crearExpedienteCompleto(datosTexto, req.file);

        res.status(201).json({
            exito: true,
            mensaje: 'Expediente creado y derivado exitosamente',
            data: resultado
        });
    } catch (error) {
        console.error('Error al crear expediente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno al procesar el expediente completo' });
    }
};

const listarBandejaDepartamento = async (req, res) => {
    try {
        // Extraemos el departamento_id del token (inyectado por el middleware de auth)
        const { departamento_id } = req.usuario;

        if (!departamento_id) {
            return res.status(400).json({ 
                exito: false, 
                mensaje: 'El usuario no tiene un departamento asignado' 
            });
        }

        const expedientes = await expedienteService.obtenerPorDepartamento(departamento_id);

        res.status(200).json({
            exito: true,
            data: expedientes
        });
    } catch (error) {
        console.error('Error al listar bandeja:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener los expedientes' });
    }
};

module.exports = { 
    crearNuevoExpediente,
    listarBandejaDepartamento 
};
