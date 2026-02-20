const { pool } = require('../../config/database');

const crearExpedienteCompleto = async (datosTexto, datosArchivo) => {
    // Pedimos una conexión exclusiva para hacer la transacción
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); //  INICIA LA TRANSACCIÓN

        // 1. Generar código único (Ej: EXP-2026-1234)
        const anio = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const codigoExpediente = `EXP-${anio}-${random}`;

        // 2. Insertar en tabla EXPEDIENTES
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
        const expedienteId = resultExp.rows[0].id; // Obtenemos el ID que PostgreSQL acaba de crear

        // 3. Insertar en tabla DOCUMENTOS_ADJUNTOS
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

        // 4. Asignar visibilidad en la tabla intermedia (EXPEDIENTE_DEPARTAMENTO)
        const queryDep = `
            INSERT INTO expediente_departamento (expediente_id, departamento_id, es_propietario)
            VALUES ($1, $2, true);
        `;
        // Lo asignamos al departamento destino para que aparezca en su bandeja
        await client.query(queryDep, [expedienteId, datosTexto.departamento_destino_id]);

        // 5. Registrar en el HISTORIAL_MOVIMIENTOS
        const queryHist = `
            INSERT INTO historial_movimientos (expediente_id, usuario_id, departamento_id, accion, descripcion)
            VALUES ($1, $2, $3, 'CREADO', 'Expediente creado y derivado inicialmente al sistema.');
        `;
        await client.query(queryHist, [expedienteId, datosTexto.usuario_creador_id, datosTexto.departamento_destino_id]);

        await client.query('COMMIT'); //  SI TODO SALIÓ BIEN, GUARDAMOS DEFINITIVAMENTE
        return { id: expedienteId, codigo: codigoExpediente };

    } catch (error) {
        await client.query('ROLLBACK'); //  SI HAY UN ERROR, DESHACEMOS TODO
        throw error;
    } finally {
        client.release(); // Soltamos la conexión para que otros la usen
    }
};

const obtenerPorDepartamento = async (departamentoId) => {
    const query = `
        SELECT 
            e.id, 
            e.codigo_expediente, 
            e.asunto, 
            e.tipo_origen,
            e.creado_en,
            u.nombres || ' ' || u.apellidos AS creador,
            d.nombre AS departamento_origen
        FROM expedientes e
        JOIN usuarios u ON e.usuario_creador_id = u.id
        JOIN departamentos d ON e.departamento_origen_id = d.id
        JOIN expediente_departamento ed ON e.id = ed.expediente_id
        WHERE ed.departamento_id = $1
        ORDER BY e.creado_en DESC;
    `;
    const { rows } = await pool.query(query, [departamentoId]);
    return rows;
};

module.exports = { 
    crearExpedienteCompleto,
    obtenerPorDepartamento 
};