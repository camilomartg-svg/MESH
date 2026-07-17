import React, { useState, useEffect } from 'react';
import { Task, BimCategory, Modeler } from '../types';
import { Plus, X, Sparkles } from 'lucide-react';

interface TaskFormProps {
  task: Task | null; // If editing, otherwise null for creating
  tasks: Task[];
  modelers: Modeler[];
  onSave: (task: Task) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  suggestedTasksByCategory: { [key in BimCategory]: string[] };
  isDarkMode?: boolean;
  bimCategories: string[];
}

export default function TaskForm({
  task,
  tasks,
  modelers,
  onSave,
  onCancel,
  onDelete,
  suggestedTasksByCategory,
  isDarkMode = false,
  bimCategories,
}: TaskFormProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BimCategory>('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState<number | ''>(3);
  const [priority, setPriority] = useState(1);
  const [status, setStatus] = useState<'Modelado' | 'Pendiente' | 'N/A'>('Pendiente');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isParallel, setIsParallel] = useState(false);
  const [manualStart, setManualStart] = useState('');
  const [parallelWithTaskId, setParallelWithTaskId] = useState('');

  // Suggestions helper
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (task) {
      setCode(task.code || '');
      setName(task.name);
      setCategory(task.category);
      setDescription(task.description);
      setDurationDays(task.durationDays);
      setPriority(task.priority);
      setStatus(task.status);
      setAssigneeId(task.assigneeId || '');
      setTargetDeliveryDate(task.targetDeliveryDate || '');
      setNotes(task.notes);
      setIsParallel(task.isParallel || false);
      setManualStart(task.manualStart || '');
      setParallelWithTaskId(task.parallelWithTaskId || '');
    } else {
      // Auto-generate code
      const nextNum = tasks.length + 1;
      const paddedNum = String(nextNum).padStart(2, '0');
      setCode(`BIM-${paddedNum}`);
      setName('');
      setCategory(bimCategories[0] || 'ELEMENTOS ESTRUCTURALES');
      setDescription('');
      setDurationDays(3);
      setStatus('Pendiente');
      setAssigneeId('');
      setTargetDeliveryDate('');
      setNotes('');
      setIsParallel(false);
      setManualStart('');
      setParallelWithTaskId('');
    }
  }, [task, tasks, bimCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: task?.id || `task-${Date.now()}`,
      code: code.trim() || `BIM-${String(tasks.length + 1).padStart(2, '0')}`,
      name: name.trim(),
      category,
      description: description.trim(),
      durationDays: Math.max(1, Number(durationDays)),
      priority: Math.max(1, Number(priority)),
      status,
      assigneeId: assigneeId || null,
      notes: notes.trim(),
      targetDeliveryDate: targetDeliveryDate || null,
      scheduledStart: task?.scheduledStart || null,
      scheduledEnd: task?.scheduledEnd || null,
      isDelayed: task?.isDelayed || false,
      isParallel,
      manualStart: manualStart || null,
      parallelWithTaskId: isParallel ? (parallelWithTaskId || null) : null,
    });
  };

  const selectSuggestion = (sugName: string) => {
    setName(sugName);
    setShowSuggestions(false);
    // Find some default descriptions
    if (sugName.includes('Contención')) setDescription('Perímetro de sótanos y semisótanos (contención lateral y posterior).');
    else if (sugName.includes('Columnas')) setDescription('Columnas rectangulares de concreto estructuradas.');
    else if (sugName.includes('Vigas')) setDescription('Vigas de amarre y vigas aéreas para balcones o losas.');
    else if (sugName.includes('Losa')) setDescription('Losa de entrepiso, rampa o cimentación.');
    else if (sugName.includes('Fachada')) setDescription('Muros exteriores de fachada clara u oscura.');
    else if (sugName.includes('Vidri')) setDescription('Puertas correderas o ventanas con vidrio templado.');
    else if (sugName.includes('Drywall')) setDescription('Divisiones internas ligeras en placas de yeso.');
    else if (sugName.includes('Pisos')) setDescription('Acabado de suelo de alta calidad.');
    else if (sugName.includes('Escalera')) setDescription('Escaleras de evacuación y accesos estructurales.');
    else if (sugName.includes('Jardinera')) setDescription('Jardineras exteriores y acabados paisajísticos.');
  };

  return (
    <div className={`rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto border transition-all duration-200 ${
      isDarkMode 
        ? 'bg-[#0F1115] border-white/10 text-slate-300' 
        : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
        isDarkMode ? 'border-white/10' : 'border-slate-100'
      }`}>
        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          {task ? 'Editar Tarea BIM' : 'Crear Nueva Tarea BIM'}
        </h3>
        <button
          onClick={onCancel}
          className={`p-1.5 rounded-full transition ${
            isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Category */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Categoría del Elemento Revit
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as BimCategory);
              setName('');
            }}
            className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
              isDarkMode 
                ? 'bg-[#16191D] border-white/10 text-slate-200 focus:border-white focus:ring-white' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-black focus:ring-black'
            }`}
          >
            {bimCategories.map((cat, index) => (
              <option key={cat} value={cat}>
                {index + 1}. {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Task Name and Code in a grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-1">
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Código
            </label>
            <input
              type="text"
              disabled
              value={code || 'M000'}
              className="w-full px-3 py-2 border rounded-xl bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed font-bold"
              title="El código único se genera de forma automática"
            />
          </div>

          <div className="col-span-3 relative">
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Nombre de la Labor
              </label>
              <button
                type="button"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`text-xs flex items-center gap-1 font-semibold transition ${
                  isDarkMode ? 'text-slate-200 hover:text-white' : 'text-slate-900 hover:text-black'
                }`}
              >
                <Sparkles size={12} />
                Predefinidos Revit
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Ej: Muros de Contención, Escalera Principal..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/10 text-white placeholder-slate-600 focus:border-white focus:ring-white' 
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-black focus:ring-black'
              }`}
            />

            {showSuggestions && (
              <div className={`absolute z-10 w-full mt-1 border rounded-xl shadow-lg max-h-48 overflow-y-auto py-1 ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/10 text-slate-200 shadow-black/50' 
                  : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <div className={`px-3 py-1 text-xs font-semibold border-b ${
                  isDarkMode ? 'text-slate-400 bg-white/5 border-white/5' : 'text-slate-400 bg-slate-50 border-slate-100'
                }`}>
                  Sugerencias para esta categoría:
                </div>
                {suggestedTasksByCategory[category]?.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => selectSuggestion(sug)}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition ${
                      isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
                {(!suggestedTasksByCategory[category] || suggestedTasksByCategory[category].length === 0) && (
                  <div className="px-3 py-2 text-xs text-slate-400">Sin sugerencias predefinidas</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Descripción / Ubicación del Proyecto
          </label>
          <textarea
            placeholder="Escribe la descripción de la labor o los niveles que abarca..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
              isDarkMode 
                ? 'bg-[#16191D] border-white/10 text-white placeholder-slate-600 focus:border-white focus:ring-white' 
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-black focus:ring-black'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Duration in days */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Días de Trabajo (Laborables)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              onWheel={(e) => (e.target as HTMLElement).blur()}
              required
              value={durationDays}
              onChange={(e) => {
                const valStr = e.target.value;
                setDurationDays(valStr === '' ? '' : Math.max(0, parseInt(valStr) || 0));
              }}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/10 text-white focus:border-white focus:ring-white' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black'
              }`}
            />
            <p className="text-[10px] text-slate-400 mt-1">Excluye fines de semana y festivos en Colombia.</p>
          </div>

          {/* Priority */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Prioridad de Ejecución
            </label>
            <input
              type="number"
              min="1"
              required
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/10 text-white focus:border-white focus:ring-white' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black'
              }`}
            />
            <p className="text-[10px] text-slate-400 mt-1">Define el orden secuencial. 1 = Primero.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Estado de Avance
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/10 text-white focus:border-white focus:ring-white' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black'
              }`}
            >
              <option value="Pendiente">⬜ Pendiente</option>
              <option value="En desarrollo">🟨 En desarrollo</option>
              <option value="Realizado">✅ Realizado</option>
              <option value="N/A">➖ N/A</option>
            </select>
          </div>

          {/* Modeler Assignee */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Asignado a
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/10 text-white focus:border-white focus:ring-white' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black'
              }`}
            >
              <option value="">✨ Auto-asignar por Carga</option>
              {modelers.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.active}>
                  {m.name} {!m.active ? '(Inactivo)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Programar en Paralelo */}
        <div className={`border rounded-xl p-3 ${
          isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="max-w-[85%]">
              <label htmlFor="isParallel" className={`block text-xs font-bold cursor-pointer ${
                isDarkMode ? 'text-slate-200' : 'text-slate-700'
              }`}>
                Programar en paralelo
              </label>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                No consume ni bloquea el tiempo secuencial de la cola del modelador (permite solaparse con otras actividades).
              </span>
            </div>
            <input
              id="isParallel"
              type="checkbox"
              checked={isParallel}
              onChange={(e) => setIsParallel(e.target.checked)}
              className={`rounded w-4 h-4 cursor-pointer focus:ring-0 ${
                isDarkMode 
                  ? 'border-white/10 bg-[#16191D] text-white' 
                  : 'border-slate-300 text-black'
              }`}
            />
          </div>

          {isParallel && (
            <div className={`mt-3 border-t pt-3 space-y-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Realizar en paralelo con la actividad:
              </label>
              <select
                value={parallelWithTaskId}
                onChange={(e) => setParallelWithTaskId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                  isDarkMode 
                    ? 'bg-[#16191D] border-white/10 text-slate-200 focus:border-white focus:ring-white' 
                    : 'bg-white border-slate-200 text-slate-800 focus:border-black focus:ring-black'
                }`}
              >
                <option value="">-- Seleccionar actividad de referencia --</option>
                {tasks
                  .filter(t => t.id !== task?.id) // exclude current task
                  .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.code || 'S/C'}] {t.name}
                    </option>
                  ))
                }
              </select>
              <p className="text-[10px] text-slate-400">
                Ambas actividades se programarán para realizarse a partir del mismo día.
              </p>
            </div>
          )}
        </div>

        {/* Start and Delivery Dates */}
        <div className="grid grid-cols-2 gap-4">
          {/* Manual Start Date override */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Fecha Programada Manual (Opcional)
            </label>
            <input
              type="date"
              value={manualStart}
              onChange={(e) => setManualStart(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/10 text-white focus:border-white focus:ring-white' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black'
              }`}
            />
            <p className="text-[10px] text-slate-400 mt-1">Si se define, anula y fija el inicio programado de esta actividad.</p>
          </div>

          {/* Target Delivery Date */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Fecha Límite de Entrega (Opcional)
            </label>
            <input
              type="date"
              value={targetDeliveryDate}
              onChange={(e) => setTargetDeliveryDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/10 text-white focus:border-white focus:ring-white' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-black focus:ring-black'
              }`}
            />
            <p className="text-[10px] text-slate-400 mt-1">Se usará para alertar retrasos si se supera esta fecha.</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Notas de Coordinación / Observaciones
          </label>
          <textarea
            placeholder="Anotaciones técnicas de BIM o Revit..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 transition-colors ${
              isDarkMode 
                ? 'bg-[#16191D] border-white/10 text-white placeholder-slate-600 focus:border-white focus:ring-white' 
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-black focus:ring-black'
            }`}
          />
        </div>

        {/* Actions buttons */}
        <div className={`flex items-center justify-between pt-4 border-t gap-3 ${
          isDarkMode ? 'border-white/10' : 'border-slate-100'
        }`}>
          {task && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className={`px-4 py-2 font-semibold rounded-xl transition ${
                isDarkMode ? 'text-rose-400 hover:bg-rose-500/10' : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              Eliminar
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 border font-semibold rounded-xl transition ${
                isDarkMode 
                  ? 'border-white/10 hover:bg-white/5 text-slate-300' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 font-semibold rounded-xl transition shadow-sm ${
                isDarkMode 
                  ? 'bg-white text-black hover:bg-slate-200' 
                  : 'bg-black text-white hover:bg-neutral-800'
              }`}
            >
              {task ? 'Guardar Cambios' : 'Agregar Labor'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
