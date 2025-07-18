import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PhotoUploadModal from './PhotoUploadModal';

export default function UserAvatar({ onLogout, marco = 'marco1.png' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const avatarRef = useRef(null);
  const menuRef = useRef(null);

  // Cargar foto de perfil al montar el componente
  useEffect(() => {
    loadUserPhoto();
  }, []);

  const loadUserPhoto = async () => {
    try {
      const dni = localStorage.getItem('dni') || getDniFromToken();
      if (!dni) return;

      const response = await fetch(`/api/fotos-perfil/${dni}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserPhoto(data.foto_url);
      }
    } catch (error) {
      console.error('Error al cargar foto de perfil:', error);
    }
  };

  const getDniFromToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.dni;
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  };

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          avatarRef.current && !avatarRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleAvatarClick = () => {
    setMenuOpen(!menuOpen);
  };

  const handlePhotoUpdate = (newPhotoUrl) => {
    setUserPhoto(newPhotoUrl);
    setPhotoModalOpen(false);
  };

  const nombres = localStorage.getItem('nombres') || '';
  const apellidoPaterno = localStorage.getItem('apellidoPaterno') || '';
  const apellidoMaterno = localStorage.getItem('apellidoMaterno') || '';
  const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();

  // Generar iniciales para el avatar por defecto
  const getInitials = () => {
    const names = nombreCompleto.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    } else if (names.length === 1) {
      return names[0][0].toUpperCase();
    }
    return 'U';
  };

  // Construir la URL absoluta para la foto de perfil
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const photoUrl = userPhoto?.startsWith('/uploads/')
    ? API_URL + userPhoto
    : userPhoto;

  return (
    <>
      <div className="relative flex items-center justify-end" ref={avatarRef} style={{ minWidth: 64, width: 64, height: 64 }}>
        {/* Contenedor del frame que envuelve todo */}
        <div className="relative" style={{ 
          width: '110px', 
          height: '110px', 
          marginLeft: '-23px', 
          marginTop: '2px',
          aspectRatio: '1 / 1'
        }}>
          {/* Avatar centrado detrás del marco */}
          <button
            className="absolute rounded-full shadow-md focus:outline-none bg-white"
            onClick={handleAvatarClick}
            title={nombreCompleto}
            style={{ 
              width: '65px', 
              height: '65px', 
              top: '22.5px', 
              left: '22.5px', 
              zIndex: 0,
              padding: 0,
              aspectRatio: '1 / 1'
            }}
          >
            {userPhoto ? (
              <img
                src={photoUrl}
                alt="Foto de perfil"
                className="w-full h-full object-cover rounded-full"
                style={{ aspectRatio: '1 / 1' }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {getInitials()}
                </span>
              </div>
            )}
          </button>
          {/* Marco por encima del avatar */}
          <img
            src={`/marcos/${marco}`}
            alt="Marco decorativo"
            className="absolute pointer-events-none"
            style={{ 
              width: '100%', 
              height: '100%', 
              top: 0, 
              left: 0, 
              zIndex: 1,
              objectFit: 'contain',
              aspectRatio: '1 / 1'
            }}
          />
        </div>
        
        {menuOpen && createPortal(
          <div
            ref={menuRef}
            className="fixed right-6 top-[100px] w-48 bg-white rounded-xl shadow-lg border border-gray-200 animate-fade-in p-4 user-avatar-menu"
            style={{ minHeight: '200px', zIndex: 99999 }}
          >
            <div className="px-4 py-4 border-b border-gray-100 text-center">
              <div className="font-semibold text-gray-800 truncate">{nombreCompleto}</div>
            </div>
            <button
              className="w-full px-4 py-3 text-left hover:bg-blue-50 text-blue-700 font-medium"
              onClick={() => setPhotoModalOpen(true)}
            >
              Cambiar foto
            </button>
            <button
              className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-600 font-medium border-t border-gray-100 cursor-pointer"
              style={{ zIndex: 10000 }}
              onClick={() => {
                console.log('Botón Cerrar sesión clickeado');
                setMenuOpen(false);
                if (onLogout) {
                  onLogout();
                }
              }}
            >
              Cerrar sesión
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Modal de foto de perfil */}
      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onPhotoUpdate={handlePhotoUpdate}
      />
    </>
  );
} 