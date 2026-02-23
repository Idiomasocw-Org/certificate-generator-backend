# 🎓 Generador de Certificados — Backend API

API REST para la gestión de certificados académicos de **Idiomas OCW (One Culture World)**.  
Maneja autenticación de docentes, generación de certificados PDF personalizados y almacenamiento del historial.

---

## 📋 Tabla de Contenidos

- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Ejecución](#-ejecución)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Endpoints de la API](#-endpoints-de-la-api)
- [Seguridad](#-seguridad)
- [Despliegue en Producción](#-despliegue-en-producción)

---

## 🛠 Requisitos Previos

| Herramienta | Versión mínima |
|-------------|---------------|
| **Node.js** | v18 o superior |
| **npm** | v9 o superior |
| **Supabase** | Proyecto activo con Auth habilitado |

---

## 📦 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/Idiomasocw-Org/certificate-generator-backend.git

# 2. Entrar al directorio
cd certificate-generator-backend

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno
#    Copiar el archivo de ejemplo y completar con tus valores
cp .env.example .env
```

---

## 🔐 Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | Clave de servicio (service_role) de Supabase | `eyJhbGciOi...` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT (mín. 32 caracteres) | `mi-clave-super-segura-123` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` o `production` |
| `RESEND_API_KEY` | Clave de API de Resend para envío de correos | `re_xxxx` |
| `FRONTEND_URL` | URL del frontend (para enlaces de recuperación) | `http://localhost:5173` |

> ⚠️ **IMPORTANTE**: Nunca subas el archivo `.env` a GitHub. Ya está incluido en `.gitignore`.

---

## ▶️ Ejecución

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

El servidor se iniciará en `http://localhost:3000` (o el puerto configurado).

Para verificar que funciona, visita:
```
http://localhost:3000/
```
Deberías ver: `{"status":"UP","timestamp":"..."}`

---

## 🏗 Arquitectura del Proyecto

```
certificate-generator-backend/
├── src/
│   ├── index.js              # Punto de entrada - Configura Express, CORS, rutas
│   ├── assets/
│   │   ├── fonts/            # Fuentes personalizadas (Oswald, Montserrat)
│   │   └── templates/        # Plantilla PDF del certificado
│   ├── lib/
│   │   ├── supabase.js       # Cliente de Supabase (normal y autenticado)
│   │   ├── pdf.js            # Lógica de generación del PDF
│   │   └── utils.js          # Utilidades (opciones de cookies, constantes)
│   ├── middleware/
│   │   ├── auth.js           # Middleware de autenticación (verifica token)
│   │   └── rateLimiter.js    # Limitador de peticiones (anti-abuso)
│   └── routes/
│       ├── auth.js           # Rutas de autenticación (registro, login, etc.)
│       └── certificates.js   # Rutas de certificados (generar, historial)
├── .env.example              # Ejemplo de variables de entorno
├── .gitignore                # Archivos ignorados por Git
└── package.json              # Dependencias y scripts
```

### Tecnologías principales:
- **Express.js** — Servidor HTTP
- **Supabase** — Base de datos y autenticación
- **pdf-lib** — Generación de PDFs
- **Zod** — Validación de datos
- **Helmet** — Seguridad HTTP
- **express-rate-limit** — Protección contra abuso

---

## 📡 Endpoints de la API

### Estado del Servidor

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Estado de salud del servidor |

### Autenticación (`/api/auth`)

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `POST` | `/api/auth/register` | Registrar nuevo docente | ❌ No |
| `POST` | `/api/auth/login` | Iniciar sesión | ❌ No |
| `POST` | `/api/auth/logout` | Cerrar sesión | ❌ No |
| `GET` | `/api/auth/me` | Obtener datos del usuario actual | ✅ Sí |
| `POST` | `/api/auth/refresh` | Refrescar token de sesión | 🍪 Cookie |
| `POST` | `/api/auth/forgot-password` | Solicitar correo de recuperación | ❌ No |
| `POST` | `/api/auth/update-password` | Actualizar contraseña (desde enlace) | ✅ Sí (Bearer) |
| `POST` | `/api/auth/change-password` | Cambiar contraseña (usuario logueado) | ✅ Sí (Cookie) |

### Certificados (`/api/certificates`)

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `GET` | `/api/certificates` | Obtener historial de certificados | ✅ Sí |
| `POST` | `/api/certificates` | Generar nuevo certificado PDF | ✅ Sí |

### Detalle de Endpoints

#### `POST /api/auth/register`
```json
// Cuerpo de la petición
{
  "email": "docente@ejemplo.com",
  "password": "MiContraseña123"
}

// Respuesta exitosa (201)
{
  "message": "Usuario registrado. Por favor verifica tu correo electrónico.",
  "user": { "id": "...", "email": "docente@ejemplo.com" }
}
```

**Requisitos de contraseña:**
- Mínimo 8 caracteres
- Al menos 1 letra mayúscula
- Al menos 1 número

#### `POST /api/auth/login`
```json
// Cuerpo de la petición
{
  "email": "docente@ejemplo.com",
  "password": "MiContraseña123"
}

// Respuesta exitosa (200)
// Además establece cookies HTTP-only: auth_token y refresh_token
{
  "user": { "id": "...", "email": "docente@ejemplo.com" },
  "session": { ... }
}
```

#### `POST /api/certificates`
```json
// Cuerpo de la petición
{
  "studentName": "María García López",
  "level": "B2",
  "date": "2026-02-20"
}

// Respuesta exitosa: archivo PDF (Content-Type: application/pdf)
```

**Niveles permitidos:** `A1`, `A2`, `B1`, `B2`, `C1`

---

## 🔒 Seguridad

La aplicación implementa múltiples capas de seguridad:

| Capa | Implementación |
|------|---------------|
| **Autenticación** | Supabase Auth con tokens JWT |
| **Cookies seguras** | HTTP-only, Secure (en producción), SameSite: Lax |
| **Validación de datos** | Zod en todas las entradas del usuario |
| **Limitación de tasa** | express-rate-limit en rutas de autenticación |
| **Cabeceras HTTP** | Helmet para protección contra ataques comunes |
| **CORS** | Orígenes permitidos configurados explícitamente |
| **RLS** | Políticas de Row Level Security en Supabase |

---

## 🌐 Despliegue en Producción

### Opción 1: Render.com (Recomendado)

1. Conecta tu repositorio de GitHub en [render.com](https://render.com)
2. Selecciona **Web Service**
3. Configura:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Agrega todas las variables de entorno en el panel de Render
5. Cambia `NODE_ENV` a `production`

### Opción 2: Railway.app

1. Conecta tu repositorio en [railway.app](https://railway.app)
2. Railway detecta automáticamente la configuración
3. Agrega las variables de entorno
4. Despliega

### Variables importantes para producción:
- `NODE_ENV=production` — Activa cookies seguras (HTTPS)
- `FRONTEND_URL` — Debe apuntar al dominio real del frontend

---

## 📖 Base de Datos (Supabase)

### Tabla: `certificates_history`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único (auto-generado) |
| `user_id` | UUID | ID del docente que generó el certificado |
| `student_name` | TEXT | Nombre del estudiante |
| `course_level` | TEXT | Nivel del curso (A1-C1) |
| `completion_date` | DATE | Fecha de finalización |
| `created_at` | TIMESTAMP | Fecha de creación del registro |

### Políticas RLS activas:
- Los usuarios autenticados solo pueden ver **sus propios** certificados
- Los usuarios autenticados solo pueden insertar certificados **con su propio** `user_id`

---

## 📄 Licencia

ISC — Idiomas OCW © 2026
