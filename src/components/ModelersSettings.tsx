import React from 'react';
import { Modeler } from '../types';
import { Users, Plus, Check, Power, Palette } from 'lucide-react';

interface ModelersSettingsProps {
  modelers: Modeler[];
  onUpdateModelers: (modelers: Modeler[]) => void;
}

const PRESET_COLORS = [
  '#0284c7', // Sky-600
  '#7c3aed', // Violet-600
  '#ea580c', // Orange-600
  '#16a34a', // Green-600
  '#db2777', // Pink-600
  '#4f46e5', // Indigo-600
  '#0d9488', // Teal-600
  '#ca8a04', // Yellow-600
];

export default function ModelersSettings({ modelers, onUpdateModelers }: ModelersSettingsProps) {
  
  const handleToggleActive = (id: string) => {
    const updated = modelers.map(m => {
      if (m.id === id) {
        return { ...m, active: !m.active };
      }
      return m;
    });
    onUpdateModelers(updated);
  };

  const handleUpdateName = (id: string, name: string) => {
    const updated = modelers.map(m => {
      if (m.id === id) {
        return { ...m, name };
      }
      return m;
    });
    onUpdateModelers(updated);
  };

  const handleChangeColor = (id: string, color: string) => {
    const updated = modelers.map(m => {
      if (m.id === id) {
        return { ...m, color };
      }
      return m;
    });
    onUpdateModelers(updated);
  };

  const handleAddModeler = () => {
    if (modelers.length >= 8) return; // Limit to 8 modelers
    const newId = `modeler-${Date.now()}`;
    const nextColor = PRESET_COLORS[modelers.length % PRESET_COLORS.length];
    const newModeler: Modeler = {
      id: newId,
      name: `Modelador ${modelers.length + 1}`,
      color: nextColor,
      active: true,
    };
    onUpdateModelers([...modelers, newModeler]);
  };

  const handleRemoveModeler = (id: string) => {
    if (modelers.length <= 1) return; // Must have at least one modeler
    onUpdateModelers(modelers.filter(m => m.id !== id));
  };

  return (
    <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Cargar Modeladores Revit</h2>
            <p className="text-xs text-slate-500">
              Define cuántas personas van a modelar. Cada modelador activo procesará su lista de tareas asignadas secuencialmente.
            </p>
          </div>
        </div>

        <button
          onClick={handleAddModeler}
          disabled={modelers.length >= 8}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-200 text-black font-extrabold uppercase tracking-widest text-[11px] rounded-xl transition shadow-md shadow-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} strokeWidth={3} />
          Agregar Modelador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modelers.map((modeler, index) => (
          <div
            key={modeler.id}
            className={`border rounded-2xl p-5 flex flex-col justify-between transition ${
              modeler.active
                ? 'border-white/10 bg-[#16191D] shadow-sm'
                : 'border-white/5 bg-[#0F1115] opacity-50'
            }`}
          >
            {/* Header: Name and Status Toggle */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Modelador #{index + 1}
                </span>
                <input
                  type="text"
                  value={modeler.name}
                  onChange={(e) => handleUpdateName(modeler.id, e.target.value)}
                  className="w-full font-semibold text-white border-b border-transparent hover:border-white/10 focus:border-amber-500 focus:outline-none py-0.5 text-sm bg-transparent transition"
                  placeholder="Nombre de la persona"
                />
              </div>

              <button
                onClick={() => handleToggleActive(modeler.id)}
                title={modeler.active ? 'Desactivar Modelador' : 'Activar Modelador'}
                className={`p-2 rounded-xl transition ${
                  modeler.active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Power size={15} />
              </button>
            </div>

            {/* Colors picker selection */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Palette size={11} className="text-amber-500" /> Color en Calendario
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleChangeColor(modeler.id, c)}
                    className="w-5 h-5 rounded-full border border-black/30 shadow-sm hover:scale-110 active:scale-95 transition relative flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: c }}
                  >
                    {modeler.color === c && (
                      <Check size={10} className="text-white font-bold" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Remove footer action */}
            {modelers.length > 1 && (
              <div className="mt-4 pt-3 flex justify-end">
                <button
                  onClick={() => handleRemoveModeler(modeler.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition"
                >
                  Remover Modelador
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
