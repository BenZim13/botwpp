-- ==============================================================================
-- BASE DE DATOS YACAJOBS (Supabase / PostgreSQL)
-- ==============================================================================

-- 1. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono VARCHAR(30) UNIQUE NOT NULL,       -- Número de WhatsApp (ej: 54911...)
    dni_o_usuario VARCHAR(100),                  -- DNI o nombre de usuario
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Profesionales (Base de candidatos recomendados)
CREATE TABLE IF NOT EXISTS profesionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    oficio VARCHAR(80) NOT NULL,                -- ej: Plomería, Electricidad, Gas, Cerrajería
    estrellas INT DEFAULT 5 CHECK (estrellas BETWEEN 1 AND 5),
    telefono VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos de prueba para profesionales (para que Yaca pueda recomendarlos)
INSERT INTO profesionales (nombre, oficio, estrellas, telefono)
VALUES
    ('Juan Pérez', 'Plomería', 5, '5491100000001'),
    ('Josué David', 'Plomería', 4, '5491100000002'),
    ('Ramón Sorabella', 'Plomería', 3, '5491100000003'),
    ('Carlos Gómez', 'Electricidad', 5, '5491100000004'),
    ('Martín Rodríguez', 'Electricidad', 4, '5491100000005'),
    ('Esteban Quito', 'Electricidad', 3, '5491100000006'),
    ('Lucas Varela', 'Cerrajería', 5, '5491100000007'),
    ('Pedro Morales', 'Cerrajería', 4, '5491100000008'),
    ('Santiago Silva', 'Gas', 5, '5491100000009'),
    ('Matías Benítez', 'Pintura', 5, '5491100000010')
ON CONFLICT DO NOTHING;

-- 3. Tabla de Contrataciones (Registros completados por el bot)
CREATE TABLE IF NOT EXISTS contrataciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono_cliente VARCHAR(30) NOT NULL,
    dni_o_usuario VARCHAR(100),
    oficio_detectado VARCHAR(80),
    problema_descripcion TEXT NOT NULL,
    profesional_nombre VARCHAR(100) NOT NULL,
    fecha_hora_visita VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    estado VARCHAR(30) DEFAULT 'confirmada',     -- confirmada, en_progreso, completada, cancelada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Memoria de la conversación (para que el Agente recuerde el contexto)
CREATE TABLE IF NOT EXISTS mensajes_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(50) NOT NULL,            -- Será el número de teléfono del cliente
    message JSONB NOT NULL,                     -- Estructura de mensaje { role: 'user'|'assistant', text: '...' }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_session ON mensajes_historial (session_id);

-- 5. Control de uso mensual y límite de gasto (1000 mensajes gratis de Meta)
CREATE TABLE IF NOT EXISTS uso_mensual (
    id SERIAL PRIMARY KEY,
    mes_ano VARCHAR(7) UNIQUE NOT NULL,         -- Formato: '2026-10'
    mensajes_enviados INT DEFAULT 0,
    limite_mensual INT DEFAULT 950,             -- Alerta preventiva antes de los 1000
    limite_bloqueo INT DEFAULT 1000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inicializar el mes actual
INSERT INTO uso_mensual (mes_ano, mensajes_enviados, limite_mensual, limite_bloqueo)
VALUES (TO_CHAR(NOW(), 'YYYY-MM'), 0, 950, 1000)
ON CONFLICT (mes_ano) DO NOTHING;

-- 6. Función para incrementar y verificar contador de mensajes
CREATE OR REPLACE FUNCTION registrar_mensaje_saliente()
RETURNS BOOLEAN AS $$
DECLARE
    mes_actual VARCHAR(7) := TO_CHAR(NOW(), 'YYYY-MM');
    actual_count INT;
    max_count INT;
BEGIN
    INSERT INTO uso_mensual (mes_ano, mensajes_enviados)
    VALUES (mes_actual, 1)
    ON CONFLICT (mes_ano) DO UPDATE
    SET mensajes_enviados = uso_mensual.mensajes_enviados + 1,
        updated_at = NOW()
    RETURNING mensajes_enviados, limite_bloqueo INTO actual_count, max_count;

    IF actual_count > max_count THEN
        RETURN FALSE; -- Superó el límite
    ELSE
        RETURN TRUE;  -- Dentro del límite
    END IF;
END;
$$ LANGUAGE plpgsql;
