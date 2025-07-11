export default function ToggleTabs({ active, onChange }) {
  const tabs = [
    { id: "asist", label: "Asistencias" },
    { id: "eval",  label: "Evaluaciones" }
  ];
  return (
    <div className="flex border rounded overflow-hidden">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 text-sm font-medium transition
            ${active === t.id
              ? "bg-green-600 text-white"
              : "bg-gray-200 hover:bg-gray-300"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
