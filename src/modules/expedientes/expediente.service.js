const { pool } = require('../../config/database');

const crearExpedienteCompleto = async (datosTexto, datosArchivo) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. codigo único: EXP-2026-0001
        const anio = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const codigoExpediente = `EXP-${anio}-${random}`;

        // 2. insertar expediente (estado queda en REGISTRADO por defecto del schema)
        const queryExp = `
            INSERT INTO expedientes (codigo_expediente, tipo_origen, asunto, usuario_creador_id, departamento_origen_id)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;
        `;
        const valExp = [
            codigoExpediente,
            datosTexto.tipo_origen,
            datosTexto.asunto,
            datosTexto.usuario_creador_id,
            datosTexto.departamento_origen_id
        ];
        const resultExp = await client.query(queryExp, valExp);
        const expedienteId = resultExp.rows[0].id;

        // 3. insertar documento adjunto
        const queryDoc = `
            INSERT INTO documentos_adjuntos (expediente_id, usuario_subida_id, nombre_original, nombre_sistema, ruta_archivo, tipo_mime, peso_bytes)
            VALUES ($1, $2, $3, $4, $5, $6, $7);
        `;
        const valDoc = [
            expedienteId,
            datosTexto.usuario_creador_id,
            datosArchivo.originalname,
            datosArchivo.filename,
            datosArchivo.path,
            datosArchivo.mimetype,
            datosArchivo.size
        ];
        await client.query(queryDoc, valDoc);

        // 4. asignar departamento ORIGEN como creador (es_propietario=false para el origen)
        await client.query(
            `INSERT INTO expediente_departamento (expediente_id, departamento_id, es_propietario, puede_editar)
             VALUES ($1, $2, false, false)
             ON CONFLICT (expediente_id, departamento_id) DO NOTHING;`,
            [expedienteId, datosTexto.departamento_origen_id]
        );

        // 5. asignar departamento DESTINO como propietario actual
        await client.query(
            `INSERT INTO expediente_departamento (expediente_id, departamento_id, es_propietario, puede_editar)
             VALUES ($1, $2, true, true)
             ON CONFLICT (expediente_id, departamento_id) DO NOTHING;`,
            [expedienteId, datosTexto.departamento_destino_id]
        );

        // 6. registrar en historial (desde el departamento origen)
        await client.query(
            `INSERT INTO historial_movimientos (expediente_id, usuario_id, departamento_id, accion, descripcion)
             VALUES ($1, $2, $3, 'CREADO', $4);`,
            [
                expedienteId,
                datosTexto.usuario_creador_id,
                datosTexto.departamento_origen_id,
                `Expediente creado y derivado al departamento destino (ID: ${datosTexto.departamento_destino_id}).`
            ]
        );

        await client.query('COMMIT');
        return { id: expedienteId, codigo: codigoExpediente };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};


const obtenerPorDepartamento = async (departamentoId) => {
    const query = `
        SELECT 
            e.id, 
            e.codigo_expediente, 
            e.asunto, 
            e.tipo_origen,
            e.fecha_creacion,
            u.nombres || ' ' || u.apellidos AS creador,
            d.nombre AS departamento_origen
        FROM expedientes e
        JOIN usuarios u ON e.usuario_creador_id = u.id
        JOIN departamentos d ON e.departamento_origen_id = d.id
        JOIN expediente_departamento ed ON e.id = ed.expediente_id
        WHERE ed.departamento_id = $1
        ORDER BY e.fecha_creacion DESC;
    `;
    const { rows } = await pool.query(query, [departamentoId]);
    return rows;
};

const obtenerHistorial = async (expedienteId) => {
    const query = `
        SELECT 
            h.id,
            h.accion,
            h.descripcion,
            h.fecha_movimiento,
            u.nombres || ' ' || u.apellidos AS usuario,
            d.nombre AS departamento
        FROM historial_movimientos h
        JOIN usuarios u ON h.usuario_id = u.id
        JOIN departamentos d ON h.departamento_id = d.id
        WHERE h.expediente_id = $1
        ORDER BY h.fecha_movimiento ASC;
    `;
    const { rows } = await pool.query(query, [expedienteId]);
    return rows;
};

const obtenerEstadisticas = async (departamentoId) => {
    const query = `
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE e.estado IN ('REGISTRADO', 'OBSERVADO')) AS pendientes,
            COUNT(*) FILTER (WHERE e.estado IN ('EN_PROCESO', 'DERIVADO')) AS en_proceso,
            COUNT(*) FILTER (WHERE e.estado IN ('FINALIZADO', 'ARCHIVADO')) AS finalizados
        FROM expedientes e
        JOIN expediente_departamento ed ON e.id = ed.expediente_id
        WHERE ed.departamento_id = $1;
    `;
    const { rows } = await pool.query(query, [departamentoId]);
    return rows[0];
};

// trae todo lo necesario para la página de detalle en una sola llamada
const obtenerDetalleCompleto = async (expedienteId) => {
    // 1. datos del expediente + creador + departamento origen
    const queryExp = `
        SELECT
            e.id,
            e.codigo_expediente,
            e.asunto,
            e.tipo_origen,
            e.estado,
            e.fecha_creacion,
            u.nombres || ' ' || u.apellidos AS creador,
            u.correo AS correo_creador,
            d_origen.nombre AS departamento_origen,
            d_origen.siglas AS siglas_origen
        FROM expedientes e
        JOIN usuarios u ON e.usuario_creador_id = u.id
        JOIN departamentos d_origen ON e.departamento_origen_id = d_origen.id
        WHERE e.id = $1;
    `;

    // 2. documentos adjuntos del expediente
    const queryDocs = `
        SELECT
            da.id,
            da.nombre_original,
            da.nombre_sistema,
            da.ruta_archivo,
            da.tipo_mime,
            da.peso_bytes,
            da.fecha_subida,
            u.nombres || ' ' || u.apellidos AS subido_por
        FROM documentos_adjuntos da
        LEFT JOIN usuarios u ON da.usuario_subida_id = u.id
        WHERE da.expediente_id = $1
        ORDER BY da.fecha_subida ASC;
    `;

    // 3. historial de movimientos con usuario y departamento
    const queryHist = `
        SELECT
            h.id,
            h.accion,
            h.descripcion,
            h.fecha_movimiento,
            u.nombres || ' ' || u.apellidos AS usuario,
            d.nombre AS departamento,
            d.siglas
        FROM historial_movimientos h
        LEFT JOIN usuarios u ON h.usuario_id = u.id
        LEFT JOIN departamentos d ON h.departamento_id = d.id
        WHERE h.expediente_id = $1
        ORDER BY h.fecha_movimiento ASC;
    `;

    const [expResult, docsResult, histResult] = await Promise.all([
        pool.query(queryExp, [expedienteId]),
        pool.query(queryDocs, [expedienteId]),
        pool.query(queryHist, [expedienteId])
    ]);

    if (expResult.rows.length === 0) return null;

    return {
        expediente: expResult.rows[0],
        documentos: docsResult.rows,
        historial: histResult.rows
    };
};

// transfiere el expediente a otro departamento y actualiza el estado a DERIVADO
const derivarExpediente = async ({ expedienteId, nuevoDepartamentoId, usuarioId, departamentoOrigenId, descripcion }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // quitar propiedad al departamento actual
        await client.query(
            `UPDATE expediente_departamento SET es_propietario = false WHERE expediente_id = $1`,
            [expedienteId]
        );

        // asignar el nuevo departamento como propietario(si no existe la relacion la crea)
        await client.query(
            `INSERT INTO expediente_departamento (expediente_id, departamento_id, es_propietario, puede_editar)
             VALUES ($1, $2, true, true)
             ON CONFLICT (expediente_id, departamento_id) DO UPDATE SET es_propietario = true, puede_editar = true`,
            [expedienteId, nuevoDepartamentoId]
        );

        // actualizar estado del expediente a DERIVADO
        await client.query(
            `UPDATE expedientes SET estado = 'DERIVADO' WHERE id = $1`,
            [expedienteId]
        );

        // registrar el movimiento en historial
        await client.query(
            `INSERT INTO historial_movimientos (expediente_id, usuario_id, departamento_id, accion, descripcion)
             VALUES ($1, $2, $3, 'DERIVADO', $4)`,
            [expedienteId, usuarioId, departamentoOrigenId, descripcion || `Expediente derivado al departamento ID ${nuevoDepartamentoId}.`]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// cambia el estado del expediente y lo registra en historial
const actualizarEstado = async ({ expedienteId, nuevoEstado, usuarioId, departamentoId, descripcion }) => {
    const estadosValidos = ['REGISTRADO', 'EN_PROCESO', 'DERIVADO', 'OBSERVADO', 'FINALIZADO', 'ARCHIVADO'];
    if (!estadosValidos.includes(nuevoEstado)) {
        throw new Error(`Estado no válido: ${nuevoEstado}`);
    }

    await pool.query(`UPDATE expedientes SET estado = $1 WHERE id = $2`, [nuevoEstado, expedienteId]);

    await pool.query(
        `INSERT INTO historial_movimientos (expediente_id, usuario_id, departamento_id, accion, descripcion)
         VALUES ($1, $2, $3, 'ESTADO_ACTUALIZADO', $4)`,
        [expedienteId, usuarioId, departamentoId, descripcion || `Estado cambiado a ${nuevoEstado}.`]
    );
};

// agrega un comentario al historial sin cambiar el estado
const agregarComentario = async ({ expedienteId, usuarioId, departamentoId, comentario }) => {
    await pool.query(
        `INSERT INTO historial_movimientos (expediente_id, usuario_id, departamento_id, accion, descripcion)
         VALUES ($1, $2, $3, 'ESTADO_ACTUALIZADO', $4)`,
        [expedienteId, usuarioId, departamentoId, comentario]
    );
};

// busqueda avanzada para el modulo de seguimiento con filtros opcionales
const obtenerSeguimiento = async ({ rol, departamento_id, estado, dept_filtro, busqueda, fecha_desde, fecha_hasta }) => {
    const params = [];
    let whereClaus = [];
    let paramIdx = 1;

    // si el rol no es ADMIN ni MESA_PARTES filtramos por departamento del usuario
    if (rol !== 'ADMIN' && rol !== 'MESA_PARTES') {
        whereClaus.push(`ed.departamento_id = $${paramIdx++}`);
        params.push(departamento_id);
    }

    if (estado) {
        whereClaus.push(`e.estado = $${paramIdx++}`);
        params.push(estado);
    }

    if (dept_filtro) {
        whereClaus.push(`e.departamento_origen_id = $${paramIdx++}`);
        params.push(dept_filtro);
    }

    if (busqueda) {
        whereClaus.push(`(e.codigo_expediente ILIKE $${paramIdx} OR e.asunto ILIKE $${paramIdx})`);
        params.push(`%${busqueda}%`);
        paramIdx++;
    }

    if (fecha_desde) {
        whereClaus.push(`e.fecha_creacion >= $${paramIdx++}`);
        params.push(fecha_desde);
    }

    if (fecha_hasta) {
        whereClaus.push(`e.fecha_creacion <= $${paramIdx++}`);
        params.push(fecha_hasta + ' 23:59:59');
    }

    const where = whereClaus.length > 0 ? `WHERE ${whereClaus.join(' AND ')}` : '';

    const query = `
        SELECT
            e.id,
            e.codigo_expediente,
            e.asunto,
            e.tipo_origen,
            e.estado,
            e.fecha_creacion,
            u.nombres || ' ' || u.apellidos AS creador,
            d_origen.nombre AS departamento_origen,
            d_origen.siglas AS siglas_origen,
            (SELECT COUNT(*) FROM documentos_adjuntos da WHERE da.expediente_id = e.id) AS total_documentos,
            (SELECT MAX(h.fecha_movimiento) FROM historial_movimientos h WHERE h.expediente_id = e.id) AS ultimo_movimiento
        FROM expedientes e
        JOIN usuarios u ON e.usuario_creador_id = u.id
        JOIN departamentos d_origen ON e.departamento_origen_id = d_origen.id
        JOIN expediente_departamento ed ON e.id = ed.expediente_id
        ${where}
        GROUP BY e.id, e.codigo_expediente, e.asunto, e.tipo_origen, e.estado,
                 e.fecha_creacion, u.nombres, u.apellidos, d_origen.nombre, d_origen.siglas
        ORDER BY e.fecha_creacion DESC
        LIMIT 200;
    `;

    const { rows } = await pool.query(query, params);
    return rows;
};

// datos agregados para el módulo de reportes
const obtenerReportes = async ({ rol, departamento_id }) => {
    // filtro base según el rol
    const esTodosLosRoles = rol === 'ADMIN' || rol === 'MESA_PARTES';
    const filtroJoin = esTodosLosRoles ? '' : `JOIN expediente_departamento ed ON e.id = ed.expediente_id`;
    const filtroWhere = esTodosLosRoles ? '' : `WHERE ed.departamento_id = ${parseInt(departamento_id)}`;

    // 1. totales por estado
    const qPorEstado = `
        SELECT e.estado, COUNT(*) AS total
        FROM expedientes e
        ${filtroJoin}
        ${filtroWhere}
        GROUP BY e.estado
        ORDER BY total DESC;
    `;

    // 2. totales por departamento origen
    const qPorDept = `
        SELECT d.nombre AS departamento, d.siglas, COUNT(DISTINCT e.id) AS total
        FROM expedientes e
        JOIN departamentos d ON e.departamento_origen_id = d.id
        ${filtroJoin}
        ${filtroWhere ? filtroWhere + ' AND true' : ''}
        GROUP BY d.nombre, d.siglas
        ORDER BY total DESC
        LIMIT 10;
    `;

    // 3. tendencia: expedientes creados por dia en los ultimos 30 dias
    const qTendencia = `
        SELECT DATE(e.fecha_creacion) AS fecha, COUNT(*) AS total
        FROM expedientes e
        ${filtroJoin}
        ${filtroWhere}
        WHERE e.fecha_creacion >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(e.fecha_creacion)
        ORDER BY fecha ASC;
    `;

    // 4. resumen general
    const qResumen = `
        SELECT
            COUNT(DISTINCT e.id) AS total,
            COUNT(DISTINCT e.id) FILTER (WHERE e.estado IN ('REGISTRADO', 'OBSERVADO')) AS pendientes,
            COUNT(DISTINCT e.id) FILTER (WHERE e.estado IN ('EN_PROCESO', 'DERIVADO')) AS en_proceso,
            COUNT(DISTINCT e.id) FILTER (WHERE e.estado IN ('FINALIZADO', 'ARCHIVADO')) AS finalizados,
            COUNT(DISTINCT da.id) AS total_documentos
        FROM expedientes e
        LEFT JOIN documentos_adjuntos da ON da.expediente_id = e.id
        ${filtroJoin}
        ${filtroWhere};
    `;

    const [rEstado, rDept, rTendencia, rResumen] = await Promise.all([
        pool.query(qPorEstado),
        pool.query(qPorDept),
        pool.query(filtroWhere ? qTendencia.replace('WHERE e.fecha_creacion', 'AND e.fecha_creacion') : qTendencia),
        pool.query(qResumen)
    ]);

    return {
        resumen: rResumen.rows[0],
        por_estado: rEstado.rows,
        por_departamento: rDept.rows,
        tendencia_30_dias: rTendencia.rows
    };
};

module.exports = { 
    crearExpedienteCompleto,
    obtenerPorDepartamento,
    obtenerHistorial,
    obtenerEstadisticas,
    obtenerDetalleCompleto,
    derivarExpediente,
    actualizarEstado,
    agregarComentario,
    obtenerSeguimiento,
    obtenerReportes
};