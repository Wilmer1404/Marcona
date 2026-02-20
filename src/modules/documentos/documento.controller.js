const subirDocumentoPrueba = async (req, res) => {
    try {
        // 'req.file' es creado automáticamente por el middleware Multer
        if (!req.file) {
            return res.status(400).json({ exito: false, mensaje: 'No se envió ningún archivo válido' });
        }

        res.status(200).json({
            exito: true,
            mensaje: 'Archivo subido y guardado exitosamente en el servidor',
            datos_archivo: {
                nombre_original: req.file.originalname,
                nombre_sistema: req.file.filename,
                ruta: req.file.path,
                peso_bytes: req.file.size,
                tipo: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('Error al subir documento:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno al procesar el archivo' });
    }
};

module.exports = {
    subirDocumentoPrueba
};