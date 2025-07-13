# Backend de Capacitaciones

## Configuración Inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
npm run setup
```

Esto creará un archivo `.env` con la configuración base. **Edita este archivo** con tus credenciales reales:

```env
SQL_SERVER=172.16.248.48
SQL_DATABASE=tu_base_de_datos_real
SQL_USER=tu_usuario_real
SQL_PASSWORD=tu_contraseña_real
SQL_PORT=1433
PORT=3001
JWT_SECRET=una_clave_secreta_muy_segura
```

### 3. Verificar conexión a SQL Server
```bash
npm start
```

## Solución de Problemas

### Error: "Failed to connect to SQL Server"
- Verifica que el servidor SQL Server esté ejecutándose
- Verifica que las credenciales en `.env` sean correctas
- Verifica que puedas conectarte desde tu máquina al servidor
- Verifica que el puerto 1433 esté abierto

### Error: "dniCap: 'null'"
- Verifica que hayas iniciado sesión correctamente
- Verifica que el token JWT sea válido
- Limpia el localStorage del navegador y vuelve a iniciar sesión

### Error: "Variables de entorno faltantes"
- Ejecuta `npm run setup` para crear el archivo `.env`
- Verifica que el archivo `.env` esté en la carpeta correcta
- Verifica que todas las variables estén definidas

## Estructura de la Base de Datos

El sistema espera las siguientes tablas en SQL Server:

- `PRI.Empleados` - Capacitadores
- `Postulantes_En_Formacion` - Postulantes por capacitación
- `Asistencia_Formacion` - Registro de asistencias
- `Deserciones_Formacion` - Registro de deserciones
- `Evaluaciones_Formacion` - Notas de evaluaciones

## Endpoints de la API

- `POST /api/login` - Autenticación
- `GET /api/capas` - Obtener campañas
- `GET /api/postulantes` - Obtener postulantes
- `POST /api/asistencia/bulk` - Guardar asistencias
- `GET /api/deserciones` - Obtener deserciones
- `POST /api/deserciones/bulk` - Guardar deserciones
- `GET /api/evaluaciones` - Obtener evaluaciones
- `POST /api/evaluaciones/bulk` - Guardar evaluaciones 