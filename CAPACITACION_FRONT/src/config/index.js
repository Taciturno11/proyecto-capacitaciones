// Configuración centralizada del frontend
// Este archivo maneja todas las variables de entorno y configuraciones

const config = {
  // Configuración de la API
  api: {
    baseUrl: import.meta.env.VITE_BACKEND_URL,
    endpoints: {
      login: '/api/login',
      postulantes: '/api/postulantes',
      deserciones: '/api/deserciones',
      evaluaciones: '/api/evaluaciones',
      asistencia: '/api/asistencia',
      fotosPerfil: '/api/fotos-perfil',
      meses: '/api/meses',
      capas: '/api/capas',
      capacitadores: '/api/capacitadores',
      dashboardCoordinadora: '/api/dashboard-coordinadora',
      qentreJefe: '/api/qentre-jefe',
      capacitacionesResumenJefe: '/api/capacitaciones/resumen-jefe',
      capacitacionesOpcionesFiltros: '/api/capacitaciones/opciones-filtros',
      horariosBase: '/api/horarios-base'
    }
  },
  
  // Configuración de archivos estáticos (se construye automáticamente)
  uploads: {
    get baseUrl() {
      return `${config.api.baseUrl}/uploads`;
    }
  },
  
  // Configuración de la aplicación
  app: {
    name: 'Sistema de Capacitaciones',
    version: '1.0.0'
  }
};

// Función helper para construir URLs completas
export const buildApiUrl = (endpoint) => {
  return `${config.api.baseUrl}${endpoint}`;
};

// Función helper para construir URLs de archivos
export const buildUploadUrl = (filename) => {
  return `${config.uploads.baseUrl}/${filename}`;
};

export default config;
