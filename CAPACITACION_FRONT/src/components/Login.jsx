import { useState } from 'react';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error de autenticación');
        setLoading(false);
        return;
      }
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('nombres', data.nombres);
      localStorage.setItem('apellidoPaterno', data.apellidoPaterno);
      localStorage.setItem('apellidoMaterno', data.apellidoMaterno);
      localStorage.setItem('rol', data.rol);
      localStorage.removeItem('nombre');
      window.location.reload();
    } catch (e) {
      setError('Error de red');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#297373] to-[#FE7F2D]">
      {/* Tarjeta */}
      <div className="bg-white/10 backdrop-blur-lg px-10 py-12 rounded-3xl w-96 shadow-xl text-white">
        {/* Logo + título */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 bg-white/20 rounded-full mb-4 flex items-center justify-center">
            <img src="/partner.svg" alt="logo" className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-semibold">Iniciar Sesión</h2>
        </div>
        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <input
            className="w-full mb-4 p-3 bg-white/20 placeholder-white/80 text-white border border-white/30 rounded-2xl focus:ring-2 focus:ring-[#FE7F2D] outline-none"
            placeholder="Usuario"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            autoFocus
            required
          />
          <div className="relative mb-6">
            <input
              className="w-full p-3 pr-10 bg-white/20 placeholder-white/80 text-white border border-white/30 rounded-2xl focus:ring-2 focus:ring-[#FE7F2D] outline-none"
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña"
              value={contrasena}
              onChange={e => setContrasena(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
              tabIndex={-1}
              onClick={() => setShowPass(v => !v)}
            >
              {showPass ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9.88 9.88a3 3 0 104.24 4.24M15.54 15.54C14.34 16.54 12.74 17 11 17c-4 0-7-4.5-7-4.5a12.17 12.17 0 014.88-4.88 12.16 12.16 0 014.88 4.88s-.25.33-.72.73" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-3 9c-4.5 0-8.31-3.5-10-7.5 1.69-4 5.5-7.5 10-7.5s8.31 3.5 10 7.5c-1.69 4-5.5 7.5-10 7.5z" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#297373] to-[#FE7F2D] font-semibold hover:opacity-90 transition"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
      {/* Modal de error */}
      {error && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error de autenticación</h3>
            <p className="text-sm text-gray-500 mb-4">
              {error}
            </p>
            <button
              className="w-full py-2 rounded-full bg-[#297373] text-white font-medium hover:bg-[#256d6d]"
              onClick={() => setError('')}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 