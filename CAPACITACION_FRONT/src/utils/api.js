// ❙ utils/api.js  (sin cambios) :contentReference[oaicite:0]{index=0}
export const api = (url, opts = {}) => {
  const token = localStorage.getItem('token');
  const headers = opts.headers ? { ...opts.headers } : {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...opts, headers }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};
