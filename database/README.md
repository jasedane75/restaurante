# Restaurante App — Base de Datos

## Archivos SQL (ejecutar en orden)

| Archivo | Contenido |
|---------|-----------|
| `01_schema.sql` | Tablas, tipos, funciones, triggers, datos iniciales |
| `02_views_powerbi.sql` | Vistas optimizadas para Power BI |
| `03_rls_policies.sql` | Seguridad por rol (Row Level Security) |

---

## Configurar Supabase (paso a paso)

1. Crear cuenta en https://supabase.com (gratis)
2. Crear nuevo proyecto → anotar:
   - `Project URL`
   - `anon public key`
   - `service_role key` (solo backend)
3. Ir a **SQL Editor** en el dashboard
4. Ejecutar los 3 archivos en orden

---

## Modelo de datos

```
categorias
    └── productos
            └── recetas ──→ insumos
                                └── inventario_movimientos

usuarios (Supabase Auth)
    └── pedidos
            ├── detalle_pedidos ──→ productos
            └── ventas
mesas ──→ pedidos
```

---

## Roles del sistema

| Rol | Permisos |
|-----|----------|
| `dueno` | Acceso total |
| `cajero` | Pedidos, ventas, lectura inventario |
| `mesero` | Sus propios pedidos, lectura menú y mesas |

---

## Conexión Power BI

1. Power BI Desktop → **Obtener datos** → **PostgreSQL**
2. Servidor: `db.<project-ref>.supabase.co`
3. Puerto: `5432`
4. Base de datos: `postgres`
5. Usuario: `postgres`
6. Contraseña: la del proyecto Supabase
7. Importar las vistas: `vw_ventas_detalle`, `vw_ventas_diarias`, `vw_productos_top`, `vw_inventario_estado`

---

## Próximo paso

→ `backend/` — API con FastAPI
