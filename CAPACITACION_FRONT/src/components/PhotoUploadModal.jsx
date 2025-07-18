import React, { useState, useRef } from 'react';
import { api } from '../utils/api';

export default function PhotoUploadModal({ isOpen, onClose, onPhotoUpdate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const fileInputRef = useRef(null);

  // Cargar foto actual al abrir el modal
  React.useEffect(() => {
    if (isOpen) {
      loadCurrentPhoto();
    }
  }, [isOpen]);

  const loadCurrentPhoto = async () => {
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
        setCurrentPhoto(data.foto_url);
      } else if (response.status === 404) {
        setCurrentPhoto(null);
      }
    } catch (error) {
      console.error('Error al cargar foto actual:', error);
      setCurrentPhoto(null);
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido.');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB permitido.');
        return;
      }

      setSelectedFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('foto', selectedFile);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/fotos-perfil/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentPhoto(data.fotoUrl);
        onPhotoUpdate(data.fotoUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        alert('Foto de perfil actualizada correctamente');
      } else {
        const errorData = await response.json();
        alert(`Error al subir foto: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error al subir foto:', error);
      alert('Error al subir la foto. Intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentPhoto) return;

    if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) {
      return;
    }

    setDeleting(true);
    try {
      const dni = localStorage.getItem('dni') || getDniFromToken();
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/fotos-perfil/${dni}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCurrentPhoto(null);
        onPhotoUpdate(null);
        alert('Foto de perfil eliminada correctamente');
      } else {
        const errorData = await response.json();
        alert(`Error al eliminar foto: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error al eliminar foto:', error);
      alert('Error al eliminar la foto. Intenta nuevamente.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Foto de Perfil</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Foto actual */}
        {currentPhoto && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Foto actual:</h3>
            <div className="relative inline-block">
              <img
                src={currentPhoto}
                alt="Foto de perfil actual"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? '...' : '×'}
              </button>
            </div>
          </div>
        )}

        {/* Subir nueva foto */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {currentPhoto ? 'Cambiar foto:' : 'Subir foto:'}
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Vista previa:</h3>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : 'Subir Foto'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 