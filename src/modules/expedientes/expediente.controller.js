const expedienteService = require('./expediente.service');

const crearNuevoExpediente = async (req, res) => {
    try {
        // req.body tiene los textos, req.file tiene el PDF
        if (!req.file) {
            return res.status(400).json({ exito: false, mensaje: 'El archivo adjunto es obligatorio' });
        }

        const datosTexto = {
            asunto: req.body.asunto,
            tipo_origen: req.body.tipo_origen,
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

const obtenerEstadisticasDepartamento = async (req, res) => {
    try {
        const { departamento_id } = req.usuario;
        if (!departamento_id) {
            return res.status(400).json({ exito: false, mensaje: 'El usuario no tiene departamento asignado' });
        }
        const stats = await expedienteService.obtenerEstadisticas(departamento_id);
        res.status(200).json({ exito: true, data: stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las estadísticas' });
    }
};

const verHistorialExpediente = async (req, res) => {
    try {
        const { id } = req.params;
        const historial = await expedienteService.obtenerHistorial(id);

        res.status(200).json({
            exito: true,
            data: historial
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener el historial' });
    }
};

const verDetalleExpediente = async (req, res) => {
    try {
        const { id } = req.params;
        const detalle = await expedienteService.obtenerDetalleCompleto(id);
        if (!detalle) {
            return res.status(404).json({ exito: false, mensaje: 'Expediente no encontrado' });
        }
        res.status(200).json({ exito: true, data: detalle });
    } catch (error) {
        console.error('Error al obtener detalle:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener el detalle del expediente' });
    }
};

const derivar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevo_departamento_id, descripcion } = req.body;
        const { id: usuarioId, departamento_id } = req.usuario;

        if (!nuevo_departamento_id) {
            return res.status(400).json({ exito: false, mensaje: 'El campo nuevo_departamento_id es requerido' });
        }

        await expedienteService.derivarExpediente({
            expedienteId: id,
            nuevoDepartamentoId: nuevo_departamento_id,
            usuarioId,
            departamentoOrigenId: departamento_id,
            descripcion
        });

        res.status(200).json({ exito: true, mensaje: 'Expediente derivado exitosamente' });
    } catch (error) {
        console.error('Error al derivar expediente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al derivar el expediente' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevo_estado, descripcion } = req.body;
        const { id: usuarioId, departamento_id } = req.usuario;

        if (!nuevo_estado) {
            return res.status(400).json({ exito: false, mensaje: 'El campo nuevo_estado es requerido' });
        }

        await expedienteService.actualizarEstado({
            expedienteId: id,
            nuevoEstado: nuevo_estado,
            usuarioId,
            departamentoId: departamento_id,
            descripcion
        });

        res.status(200).json({ exito: true, mensaje: `Estado actualizado a ${nuevo_estado}` });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ exito: false, mensaje: error.message || 'Error al cambiar el estado' });
    }
};

const comentar = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario } = req.body;
        const { id: usuarioId, departamento_id } = req.usuario;

        if (!comentario || comentario.trim() === '') {
            return res.status(400).json({ exito: false, mensaje: 'El comentario no puede estar vacío' });
        }

        await expedienteService.agregarComentario({
            expedienteId: id,
            usuarioId,
            departamentoId: departamento_id,
            comentario: comentario.trim()
        });

        res.status(200).json({ exito: true, mensaje: 'Comentario agregado al historial' });
    } catch (error) {
        console.error('Error al agregar comentario:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al agregar el comentario' });
    }
};

const obtenerSeguimiento = async (req, res) => {
    try {
        const { rol, id: usuarioId, departamento_id } = req.usuario;
        const { estado, dept_filtro, busqueda, fecha_desde, fecha_hasta } = req.query;

        const expedientes = await expedienteService.obtenerSeguimiento({
            rol,
            departamento_id,
            estado: estado || null,
            dept_filtro: dept_filtro || null,
            busqueda: busqueda || null,
            fecha_desde: fecha_desde || null,
            fecha_hasta: fecha_hasta || null
        });

        res.status(200).json({ exito: true, data: expedientes });
    } catch (error) {
        console.error('Error al obtener seguimiento:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener el seguimiento' });
    }
};

const obtenerReportesDatos = async (req, res) => {
    try {
        const { rol, departamento_id } = req.usuario;
        const datos = await expedienteService.obtenerReportes({ rol, departamento_id });
        res.status(200).json({ exito: true, data: datos });
    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al generar los reportes' });
    }
};

module.exports = { 
    crearNuevoExpediente,
    listarBandejaDepartamento,
    obtenerEstadisticasDepartamento,
    verHistorialExpediente,
    verDetalleExpediente,
    derivar,
    cambiarEstado,
    comentar,
    obtenerSeguimiento,
    obtenerReportesDatos
};

