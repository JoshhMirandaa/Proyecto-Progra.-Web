CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(50) PRIMARY KEY,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('estudiante', 'encargado')),
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    codigo VARCHAR(20),
    carrera VARCHAR(120),
    telefono VARCHAR(30),
    clave_hash TEXT NOT NULL,
    verificado BOOLEAN DEFAULT FALSE,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido')),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS codigos_verificacion (
    id SERIAL PRIMARY KEY,
    correo VARCHAR(150) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('registro', 'recuperacion')),
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);