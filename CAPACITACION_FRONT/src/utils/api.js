import config, { buildApiUrl } from '../config/index.js';

// Función principal para hacer llamadas a la API
export const api = (endpoint, opts = {}) => {
  const token = localStorage.getItem('token');
  const headers = opts.headers ? { ...opts.headers } : {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  // Si el endpoint ya es una URL completa, usarla directamente
  // Si no, construir la URL usando la configuración
  const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
  
  return fetch(url, { ...opts, headers }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};

// Función específica para fetch directo (mantener compatibilidad)
export const fetchApi = (url, opts = {}) => {
  const token = localStorage.getItem('token');
  const headers = opts.headers ? { ...opts.headers } : {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  return fetch(url, { ...opts, headers }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};
