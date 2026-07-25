-- ============================================================
-- VISTAS PARA POWER BI
-- ============================================================

-- Ventas detalladas por producto
CREATE OR REPLACE VIEW vw_ventas_detalle AS
SELECT
    v.id                        AS venta_id,
    v.creado_en                 AS fecha_venta,
    DATE(v.creado_en)           AS fecha,
    EXTRACT(HOUR FROM v.creado_en) AS hora,
    p.tipo                      AS tipo_pedido,
    m.numero                    AS mesa_numero,
    pr.nombre                   AS producto,
    c.nombre                    AS categoria,
    dp.cantidad,
    dp.precio_unitario,
    dp.subtotal,
    v.metodo_pago,
    u.nombre                    AS cajero
FROM ventas v
JOIN pedidos p       ON p.id = v.pedido_id
JOIN detalle_pedidos dp ON dp.pedido_id = p.id
JOIN productos pr    ON pr.id = dp.producto_id
LEFT JOIN categorias c  ON c.id = pr.categoria_id
LEFT JOIN mesas m    ON m.id = p.mesa_id
LEFT JOIN usuarios u ON u.id = v.cajero_id;

-- Resumen de ventas por día
CREATE OR REPLACE VIEW vw_ventas_diarias AS
SELECT
    DATE(v.creado_en)   AS fecha,
    COUNT(v.id)         AS total_ventas,
    SUM(v.total)        AS ingresos_total,
    AVG(v.total)        AS ticket_promedio,
    SUM(CASE WHEN p.tipo = 'delivery' THEN 1 ELSE 0 END) AS pedidos_delivery,
    SUM(CASE WHEN p.tipo = 'mesa'     THEN 1 ELSE 0 END) AS pedidos_mesa
FROM ventas v
JOIN pedidos p ON p.id = v.pedido_id
WHERE v.estado_pago = 'pagado'
GROUP BY DATE(v.creado_en)
ORDER BY fecha DESC;

-- Productos más vendidos
CREATE OR REPLACE VIEW vw_productos_top AS
SELECT
    pr.nombre           AS producto,
    c.nombre            AS categoria,
    SUM(dp.cantidad)    AS unidades_vendidas,
    SUM(dp.subtotal)    AS ingresos_total
FROM detalle_pedidos dp
JOIN pedidos p      ON p.id = dp.pedido_id
JOIN ventas v       ON v.pedido_id = p.id
JOIN productos pr   ON pr.id = dp.producto_id
LEFT JOIN categorias c ON c.id = pr.categoria_id
WHERE v.estado_pago = 'pagado'
GROUP BY pr.nombre, c.nombre
ORDER BY unidades_vendidas DESC;

-- Estado actual del inventario con alertas
CREATE OR REPLACE VIEW vw_inventario_estado AS
SELECT
    i.id,
    i.nombre,
    i.unidad,
    i.stock_actual,
    i.stock_minimo,
    i.contabilizar,
    CASE
        WHEN i.stock_actual <= 0            THEN 'sin_stock'
        WHEN i.stock_actual <= i.stock_minimo THEN 'stock_bajo'
        ELSE 'ok'
    END AS alerta
FROM insumos i
ORDER BY alerta DESC, i.nombre;

-- Movimientos de inventario detallados
CREATE OR REPLACE VIEW vw_inventario_movimientos AS
SELECT
    im.creado_en        AS fecha,
    i.nombre            AS insumo,
    i.unidad,
    im.tipo,
    im.cantidad,
    im.stock_anterior,
    im.stock_nuevo,
    im.referencia,
    u.nombre            AS usuario
FROM inventario_movimientos im
JOIN insumos i          ON i.id = im.insumo_id
LEFT JOIN usuarios u    ON u.id = im.usuario_id
ORDER BY im.creado_en DESC;
