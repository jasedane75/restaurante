# 🚀 Guía de Deploy — Restaurante App

## Orden de ejecución
1. Supabase  (base de datos)
2. Render    (backend)
3. Vercel    (frontend)

---

## PASO 1 — Supabase

### 1.1 Crear proyecto
1. Ir a https://supabase.com → **Start your project**
2. Crear cuenta con GitHub (gratis)
3. **New project** → llenar:
   - Name: `restaurante-app`
   - Database Password: (guardar esto, lo necesitas después)
   - Region: el más cercano a tu país
4. Esperar ~2 minutos a que el proyecto se cree

### 1.2 Ejecutar el esquema SQL
1. En el dashboard → **SQL Editor** → **New query**
2. Copiar y pegar el contenido de `database/01_schema.sql` → **Run**
3. Repetir con `database/02_views_powerbi.sql`
4. Repetir con `database/03_rls_policies.sql`

### 1.3 Anotar las credenciales
Ir a **Settings → API** y copiar:

| Variable          | Dónde encontrarla              |
|-------------------|-------------------------------|
| `SUPABASE_URL`    | Project URL                   |
| `SUPABASE_KEY`    | anon / public key             |
| `SUPABASE_SERVICE_KEY` | service_role key (secreto) |
| `JWT_SECRET`      | Settings → API → JWT Secret   |

### 1.4 Crear primer usuario (dueño)
1. Ir a **Authentication → Users → Add user**
2. Email + contraseña del dueño
3. Luego en **SQL Editor** ejecutar:
```sql
INSERT INTO usuarios (id, nombre, rol)
VALUES (
  '<uuid-del-usuario-creado>',
  'Nombre del Dueño',
  'dueno'
);
```
Password_secure_2027.
---

## PASO 2 — Render (Backend)

### 2.1 Subir código a GitHub
```bash
cd restaurante-app
git init
git add .
git commit -m "initial commit"
# Crear repo en github.com y luego:
git remote add origin https://github.com/<tu-usuario>/restaurante-app.git
git push -u origin main
```

### 2.2 Crear servicio en Render
1. Ir a https://render.com → **New → Web Service**
2. Conectar tu cuenta de GitHub
3. Seleccionar el repo `restaurante-app`
4. Configurar:
   - **Name**: `restaurante-api`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

### 2.3 Agregar variables de entorno en Render
En **Environment → Add Environment Variable**:

| Key                  | Value                          |
|----------------------|-------------------------------|
| `SUPABASE_URL`       | (del paso 1.3)                |
| `SUPABASE_KEY`       | (del paso 1.3)                |
| `SUPABASE_SERVICE_KEY` | (del paso 1.3)              |
| `JWT_SECRET`         | (del paso 1.3)                |
| `FRONTEND_URL`       | (lo agregas después del paso 3) |

5. Click **Create Web Service**
6. Esperar el deploy (~3 min)
7. Anotar la URL: `https://restaurante-api.onrender.com`
8. Verificar: abrir `https://restaurante-api.onrender.com/docs`

---

## PASO 3 — Vercel (Frontend)

### 3.1 Crear proyecto en Vercel
1. Ir a https://vercel.com → **Add New → Project**
2. Importar el mismo repo de GitHub
3. Configurar:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.2 Agregar variables de entorno en Vercel
En **Settings → Environment Variables**:

| Key             | Value                                    |
|-----------------|------------------------------------------|
| `VITE_API_URL`  | `https://restaurante-api.onrender.com`   |

4. Click **Deploy**
5. Anotar la URL: `https://restaurante-app.vercel.app`

### 3.3 Actualizar CORS en Render
Volver a Render → **Environment** → agregar:

| Key            | Value                                   |
|----------------|-----------------------------------------|
| `FRONTEND_URL` | `https://restaurante-app.vercel.app`    |

Render redesplegará automáticamente.

---

## PASO 4 — Crear usuarios del sistema

En **Supabase → Authentication → Users → Add user** crear uno por cada empleado.
Luego en SQL Editor registrar su perfil:

```sql
-- Cajero
INSERT INTO usuarios (id, nombre, rol)
VALUES ('<uuid>', 'María García', 'cajero');

-- Mesero
INSERT INTO usuarios (id, nombre, rol)
VALUES ('<uuid>', 'Carlos López', 'mesero');
```

---

## PASO 5 — Conectar Power BI

1. Abrir **Power BI Desktop**
2. **Obtener datos → Base de datos PostgreSQL**
3. Servidor: `db.<project-ref>.supabase.co:5432`
4. Base de datos: `postgres`
5. Usuario: `postgres`
6. Contraseña: la del paso 1.1
7. Importar las vistas:
   - `vw_ventas_detalle`
   - `vw_ventas_diarias`
   - `vw_productos_top`
   - `vw_inventario_estado`

---

## Resumen de URLs finales

| Servicio   | URL                                        |
|------------|--------------------------------------------|
| Frontend   | https://restaurante-app.vercel.app         |
| Backend    | https://restaurante-api.onrender.com       |
| API Docs   | https://restaurante-api.onrender.com/docs  |
| Supabase   | https://supabase.com/dashboard             |

---

## ⚠️ Notas importantes

- **Render free tier**: el servicio se "duerme" tras 15 min de inactividad.
  El primer request tarda ~30 seg en despertar. Para evitarlo considera
  usar un cron job gratuito en https://cron-job.org que haga ping cada 10 min.
- **Supabase free tier**: límite de 500MB de base de datos y 50.000 usuarios activos/mes.
- Nunca subas el archivo `.env` a GitHub (ya está en `.gitignore`).
