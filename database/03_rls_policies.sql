-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Supabase
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias            ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_rol()
RETURNS rol_usuario AS $$
    SELECT rol FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- POLÍTICAS: todos los usuarios autenticados leen el menú
-- ============================================================
CREATE POLICY "lectura_productos" ON productos
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "lectura_categorias" ON categorias
    FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- POLÍTICAS: mesas - todos leen, mesero/cajero/dueño modifican
-- ============================================================
CREATE POLICY "lectura_mesas" ON mesas
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "modificar_mesas" ON mesas
    FOR ALL TO authenticated
    USING (get_rol() IN ('dueno', 'cajero', 'mesero'));

-- ============================================================
-- POLÍTICAS: pedidos - mesero ve los suyos, cajero/dueño ven todos
-- ============================================================
CREATE POLICY "lectura_pedidos" ON pedidos
    FOR SELECT TO authenticated
    USING (
        get_rol() IN ('dueno', 'cajero')
        OR usuario_id = auth.uid()
    );

CREATE POLICY "crear_pedidos" ON pedidos
    FOR INSERT TO authenticated
    WITH CHECK (get_rol() IN ('dueno', 'cajero', 'mesero'));

CREATE POLICY "modificar_pedidos" ON pedidos
    FOR UPDATE TO authenticated
    USING (
        get_rol() IN ('dueno', 'cajero')
        OR (get_rol() = 'mesero' AND usuario_id = auth.uid() AND estado = 'abierto')
    );

-- ============================================================
-- POLÍTICAS: detalle_pedidos
-- ============================================================
CREATE POLICY "lectura_detalle" ON detalle_pedidos
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "modificar_detalle" ON detalle_pedidos
    FOR ALL TO authenticated
    USING (get_rol() IN ('dueno', 'cajero', 'mesero'));

-- ============================================================
-- POLÍTICAS: ventas - cajero y dueño
-- ============================================================
CREATE POLICY "lectura_ventas" ON ventas
    FOR SELECT TO authenticated
    USING (get_rol() IN ('dueno', 'cajero'));

CREATE POLICY "crear_ventas" ON ventas
    FOR INSERT TO authenticated
    WITH CHECK (get_rol() IN ('dueno', 'cajero'));

-- ============================================================
-- POLÍTICAS: inventario - solo dueño y cajero
-- ============================================================
CREATE POLICY "lectura_insumos" ON insumos
    FOR SELECT TO authenticated
    USING (get_rol() IN ('dueno', 'cajero'));

CREATE POLICY "modificar_insumos" ON insumos
    FOR ALL TO authenticated
    USING (get_rol() = 'dueno');

CREATE POLICY "lectura_movimientos" ON inventario_movimientos
    FOR SELECT TO authenticated
    USING (get_rol() IN ('dueno', 'cajero'));

-- ============================================================
-- POLÍTICAS: usuarios - solo dueño gestiona usuarios
-- ============================================================
CREATE POLICY "lectura_usuarios" ON usuarios
    FOR SELECT TO authenticated
    USING (get_rol() = 'dueno' OR id = auth.uid());

CREATE POLICY "modificar_usuarios" ON usuarios
    FOR ALL TO authenticated
    USING (get_rol() = 'dueno');
