-- ============================================================
-- RESTAURANTE APP - Esquema de Base de Datos
-- Supabase (PostgreSQL)
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE rol_usuario AS ENUM ('dueno', 'cajero', 'mesero');
CREATE TYPE estado_mesa AS ENUM ('disponible', 'ocupada', 'reservada', 'cuenta_pedida');
CREATE TYPE tipo_pedido AS ENUM ('mesa', 'delivery');
CREATE TYPE estado_pedido AS ENUM ('abierto', 'en_cocina', 'listo', 'cerrado', 'cancelado');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'pagado', 'anulado');
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'otro');
CREATE TYPE tipo_movimiento AS ENUM ('entrada', 'salida', 'ajuste');
CREATE TYPE unidad_medida AS ENUM ('unidad', 'kg', 'g', 'litro', 'ml', 'porcion');

-- ============================================================
-- USUARIOS (manejado por Supabase Auth + esta tabla de perfil)
-- ============================================================
CREATE TABLE usuarios (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre      VARCHAR(100) NOT NULL,
    rol         rol_usuario NOT NULL DEFAULT 'mesero',
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORÍAS DE PRODUCTOS
-- ============================================================
CREATE TABLE categorias (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT
);

-- ============================================================
-- PRODUCTOS (menú del restaurante)
-- ============================================================
CREATE TABLE productos (
    id              SERIAL PRIMARY KEY,
    categoria_id    INT REFERENCES categorias(id) ON DELETE SET NULL,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     TEXT,
    precio          NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    disponible      BOOLEAN NOT NULL DEFAULT TRUE,
    imagen_url      TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INSUMOS / INVENTARIO
-- ============================================================
CREATE TABLE insumos (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(120) NOT NULL,
    unidad              unidad_medida NOT NULL DEFAULT 'unidad',
    stock_actual        NUMERIC(12,3) NOT NULL DEFAULT 0,
    stock_minimo        NUMERIC(12,3) NOT NULL DEFAULT 0,   -- alerta de reposición
    contabilizar        BOOLEAN NOT NULL DEFAULT TRUE,       -- false = insumos difíciles de medir
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECETAS: qué insumos consume cada producto
-- ============================================================
CREATE TABLE recetas (
    id          SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    insumo_id   INT NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
    cantidad    NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
    UNIQUE (producto_id, insumo_id)
);

-- ============================================================
-- MESAS
-- ============================================================
CREATE TABLE mesas (
    id          SERIAL PRIMARY KEY,
    numero      INT NOT NULL UNIQUE,
    capacidad   INT NOT NULL DEFAULT 4,
    estado      estado_mesa NOT NULL DEFAULT 'disponible'
);

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE pedidos (
    id              SERIAL PRIMARY KEY,
    tipo            tipo_pedido NOT NULL DEFAULT 'mesa',
    mesa_id         INT REFERENCES mesas(id) ON DELETE SET NULL,  -- null si es delivery
    usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado          estado_pedido NOT NULL DEFAULT 'abierto',
    -- Datos delivery
    cliente_nombre  VARCHAR(120),
    cliente_telefono VARCHAR(20),
    direccion_entrega TEXT,
    -- Totales
    subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuento       NUMERIC(10,2) NOT NULL DEFAULT 0,
    total           NUMERIC(10,2) GENERATED ALWAYS AS (subtotal - descuento) STORED,
    notas           TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cerrado_en      TIMESTAMPTZ
);

-- ============================================================
-- DETALLE DE PEDIDOS
-- ============================================================
CREATE TABLE detalle_pedidos (
    id              SERIAL PRIMARY KEY,
    pedido_id       INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad        INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL,  -- precio al momento de la venta
    subtotal        NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    notas           TEXT                      -- ej: "sin cebolla"
);

-- ============================================================
-- VENTAS (se crea al cerrar un pedido)
-- ============================================================
CREATE TABLE ventas (
    id              SERIAL PRIMARY KEY,
    pedido_id       INT NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE RESTRICT,
    cajero_id       UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    metodo_pago     metodo_pago NOT NULL DEFAULT 'efectivo',
    estado_pago     estado_pago NOT NULL DEFAULT 'pagado',
    total           NUMERIC(10,2) NOT NULL,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MOVIMIENTOS DE INVENTARIO
-- ============================================================
CREATE TABLE inventario_movimientos (
    id              SERIAL PRIMARY KEY,
    insumo_id       INT NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
    tipo            tipo_movimiento NOT NULL,
    cantidad        NUMERIC(12,3) NOT NULL,
    stock_anterior  NUMERIC(12,3) NOT NULL,
    stock_nuevo     NUMERIC(12,3) NOT NULL,
    referencia      VARCHAR(100),   -- ej: "Pedido #45", "Compra proveedor"
    usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_pedidos_estado        ON pedidos(estado);
CREATE INDEX idx_pedidos_creado_en     ON pedidos(creado_en);
CREATE INDEX idx_ventas_creado_en      ON ventas(creado_en);
CREATE INDEX idx_detalle_pedido        ON detalle_pedidos(pedido_id);
CREATE INDEX idx_movimientos_insumo    ON inventario_movimientos(insumo_id);
CREATE INDEX idx_movimientos_creado_en ON inventario_movimientos(creado_en);

-- ============================================================
-- FUNCIÓN: descontar inventario al cerrar pedido
-- ============================================================
CREATE OR REPLACE FUNCTION descontar_inventario_pedido(p_pedido_id INT, p_usuario_id UUID)
RETURNS VOID AS $$
DECLARE
    v_detalle   RECORD;
    v_receta    RECORD;
    v_stock_ant NUMERIC;
    v_stock_nvo NUMERIC;
BEGIN
    FOR v_detalle IN
        SELECT producto_id, cantidad FROM detalle_pedidos WHERE pedido_id = p_pedido_id
    LOOP
        FOR v_receta IN
            SELECT insumo_id, cantidad FROM recetas
            WHERE producto_id = v_detalle.producto_id
        LOOP
            SELECT stock_actual INTO v_stock_ant FROM insumos
            WHERE id = v_receta.insumo_id AND contabilizar = TRUE FOR UPDATE;

            CONTINUE WHEN NOT FOUND;

            v_stock_nvo := v_stock_ant - (v_receta.cantidad * v_detalle.cantidad);

            UPDATE insumos SET stock_actual = v_stock_nvo WHERE id = v_receta.insumo_id;

            INSERT INTO inventario_movimientos
                (insumo_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
            VALUES
                (v_receta.insumo_id, 'salida', v_receta.cantidad * v_detalle.cantidad,
                 v_stock_ant, v_stock_nvo, 'Pedido #' || p_pedido_id, p_usuario_id);
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCIÓN: actualizar subtotal del pedido automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_subtotal_pedido()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pedidos
    SET subtotal = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM detalle_pedidos
        WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
    )
    WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_subtotal
AFTER INSERT OR UPDATE OR DELETE ON detalle_pedidos
FOR EACH ROW EXECUTE FUNCTION actualizar_subtotal_pedido();

-- ============================================================
-- DATOS INICIALES
-- ============================================================
INSERT INTO categorias (nombre) VALUES
    ('Entradas'),
    ('Platos Principales'),
    ('Bebidas'),
    ('Postres'),
    ('Combos');

INSERT INTO mesas (numero, capacidad) VALUES
    (1, 2), (2, 4), (3, 4), (4, 6), (5, 6),
    (6, 8), (7, 2), (8, 4), (9, 4), (10, 8);
