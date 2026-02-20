const multer = require('multer');
const path = require('path');

// 1. Configuramos DÓNDE y CÓMO se guardan los archivos
const storage = multer.diskStorage({
    // Destino: La carpeta uploads/expedientes_internos que creaste en la raíz
    destination: function (req, file, cb) {
        // cb(error, ruta_destino)
        cb(null, path.join(__dirname, '../../uploads/expedientes_internos'));
    },
    
    // Nombre del archivo: Le agregamos la fecha exacta (timestamp) para que sea único
    filename: function (req, file, cb) {
        const prefijoUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        // Ejemplo de resultado: 1708456789-123456789-presupuesto.pdf
        cb(null, prefijoUnico + '-' + file.fieldname + extension);
    }
});

// 2. Filtro de seguridad (Solo permitimos PDFs, Excels y Word)
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = [
        'application/pdf', // PDF
        'application/vnd.ms-excel', // Excel antiguo (.xls)
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel nuevo (.xlsx)
        'application/msword', // Word antiguo (.doc)
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // Word nuevo (.docx)
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true); // Archivo aceptado
    } else {
        cb(new Error('Formato de archivo no válido. Solo se permiten PDF, Excel y Word.'), false); // Archivo rechazado
    }
};

// 3. Exportamos el middleware listo para usar, con un límite de peso de 10MB por archivo
const uploadMiddleware = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 Megabytes
    }
});

module.exports = uploadMiddleware;