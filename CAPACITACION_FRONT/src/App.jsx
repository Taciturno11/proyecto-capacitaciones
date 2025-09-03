import React, { useRef, useState, useEffect } from "react";
import ToggleTabs        from "./components/ToggleTabs";
import AsistenciasTable  from "./components/AsistenciasTable";
import EvaluacionesTable from "./components/EvaluacionesTable";
import DesercionesTable  from "./components/DesercionesTable";
import ResumenCard       from "./components/ResumenCard";
import usePostulantes    from "./hooks/usePostulantes";
import Login from "./components/Login";
import { api } from "./utils/api";
import { createPortal } from "react-dom";
import { descargarExcel } from "./utils/excel";
import DashboardCoordinadora from "./components/DashboardCoordinadora";
import UserAvatar from "./components/UserAvatar";
import TiendaMarcos from "./components/TiendaMarcos";
import RuletaPuntos from "./components/RuletaPuntos";
import Avataaars from 'avataaars';
import SelectorBar from "./components/SelectorBar";

function getDniFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.dni) throw new Error('No dni');
    return payload.dni;
  } catch (error) {
    console.error('Error al decodificar token:', error);
    // Limpiar token inválido
    localStorage.removeItem('token');
    localStorage.removeItem('nombres');
    localStorage.removeItem('apellidoPaterno');
    localStorage.removeItem('apellidoMaterno');
    return null;
  }
}

function getMostRecentCapa(capas) {
  if (!capas.length) return null;
  return capas.reduce((a, b) => (a.fechaInicio > b.fechaInicio ? a : b));
}

export default function App() {
  const token = localStorage.getItem('token');
  const dniCap = getDniFromToken();
  const rol = localStorage.getItem('rol');

  // Todos los hooks deben ir antes de cualquier return condicional
  const [capas, setCapas] = useState([]);
  const [capaSeleccionada, setCapaSeleccionada] = useState(null);
  const [vista, setVista] = useState("asist");
  const post = usePostulantes();
  const [sinDatos, setSinDatos] = useState(false);
  const [campaniaSeleccionada, setCampaniaSeleccionada] = useState("");
  const [showResumen, setShowResumen] = useState(false);
  const resumenBtnRef = useRef(null);
  const resumenPopoverRef = useRef(null);
  const [resumenPos, setResumenPos] = useState({ top: 80, left: window.innerWidth / 2 });
  const [showTienda, setShowTienda] = useState(false);
  const [marcoSeleccionado, setMarcoSeleccionado] = useState('marco1.png');
  const [showRuleta, setShowRuleta] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAvatarView, setShowAvatarView] = useState(false);
  const [ropa, setRopa] = useState('ShirtCrewNeck');
  const [cabello, setCabello] = useState('ShaggyMullet');
  const [accesorio, setAccesorio] = useState('Round');
  const [skinColor, setSkinColor] = useState('Light');
  const skinColorOptions = [
    { value: 'Tanned', label: 'Tanned' },
    { value: 'Yellow', label: 'Yellow' },
    { value: 'Pale', label: 'Pale' },
    { value: 'Light', label: 'Light' },
    { value: 'Brown', label: 'Brown' },
    { value: 'DarkBrown', label: 'Dark Brown' },
    { value: 'Black', label: 'Black' },
  ];

  const ropaOptions = [
    { value: 'ShirtCrewNeck', label: 'Shirt Crew Neck' },
    { value: 'ShirtScoopNeck', label: 'Shirt Scoop Neck' },
    { value: 'ShirtVNeck', label: 'Shirt V-Neck' },
    { value: 'Hoodie', label: 'Hoodie' },
    { value: 'BlazerShirt', label: 'Blazer + Shirt' },
    { value: 'BlazerSweater', label: 'Blazer + Sweater' },
    { value: 'GraphicShirt', label: 'Graphic Shirt' },
    { value: 'CollarSweater', label: 'Collar Sweater' },
    { value: 'Overall', label: 'Overall' },
  ];
  const cabelloOptions = [
    { value: 'ShortHairShaggyMullet', label: 'Shaggy Mullet Corto' },
    { value: 'ShortHairShortCurly', label: 'Short Curly' },
    { value: 'LongHairStraight', label: 'Long Hair Straight' },
    { value: 'NoHair', label: 'Sin Cabello' },
    { value: 'ShortHairDreads01', label: 'Dreads Cortos' },
    { value: 'ShortHairFrizzle', label: 'Frizzle' },
    { value: 'LongHairCurly', label: 'Largo Rizado' },
    { value: 'LongHairStraight2', label: 'Largo Liso 2' },
    { value: 'LongHairFro', label: 'Afro Largo' },
    { value: 'LongHairBigHair', label: 'Big Hair' },
    { value: 'ShortHairDreads02', label: 'Dreads Cortos 2' },
    { value: 'ShortHairFrizzle', label: 'Frizzle' },
    { value: 'ShortHairTheCaesar', label: 'The Caesar' },
    { value: 'ShortHairTheCaesarSidePart', label: 'The Caesar Side Part' },
    { value: 'ShortHairSides', label: 'Sides' },
    { value: 'ShortHairRound', label: 'Round' },
    { value: 'LongHairNotTooLong', label: 'Not Too Long' },
    { value: 'LongHairMiaWallace', label: 'Mia Wallace' },
    { value: 'LongHairDreads', label: 'Largo Dreads' },
    { value: 'LongHairFroBand', label: 'Afro Band' },
    { value: 'LongHairBob', label: 'Bob' },
    { value: 'LongHairBun', label: 'Bun' },
    { value: 'LongHairCurvy', label: 'Curvy' },
    { value: 'LongHairDreads', label: 'Largo Dreads' },
    { value: 'LongHairFrida', label: 'Frida' },
    { value: 'LongHairNotTooLong', label: 'Not Too Long' },
    { value: 'LongHairStraightStrand', label: 'Straight Strand' },
  ];
  const accesorioOptions = [
    { value: 'Blank', label: 'Ninguno' },
    { value: 'Kurt', label: 'Gafas Kurt' },
    { value: 'Prescription01', label: 'Gafas Receta 1' },
    { value: 'Prescription02', label: 'Gafas Receta 2' },
    { value: 'Round', label: 'Gafas Redondas' },
    { value: 'Sunglasses', label: 'Gafas de Sol' },
    { value: 'Wayfarers', label: 'Wayfarers' },
    // Extras de Avataaars
    { value: 'Sunglasses', label: 'Gafas de Sol (Extra)' },
    { value: 'Wayfarers', label: 'Wayfarers (Extra)' },
  ];

  // Cabellos largos incompatibles con accesorios
  const cabellosSinAccesorios = [
    'LongHairShaggyMullet', 'LongHairStraight', 'LongHairCurly', 'LongHairStraight2', 'LongHairFro', 'LongHairBigHair'
  ];
  const accesorioIncompatible = cabellosSinAccesorios.includes(cabello) && accesorio !== 'Blank';

  const [eyeType, setEyeType] = useState('Default');
  const eyeTypeOptions = [
    { value: 'Default', label: 'Normal' },
    { value: 'Happy', label: 'Feliz' },
    { value: 'Squint', label: 'Entrecerrados' },
    { value: 'Surprised', label: 'Sorprendido' },
    { value: 'Wink', label: 'Guiño' },
    { value: 'WinkWacky', label: 'Guiño Loco' },
    { value: 'Cry', label: 'Llorando' },
    { value: 'Dizzy', label: 'Mareado' },
    { value: 'EyeRoll', label: 'Ojos en blanco' },
    { value: 'Hearts', label: 'Enamorado' },
    { value: 'Side', label: 'De lado' },
    { value: 'Close', label: 'Cerrados' },
    { value: 'Sleepy', label: 'Soñoliento' },
    { value: 'Angry', label: 'Enojado' },
    { value: 'Sad', label: 'Triste' },
  ];

  const [openSection, setOpenSection] = useState('ropa');
  const mainSectionTabs = [
    { key: 'ropa', label: 'Ropa' },
    { key: 'cabello', label: 'Cabello' },
    { key: 'cejas', label: 'Cejas' },
    { key: 'boca', label: 'Boca' },
    { key: 'facial', label: 'Vello Facial' },
    { key: 'clotheColor', label: 'Color de Ropa' },
    { key: 'accesorio', label: 'Accesorios' },
    { key: 'piel', label: 'Piel' },
    { key: 'ojos', label: 'Ojos' },
  ];
  // Eliminar secondarySectionTabs y cualquier referencia a tabs secundarios

  const [hairColor, setHairColor] = useState('Brown');
  const hairColorOptions = [
    { value: 'Auburn', label: 'Castaño rojizo' },
    { value: 'Black', label: 'Negro' },
    { value: 'Blonde', label: 'Rubio' },
    { value: 'BlondeGolden', label: 'Rubio Dorado' },
    { value: 'Brown', label: 'Castaño' },
    { value: 'BrownDark', label: 'Castaño Oscuro' },
    { value: 'PastelPink', label: 'Rosa Pastel' },
    { value: 'Platinum', label: 'Platino' },
    { value: 'Red', label: 'Rojo' },
    { value: 'SilverGray', label: 'Gris Plata' },
    { value: 'Blue', label: 'Azul' },
  ];

  const [eyebrowType, setEyebrowType] = useState('Default');
  const eyebrowTypeOptions = [
    { value: 'Default', label: 'Normal' },
    { value: 'DefaultNatural', label: 'Natural' },
    { value: 'Angry', label: 'Enojado' },
    { value: 'AngryNatural', label: 'Enojado Natural' },
    { value: 'FlatNatural', label: 'Plano Natural' },
    { value: 'RaisedExcited', label: 'Levantado' },
    { value: 'SadConcerned', label: 'Preocupado' },
    { value: 'UnibrowNatural', label: 'Uniceja' },
    { value: 'UpDown', label: 'Arriba-Abajo' },
    { value: 'UpDownNatural', label: 'Arriba-Abajo Natural' },
  ];

  const [mouthType, setMouthType] = useState('Smile');
  const mouthTypeOptions = [
    { value: 'Smile', label: 'Sonrisa' },
    { value: 'Default', label: 'Normal' },
    { value: 'Twinkle', label: 'Brillo' },
    { value: 'Serious', label: 'Serio' },
    { value: 'Sad', label: 'Triste' },
    { value: 'ScreamOpen', label: 'Grito' },
    { value: 'Disbelief', label: 'Incrédulo' },
    { value: 'Eating', label: 'Comiendo' },
    { value: 'Grimace', label: 'Mueca' },
    { value: 'Tongue', label: 'Lengua' },
  ];

  const [facialHairType, setFacialHairType] = useState('Blank');
  const facialHairTypeOptions = [
    { value: 'Blank', label: 'Ninguno' },
    { value: 'BeardMedium', label: 'Barba Media' },
    { value: 'BeardLight', label: 'Barba Ligera' },
    { value: 'BeardMajestic', label: 'Barba Majestuosa' },
    { value: 'MoustacheFancy', label: 'Bigote Elegante' },
    { value: 'MoustacheMagnum', label: 'Bigote Magnum' },
  ];

  const [clotheColor, setClotheColor] = useState('PastelGreen');
  const clotheColorOptions = [
    { value: 'Black', label: 'Negro' },
    { value: 'Blue01', label: 'Azul 1' },
    { value: 'Blue02', label: 'Azul 2' },
    { value: 'Blue03', label: 'Azul 3' },
    { value: 'Gray01', label: 'Gris 1' },
    { value: 'Gray02', label: 'Gris 2' },
    { value: 'Heather', label: 'Heather' },
    { value: 'PastelBlue', label: 'Azul Pastel' },
    { value: 'PastelGreen', label: 'Verde Pastel' },
    { value: 'PastelOrange', label: 'Naranja Pastel' },
    { value: 'PastelRed', label: 'Rojo Pastel' },
    { value: 'PastelYellow', label: 'Amarillo Pastel' },
    { value: 'Pink', label: 'Rosa' },
    { value: 'Red', label: 'Rojo' },
    { value: 'White', label: 'Blanco' },
  ];

  const [horariosBase, setHorariosBase] = useState([]);

  // Estado para el filtro de jornada
  const [jornadaFiltro, setJornadaFiltro] = useState("Todos");

  // Al iniciar, busca todas las capas disponibles para el capacitador
  useEffect(() => {
    if (!dniCap) return; // No hacer la llamada si no hay DNI válido
    
    api(`/api/capas?dniCap=${dniCap}`)
      .then(data => {
        setCapas(data);
        if (data.length === 0) {
          setSinDatos(true);
          setCapaSeleccionada(null);
          setCampaniaSeleccionada("");
        } else {
          setSinDatos(false);
          // Selecciona la campaña más reciente por defecto
          const mostRecent = getMostRecentCapa(data);
          setCampaniaSeleccionada(mostRecent.CampañaID);
          // Selecciona la capa más reciente de esa campaña
          const capasDeCamp = data.filter(c => c.CampañaID === mostRecent.CampañaID);
          const mostRecentCapa = getMostRecentCapa(capasDeCamp);
          setCapaSeleccionada(mostRecentCapa);
        }
      })
      .catch(() => {
        setCapas([]);
        setSinDatos(true);
        setCapaSeleccionada(null);
        setCampaniaSeleccionada("");
      });
  }, [dniCap]);

  // Cuando cambia la campaña seleccionada, selecciona la capa más reciente de esa campaña
  useEffect(() => {
    console.log("[App.jsx] campaniaSeleccionada:", campaniaSeleccionada);
    console.log("[App.jsx] capas:", capas);
    const capasDeCamp = capas.filter(c => c.CampañaID === campaniaSeleccionada);
    console.log("[App.jsx] capasDeCamp:", capasDeCamp);
    if (!campaniaSeleccionada) return;
    if (capasDeCamp.length) {
      const mostRecentCapa = getMostRecentCapa(capasDeCamp);
      setCapaSeleccionada(mostRecentCapa);
      console.log("[App.jsx] setCapaSeleccionada:", mostRecentCapa);
    } else {
      setCapaSeleccionada(null);
      console.log("[App.jsx] setCapaSeleccionada: null");
    }
  }, [campaniaSeleccionada, capas]);

  // Al cambiar de capa seleccionada, carga los datos
  useEffect(() => {
    console.log("[App.jsx] capaSeleccionada actual:", capaSeleccionada);
    if (!capaSeleccionada) return;
    console.log("Llamando a loadLote con:", {
      dniCap,
      CampañaID: capaSeleccionada.CampañaID,
      mes: capaSeleccionada.fechaInicio.slice(0, 7),
      fechaInicio: capaSeleccionada.fechaInicio,
      capaNum: capaSeleccionada.capa,
      horariosBase // <-- pasar horariosBase
    });
    post.loadLote({
      dniCap,
      CampañaID: capaSeleccionada.CampañaID,
      mes: capaSeleccionada.fechaInicio.slice(0, 7),
      fechaInicio: capaSeleccionada.fechaInicio,
      capaNum: capaSeleccionada.capa,
      horariosBase // <-- pasar horariosBase
    });
  }, [capaSeleccionada, horariosBase]);

  // Cargar horarios base al montar la app
  useEffect(() => {
    api('/api/horarios-base').then(setHorariosBase).catch(() => setHorariosBase([]));
  }, []);

  // Cerrar el popover al hacer clic fuera
  useEffect(() => {
    if (!showResumen) return;
    function handleClick(e) {
      if (
        resumenPopoverRef.current &&
        !resumenPopoverRef.current.contains(e.target) &&
        resumenBtnRef.current &&
        !resumenBtnRef.current.contains(e.target)
      ) {
        setShowResumen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showResumen]);

  useEffect(() => {
    if (showResumen && resumenBtnRef.current) {
      const rect = resumenBtnRef.current.getBoundingClientRect();
      setResumenPos({
        top: rect.bottom + 8 + window.scrollY, // 8px de margen
        left: rect.left + rect.width / 2 + window.scrollX
      });
    }
  }, [showResumen]);

  if (!token || !dniCap) {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    return <Login />;
  }

  if (rol === "coordinadora") {
    return <DashboardCoordinadora />;
  }

  const handleLogout = () => {
    console.log('Función handleLogout ejecutada');
    localStorage.removeItem('token');
    localStorage.removeItem('nombres');
    localStorage.removeItem('apellidoPaterno');
    localStorage.removeItem('apellidoMaterno');
    localStorage.removeItem('rol');
    console.log('localStorage limpiado, recargando página...');
    window.location.reload();
  };

  const guardar = () => {
    if (!capaSeleccionada) return;
    post.guardarCambios({
      dniCap,
      CampañaID: capaSeleccionada.CampañaID,
      mes: capaSeleccionada.fechaInicio.slice(0, 7),
      fechaInicio: capaSeleccionada.fechaInicio,
      capaNum: capaSeleccionada.capa,
      horariosBase // Pasar horariosBase para mantener consistencia
    });
  };

  // Filtrar deserciones únicas para el resumen (por dni+fecha+capa_numero)
  const desercionesUnicas = [];
  const seen = new Set();
  for (const d of post.deserciones) {
    const key = `${d.postulante_dni}-${d.fecha_desercion}-${d.capa_numero || ''}`;
    if (!seen.has(key)) {
      desercionesUnicas.push(d);
      seen.add(key);
    }
  }
  const bajas = desercionesUnicas.length;
  const activos = post.tablaDatos.length - bajas;
  const porcentajeBajas = post.tablaDatos.length > 0 ? Math.round((bajas / post.tablaDatos.length) * 100) : 0;
  const porcentajeActivos = post.tablaDatos.length > 0 ? Math.round((activos / post.tablaDatos.length) * 100) : 0;

  if (showRuleta) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#297373] to-[#FE7F2D] flex flex-col p-0 m-0">
        <div className="flex items-center px-6 py-2 bg-white/10 backdrop-blur-lg shadow-md rounded-b-3xl mb-2 relative" style={{ minHeight: 90 }}>
          {/* Logo y saludo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/partner.svg" alt="logo" className="w-8 h-8 bg-white/30 rounded-full p-1" />
            <span className="font-semibold text-white text-base drop-shadow">Hola, bienvenido <span className="font-bold">{
              `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidoPaterno') || ''} ${localStorage.getItem('apellidoMaterno') || ''}`.trim()
            } 👋</span></span>
          </div>
          {/* Avatar de usuario en la esquina superior derecha */}
          <div className="ml-auto flex items-center">
            <UserAvatar onLogout={handleLogout} marco={marcoSeleccionado} />
          </div>
        </div>
        <RuletaPuntos onClose={() => setShowRuleta(false)} />
      </div>
    );
  }
  if (showTienda) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#297373] to-[#FE7F2D] flex flex-col p-0 m-0">
        <div className="flex items-center px-6 py-2 bg-white/10 backdrop-blur-lg shadow-md rounded-b-3xl mb-2 relative" style={{ minHeight: 90 }}>
          {/* Logo y saludo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/partner.svg" alt="logo" className="w-8 h-8 bg-white/30 rounded-full p-1" />
            <span className="font-semibold text-white text-base drop-shadow">Hola, bienvenido <span className="font-bold">{
              `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidoPaterno') || ''} ${localStorage.getItem('apellidoMaterno') || ''}`.trim()
            } 👋</span></span>
          </div>
          {/* Avatar de usuario en la esquina superior derecha */}
          <div className="ml-auto flex items-center">
            <UserAvatar onLogout={handleLogout} marco={marcoSeleccionado} />
          </div>
        </div>
        <TiendaMarcos
          onClose={() => setShowTienda(false)}
          onSelectMarco={(file) => {
            setMarcoSeleccionado(file);
          }}
        />
      </div>
    );
  }
  if (showAvatarView) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-[#297373] to-[#FE7F2D] items-center">
        <div className="flex flex-col items-center w-full max-w-3xl mx-auto mt-8">
          <Avataaars
            style={{ width: 220, height: 220 }}
            avatarStyle="Circle"
            topType={cabello}
            accessoriesType={accesorio}
            hairColor={hairColor}
            facialHairType={facialHairType}
            clotheType={ropa}
            clotheColor={clotheColor}
            eyeType={eyeType}
            eyebrowType={eyebrowType}
            mouthType={mouthType}
            skinColor={skinColor}
          />
          <button
            onClick={() => setShowAvatarView(false)}
            className="mt-6 text-lg px-4 py-2 rounded-full bg-white/80 text-[#297373] font-semibold shadow hover:bg-white border border-[#e0d7ce] focus:outline-none"
          >
            Volver
          </button>
        </div>
        <div className="w-full max-w-3xl mx-auto mt-8 bg-white/80 rounded-2xl shadow-lg p-8 flex flex-col gap-4">
          {/* Tabs principales */}
          <div className="flex flex-row justify-center gap-2 mb-2 flex-wrap">
            {mainSectionTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setOpenSection(tab.key)}
                className={`px-6 py-2 rounded-full font-bold text-lg transition-all border-2 ${openSection === tab.key ? 'bg-green-100 text-green-700 border-green-500' : 'bg-white text-gray-800 border-transparent hover:bg-green-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Galería visual de la sección activa */}
          {openSection === 'ropa' && (
            <>
              {/* Barrita de color de ropa con círculos sólidos */}
              <div className="flex flex-row gap-3 justify-center mb-4">
                {clotheColorOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setClotheColor(opt.value)}
                    className={`rounded-full border-2 transition-all ${clotheColor === opt.value ? 'border-black' : 'border-gray-300'} bg-white flex items-center justify-center`}
                    style={{ minWidth: 36, minHeight: 36, width: 36, height: 36, padding: 0 }}
                    title={opt.label}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: getClotheColorHex(opt.value),
                        border: '1.5px solid #e5e7eb',
                      }}
                    />
                  </button>
                ))}
              </div>
              {/* Grid de estilos de ropa */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {ropaOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRopa(opt.value)}
                    className={`rounded-lg border-2 p-1 transition-all flex flex-col items-center ${ropa === opt.value ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}`}
                    title={opt.label}
                  >
                    <Avataaars
                      style={{ width: 48, height: 48 }}
                      avatarStyle="Circle"
                      topType={cabello}
                      hairColor={hairColor}
                      accessoriesType="Blank"
                      facialHairType={facialHairType}
                      clotheType={opt.value}
                      clotheColor={clotheColor}
                      eyeType={eyeType}
                      eyebrowType={eyebrowType}
                      mouthType={mouthType}
                      skinColor={skinColor}
                    />
                    <div className="text-xs text-center mt-1 whitespace-nowrap">{opt.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          {openSection === 'cabello' && (
            <>
              {/* Barrita de color de cabello con círculos sólidos y arcoíris */}
              <div className="flex flex-row gap-3 justify-center mb-4">
                {hairColorOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setHairColor(opt.value)}
                    className={`rounded-full border-2 transition-all ${hairColor === opt.value ? 'border-black' : 'border-gray-300'} bg-white flex items-center justify-center`}
                    style={{ minWidth: 36, minHeight: 36, width: 36, height: 36, padding: 0 }}
                    title={opt.label}
                  >
                    {opt.value === 'Rainbow' ? (
                      <span
                        style={{
                          display: 'block',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'conic-gradient(red, orange, yellow, green, blue, indigo, violet, red)',
                          border: '1.5px solid #e5e7eb',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          display: 'block',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: getHairColorHex(opt.value),
                          border: '1.5px solid #e5e7eb',
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
              {/* Grid de estilos de cabello */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {cabelloOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setCabello(opt.value)}
                    className={`rounded-lg border-2 p-1 transition-all flex flex-col items-center ${cabello === opt.value ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}`}
                    title={opt.label}
                  >
                    <Avataaars
                      style={{ width: 48, height: 48 }}
                      avatarStyle="Circle"
                      topType={opt.value}
                      hairColor={hairColor === 'Rainbow' ? 'PastelPink' : hairColor}
                      accessoriesType="Blank"
                      facialHairType={facialHairType}
                      clotheType={ropa}
                      eyeType={eyeType}
                      eyebrowType={eyebrowType}
                      mouthType={mouthType}
                      skinColor={skinColor}
                    />
                    <div className="text-xs text-center mt-1 whitespace-nowrap">{opt.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          {openSection === 'cejas' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {eyebrowTypeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEyebrowType(opt.value)}
                  className={`rounded-lg border-2 p-1 transition-all flex flex-col items-center ${eyebrowType === opt.value ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}`}
                  title={opt.label}
                >
                  <Avataaars
                    style={{ width: 48, height: 48 }}
                    avatarStyle="Circle"
                    topType={cabello}
                    accessoriesType="Blank"
                    hairColor={hairColor}
                    facialHairType={facialHairType}
                    clotheType={ropa}
                    eyeType={eyeType}
                    eyebrowType={opt.value}
                    mouthType={mouthType}
                    skinColor={skinColor}
                  />
                  <div className="text-xs text-center mt-1 whitespace-nowrap">{opt.label}</div>
                </button>
              ))}
            </div>
          )}
          {openSection === 'boca' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {mouthTypeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMouthType(opt.value)}
                  className={`rounded-lg border-2 p-1 transition-all flex flex-col items-center ${mouthType === opt.value ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}`}
                  title={opt.label}
                >
                  <Avataaars
                    style={{ width: 48, height: 48 }}
                    avatarStyle="Circle"
                    topType={cabello}
                    accessoriesType="Blank"
                    hairColor={hairColor}
                    facialHairType={facialHairType}
                    clotheType={ropa}
                    eyeType={eyeType}
                    eyebrowType={eyebrowType}
                    mouthType={opt.value}
                    skinColor={skinColor}
                  />
                  <div className="text-xs text-center mt-1 whitespace-nowrap">{opt.label}</div>
                </button>
              ))}
            </div>
          )}
          {openSection === 'facial' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {facialHairTypeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFacialHairType(opt.value)}
                  className={`rounded-lg border-2 p-1 transition-all flex flex-col items-center ${facialHairType === opt.value ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}`}
                  title={opt.label}
                >
                  <Avataaars
                    style={{ width: 48, height: 48 }}
                    avatarStyle="Circle"
                    topType={cabello}
                    accessoriesType="Blank"
                    hairColor={hairColor}
                    facialHairType={opt.value}
                    clotheType={ropa}
                    eyeType={eyeType}
                    eyebrowType={eyebrowType}
                    mouthType={mouthType}
                    skinColor={skinColor}
                  />
                  <div className="text-xs text-center mt-1 whitespace-nowrap">{opt.label}</div>
                </button>
              ))}
            </div>
          )}
          {openSection === 'accesorio' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {accesorioOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAccesorio(opt.value)}
                  className={`rounded-lg border-2 p-1 transition-all flex flex-col items-center ${accesorio === opt.value ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}`}
                  title={opt.label}
                >
                  <Avataaars
                    style={{ width: 48, height: 48 }}
                    avatarStyle="Circle"
                    topType={cabello}
                    accessoriesType={opt.value}
                    hairColor={hairColor}
                    facialHairType={facialHairType}
                    clotheType={ropa}
                    eyeType={eyeType}
                    eyebrowType={eyebrowType}
                    mouthType={mouthType}
                    skinColor={skinColor}
                  />
                  <div className="text-xs text-center mt-1 whitespace-nowrap">{opt.label}</div>
                </button>
              ))}
            </div>
          )}
          {openSection === 'accesorio' && accesorioIncompatible && (
            <div className="text-xs text-red-600 mt-2">Este accesorio no es compatible con el cabello seleccionado.</div>
          )}
          {openSection === 'piel' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {skinColorOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSkinColor(opt.value)}
                  className={`rounded-full border-2 p-1 transition-all flex flex-col items-center ${skinColor === opt.value ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}`}
                  title={opt.label}
                >
                  <Avataaars
                    style={{ width: 32, height: 32 }}
                    avatarStyle="Circle"
                    topType={cabello}
                    accessoriesType="Blank"
                    hairColor={hairColor}
                    facialHairType={facialHairType}
                    clotheType={ropa}
                    eyeType={eyeType}
                    eyebrowType={eyebrowType}
                    mouthType={mouthType}
                    skinColor={opt.value}
                  />
                  <div className="text-xs text-center mt-1 whitespace-nowrap">{opt.label}</div>
                </button>
              ))}
            </div>
          )}
          {openSection === 'ojos' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {eyeTypeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEyeType(opt.value)}
                  className={`rounded-lg border-2 p-1 transition-all flex flex-col items-center ${eyeType === opt.value ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}`}
                  title={opt.label}
                >
                  <Avataaars
                    style={{ width: 32, height: 32 }}
                    avatarStyle="Circle"
                    topType={cabello}
                    accessoriesType="Blank"
                    hairColor={hairColor}
                    facialHairType={facialHairType}
                    clotheType={ropa}
                    eyeType={opt.value}
                    eyebrowType={eyebrowType}
                    mouthType={mouthType}
                    skinColor={skinColor}
                  />
                  <div className="text-xs text-center mt-1 whitespace-nowrap">{opt.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (showAvatarModal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
        <div className="bg-white rounded-xl shadow-lg p-8 min-w-[400px] relative flex flex-col items-center">
          <button className="absolute top-4 right-4 text-2xl" onClick={() => setShowAvatarModal(false)}>×</button>
          <h2 className="text-2xl font-bold text-green-700 text-center mb-6">Tu Avatar</h2>
          <Avataaars
            style={{ width: 220, height: 220 }}
            avatarStyle="Circle"
            topType="ShaggyMullet"
            accessoriesType="Round"
            hairColor="Brown"
            facialHairType="Blank"
            clotheType="ShirtCrewNeck"
            clotheColor="PastelGreen"
            eyeType={eyeType}
            eyebrowType="Default"
            mouthType="Smile"
            skinColor={skinColor}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7f9fd' }}>
      {/* Barra superior translúcida - Toggle alineado a la derecha del saludo */}
      <div className="flex items-center px-6 py-2 bg-white shadow-md rounded-b-3xl mb-2 relative" style={{ minHeight: 90 }}>
        {/* Logo y saludo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <img src="/partner.svg" alt="logo" className="w-8 h-8 bg-white/30 rounded-full p-1" />
          <div className="flex flex-col">
            <span className="text-[#22314a] text-base">Hola, bienvenido</span>
            <span className="font-bold text-[#22314a] text-lg">{
              `${localStorage.getItem('nombres') || ''} ${localStorage.getItem('apellidoPaterno') || ''} ${localStorage.getItem('apellidoMaterno') || ''}`.trim()
            } 👋</span>
          </div>
        </div>
        {/* ToggleTabs y Ver Resumen juntos, centrados */}
        <div className="absolute left-[55%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
          <ToggleTabs active={vista} onChange={setVista} />
          <button
            ref={resumenBtnRef}
            onClick={() => setShowResumen(v => !v)}
            className="ml-8 px-4 py-1.5 rounded-full bg-white/80 text-[#297373] font-semibold shadow hover:bg-white transition border border-[#e0d7ce] focus:outline-none"
          >
            Ver Resumen
          </button>
          {/* KPIs originales restaurados */}
          <div className="flex items-center gap-2 ml-4">
            {/* Activos primero */}
            <div className="flex flex-col items-center">
              <span className="text-sm text-gray-700 font-semibold mb-1">Activos</span>
              <span className="flex items-center gap-1 text-emerald-500 font-bold text-lg">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 16V6m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {activos}
                <span className="text-xs text-emerald-500 font-semibold ml-1">
                  {porcentajeActivos}%
                </span>
              </span>
            </div>
            {/* Bajas después */}
            <div className="flex flex-col items-center">
              <span className="text-sm text-gray-700 font-semibold mb-1">Bajas</span>
              <span className="flex items-center gap-1 text-rose-600 font-bold text-lg">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {bajas}
                <span className="text-xs text-rose-600 font-semibold ml-1">
                  {porcentajeBajas}%
                </span>
              </span>
            </div>
          </div>
          {/* Botón de tienda de marcos al final del bloque central */}
          <button
            onClick={() => setShowTienda(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 transition ml-6"
            title="Tienda de marcos"
          >
            {/* SVG tienda con toldo y puerta (opción 1) */}
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M3 7L5 3h14l2 4" stroke="#f59e42" strokeWidth="2" fill="none"/>
              <rect x="2" y="7" width="20" height="4" rx="2" fill="#f59e42" stroke="#f59e42" strokeWidth="2"/>
              <rect x="4" y="11" width="16" height="9" rx="2" fill="#fff" stroke="#f59e42" strokeWidth="2"/>
              <rect x="9" y="15" width="3" height="5" rx="1" fill="#f59e42"/>
            </svg>
          </button>
          {/* Botón de ruleta al lado de tienda */}
          <button
            onClick={() => setShowRuleta(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 transition ml-2"
            title="Ruleta de puntos"
          >
            {/* SVG ruleta/dado */}
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <circle cx="12" cy="12" r="10" stroke="#f59e42" strokeWidth="2" fill="#fff" />
              <circle cx="12" cy="7" r="1.5" fill="#f59e42" />
              <circle cx="7" cy="12" r="1.5" fill="#f59e42" />
              <circle cx="17" cy="12" r="1.5" fill="#f59e42" />
              <circle cx="12" cy="17" r="1.5" fill="#f59e42" />
            </svg>
          </button>
          {/* Botón de ropa (camiseta) */}
          <button
            onClick={() => setShowAvatarView(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 transition ml-2"
            title="Ver Avatar"
          >
            {/* SVG camiseta */}
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M16 3l3.29 2.47a1 1 0 01.29 1.36l-2.58 4.3A2 2 0 0115.17 12H8.83a2 2 0 01-1.83-1.87l-2.58-4.3a1 1 0 01.29-1.36L8 3h8z" stroke="#f59e42" strokeWidth="2" fill="#fff"/>
              <rect x="9" y="12" width="6" height="8" rx="2" fill="#f59e42"/>
            </svg>
          </button>
        </div>
        {/* Avatar de usuario en la esquina superior derecha */}
        <div className="ml-auto flex items-center">
          <UserAvatar onLogout={handleLogout} marco={marcoSeleccionado} />
        </div>
      </div>
      {/* Contenido principal compacto */}
      <div className="w-full flex flex-col gap-1 items-start justify-start p-0 m-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 mb-1 px-4">
          {capas.length > 1 && capaSeleccionada && (
            <>
              {/* Select de campaña */}
              <select
                style={{ backgroundColor: '#dbeafe' }}
                className="px-2 py-1 text-sm rounded border focus:outline-none focus:ring"
                value={campaniaSeleccionada}
                onChange={e => setCampaniaSeleccionada(Number(e.target.value))}
              >
                {[...new Set(capas.map(c => c.CampañaID))].map(id => {
                  const camp = capas.find(c => c.CampañaID === id);
                  return <option key={id} value={id}>{camp?.NombreCampaña || id}</option>;
                })}
              </select>
              {/* Select de capa/fecha */}
              <select
                style={{ backgroundColor: '#dbeafe' }}
                className="px-2 py-1 text-sm rounded border focus:outline-none focus:ring"
                value={capaSeleccionada?.capa || ""}
                onChange={e => {
                  const nueva = capas.find(c => c.capa.toString() === e.target.value && c.CampañaID === campaniaSeleccionada);
                  setCapaSeleccionada(nueva);
                }}
              >
                {capas.filter(c => c.CampañaID === campaniaSeleccionada).map(c => (
                  <option key={c.capa} value={c.capa}>{`Capa ${c.capa} — ${c.fechaInicio}`}</option>
                ))}
              </select>
              {/* Select de jornada */}
              <select
                style={{ backgroundColor: '#dbeafe' }}
                className="px-2 py-1 text-sm rounded border focus:outline-none focus:ring"
                value={jornadaFiltro}
                onChange={e => setJornadaFiltro(e.target.value)}
              >
                <option value="Todos">Todos</option>
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Semi Full">Semi Full</option>
              </select>
            </>
          )}
        </div>
        {sinDatos && (
          <div className="text-center text-gray-500 text-base mt-6">No tienes datos de asistencias para mostrar.</div>
        )}
        {!sinDatos && capaSeleccionada && (
          <div className="flex flex-col gap-2">
            {/* Contenedor de asistencias o evaluaciones */}
            <div className="flex flex-row gap-4 items-start w-full">
              <div
                className="flex-1 rounded-lg p-2 bg-transparent"
                style={{}}
              >
                {vista === "asist" && <AsistenciasTable
                  postCtx={post}
                  compact={false}
                  dniCap={dniCap}
                  CampañaID={capaSeleccionada?.CampañaID}
                  mes={capaSeleccionada?.fechaInicio?.slice(0, 7)}
                  fechaInicio={capaSeleccionada?.fechaInicio}
                  capaNum={capaSeleccionada?.capa}
                  horariosBase={horariosBase}
                  jornadaFiltro={jornadaFiltro}
                />}
                {vista === "eval" && <EvaluacionesTable postCtx={post} compact />}
                {(vista === "asist" || vista === "eval") && (
                  <div className="flex items-center gap-1 mt-1 mb-2 ml-2">
                    <button
                      onClick={guardar}
                      className="bg-[#ffb347] hover:bg-[#ffa500] text-white px-6 py-2 rounded-xl text-base font-semibold transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#ffe5b4] border border-[#e0d7ce]"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => descargarExcel({ tablaDatos: post.tablaDatos, dias: post.dias, capCount: post.capCount })}
                      className="bg-blue-400 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-base font-semibold transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 border border-blue-200 ml-2"
                    >
                      Descargar Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Tabla de deserciones siempre debajo */}
            <div className="inline-block rounded-lg p-2 bg-transparent w-full">
              <DesercionesTable postCtx={post} />
            </div>
          </div>
        )}
      </div>
      {showResumen && createPortal(
        <div
          ref={resumenPopoverRef}
          className="z-[999] w-[340px] bg-white rounded-xl shadow-2xl border border-gray-200 p-0"
          style={{ position: 'fixed', top: resumenPos.top, left: resumenPos.left, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center justify-between px-6 pt-4 pb-0">
            <span className="text-2xl font-bold text-gray-800">Resumen</span>
            <button
              onClick={() => setShowResumen(false)}
              className="text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <ResumenCard postCtx={post} capInfo={{
            nombres: localStorage.getItem('nombres'),
            apellidoPaterno: localStorage.getItem('apellidoPaterno'),
            apellidoMaterno: localStorage.getItem('apellidoMaterno'),
          }} campania={capaSeleccionada?.campania} hideTitle />
        </div>,
        document.body
      )}
      {/* Modal de avatar */}
      {showAvatarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 min-w-[400px] relative flex flex-col items-center">
            <button className="absolute top-4 right-4 text-2xl" onClick={() => setShowAvatarModal(false)}>×</button>
            <h2 className="text-2xl font-bold text-green-700 text-center mb-6">Tu Avatar</h2>
            <Avataaars
              style={{ width: 220, height: 220 }}
              avatarStyle="Circle"
              topType="ShaggyMullet"
              accessoriesType="Round"
              hairColor="Brown"
              facialHairType="Blank"
              clotheType="ShirtCrewNeck"
              clotheColor="PastelGreen"
              eyeType={eyeType}
              eyebrowType="Default"
              mouthType="Smile"
              skinColor={skinColor}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Agregar la función getHairColorHex para mapear los valores a colores hex
function getHairColorHex(value) {
  switch (value) {
    case 'Auburn': return '#964B00';
    case 'Black': return '#000000';
    case 'Blonde': return '#FAC205';
    case 'BlondeGolden': return '#FAC205';
    case 'Brown': return '#795548';
    case 'BrownDark': return '#5D4037';
    case 'PastelPink': return '#F06292';
    case 'Platinum': return '#E0E0E0';
    case 'Red': return '#D32F2F';
    case 'SilverGray': return '#B0BEC5';
    case 'Blue': return '#2196F3';
    default: return '#000000'; // Color por defecto
  }
}

function getClotheColorHex(value) {
  switch (value) {
    case 'Black': return '#000000';
    case 'Blue01': return '#65C9FF';
    case 'Blue02': return '#5199E4';
    case 'Blue03': return '#25557C';
    case 'Gray01': return '#E6E6E6';
    case 'Gray02': return '#929598';
    case 'Heather': return '#3C4F5C';
    case 'PastelBlue': return '#B1E2FF';
    case 'PastelGreen': return '#A7FFC4';
    case 'PastelOrange': return '#FFDEB5';
    case 'PastelRed': return '#FFAFB9';
    case 'PastelYellow': return '#FFFFB1';
    case 'Pink': return '#FF488E';
    case 'Red': return '#FF5C5C';
    case 'White': return '#FFFFFF';
    default: return '#A7FFC4';
  }
}