export default function ToggleTabs({ active, onChange }) {
  const tabs = [
    { id: "asist", label: "Asistencias" },
    { id: "eval",  label: "Evaluaciones" }
  ];
  return (
    <div className="flex rounded-xl overflow-hidden bg-white/30 backdrop-blur-sm">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-5 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none 
            ${active === t.id
              ? "bg-green-500/90 text-white shadow-sm"
              : "bg-white/70 text-gray-800 hover:bg-white/90"}
            rounded-xl`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
