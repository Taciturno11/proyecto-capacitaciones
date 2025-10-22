# Sistema de Capacitaciones - Configuración Simplificada

Este documento explica cómo configurar las variables de entorno mínimas necesarias para hacer el proyecto completamente portable.

## 📁 Estructura de Archivos de Configuración

```
proyecto-capacitaciones/
├── CAPACITACIONES_BACK/
│   ├── .env                    # ← Crear este archivo
│   └── config.example.js       # ← Archivo de ejemplo
└── CAPACITACION_FRONT/
    ├── .env                    # ← Crear este archivo
    └── env.example             # ← Archivo de ejemplo
```

## 🔧 Configuración del Backend (CAPACITACIONES_BACK/.env)

Crea un archivo `.env` en la carpeta `CAPACITACIONES_BACK` con el siguiente contenido:

```env
# Configuración de SQL Server
SQL_SERVER=172.16.248.48
SQL_DATABASE=Partner
SQL_USER=anubis
SQL_PASSWORD='Tg7#kPz9@rLt2025'
SQL_PORT=1433

# Puerto del servidor
PORT=3001

# Clave secreta para JWT (¡CAMBIA ESTA CLAVE!)
JWT_SECRET=un_secreto_super_seguro
```

### Variables del Backend Explicadas:

- **SQL_SERVER**: IP o nombre del servidor de SQL Server
- **SQL_DATABASE**: Nombre de la base de datos
- **SQL_USER**: Usuario de SQL Server
- **SQL_PASSWORD**: Contraseña del usuario
- **SQL_PORT**: Puerto de SQL Server (por defecto 1433)
- **PORT**: Puerto donde correrá el servidor backend
- **JWT_SECRET**: Clave secreta para firmar tokens JWT (¡debe ser única y segura!)

## 🎨 Configuración del Frontend (CAPACITACION_FRONT/.env)

Crea un archivo `.env` en la carpeta `CAPACITACION_FRONT` con el siguiente contenido:

```env
# URL del backend (sin barra final)
VITE_BACKEND_URL=http://10.182.18.70:3001

# Configuración del servidor de desarrollo
VITE_FRONTEND_HOST=0.0.0.0
VITE_FRONTEND_PORT=5174
```

### Variables del Frontend Explicadas:

- **VITE_BACKEND_URL**: URL completa del backend (incluye protocolo y puerto)
- **VITE_FRONTEND_HOST**: Host del servidor de desarrollo (0.0.0.0 para acceso desde red)
- **VITE_FRONTEND_PORT**: Puerto del servidor de desarrollo del frontend

## 🚀 Cómo Migrar a Otro Servidor

### Paso 1: Copiar el Código
```bash
git clone <tu-repositorio>
cd proyecto-capacitaciones
```

### Paso 2: Instalar Dependencias
```bash
# Backend
cd CAPACITACIONES_BACK
npm install

# Frontend
cd ../CAPACITACION_FRONT
npm install --legacy-peer-deps
```

### Paso 3: Configurar Variables de Entorno
1. Copia `config.example.js` como `.env` en `CAPACITACIONES_BACK/`
2. Copia `env.example` como `.env` en `CAPACITACION_FRONT/`
3. Modifica los valores según tu servidor

### Paso 4: Ejecutar
```bash
# Opción 1: Ejecutar ambos servicios por separado
# Terminal 1 - Backend
cd CAPACITACIONES_BACK
npm start

# Terminal 2 - Frontend
cd CAPACITACION_FRONT
npm run dev

# Opción 2: Ejecutar ambos con un comando
cd CAPACITACION_FRONT
npm run dev:all
```

## 🌐 Configuración para Producción

### Backend en Producción:
```env
SQL_SERVER=tu-servidor-produccion
SQL_DATABASE=capacitaciones_prod
SQL_USER=usuario_prod
SQL_PASSWORD=contraseña_super_segura
SQL_PORT=1433
PORT=3003
JWT_SECRET=clave_jwt_muy_segura_y_larga
```

### Frontend en Producción:
```env
VITE_API_BASE_URL=https://api.tu-dominio.com:3003
```

## ⚠️ Consideraciones de Seguridad

1. **NUNCA** subas archivos `.env` al repositorio Git
2. **CAMBIA** la `JWT_SECRET` por una clave única y segura
3. **USA** HTTPS en producción
4. **PROTEGE** las credenciales de la base de datos

## 🔍 Verificación de Configuración

Para verificar que todo está configurado correctamente:

1. **Backend**: Al ejecutar `npm start`, deberías ver:
   ```
   🔧 Configuración de base de datos: { server: '...', database: '...', ... }
   ✅ Conectado a SQL Server
   🚀 http://localhost:3003
   ```

2. **Frontend**: Al ejecutar `npm run dev`, deberías ver:
   ```
   Local:   http://localhost:5175/
   Network: http://0.0.0.0:5175/
   ```

## 📝 Notas Importantes

- **Sin CORS**: El backend no tiene restricciones CORS
- **Sin proxy**: El frontend hace llamadas directas al backend
- **Configuración mínima**: Solo las variables esenciales
- **URLs automáticas**: Los archivos estáticos se construyen automáticamente desde la URL base
- **Completamente portable**: Solo cambias las variables `.env`