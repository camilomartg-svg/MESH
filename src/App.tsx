import { useState, useEffect, Fragment } from 'react';
import { Task, Modeler, ProjectSettings, EmailLog, BimCategory, ProjectData, Drawing } from './types';
import { calculateSchedule, formatDateKey, addWorkingDays, getWorkingDaysCount } from './utils/colombiaCalendar';
import { DEFAULT_PROJECT_DATA } from './utils/defaultData';
import TaskForm from './components/TaskForm';
import CalendarView from './components/CalendarView';
import ModelersSettings from './components/ModelersSettings';
import EmailSync from './components/EmailSync';
import { 
  CheckSquare, 
  Square, 
  Calendar, 
  Users, 
  Mail, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  Sliders, 
  CheckCircle2, 
  RefreshCw, 
  Info,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';

const SUGGESTED_TASKS_BY_CATEGORY: { [key in BimCategory]: string[] } = {
  'ELEMENTOS ESTRUCTURALES': [
    'Muros de Contención',
    'Columnas Estructurales',
    'Columna Exenta / Pilote',
    'Vigas de Entrepi./Borde',
    'Losa de Cimentación',
    'Losas de Entrepaño',
    'Losas de Rampa',
  ],
  'ENVOLVENTE ARQUITECTÓNICA': [
    'Muros de Fachada Claros',
    'Muros de Ático Oscuros',
    'Muros Medianeros',
    'Muros Cortina',
    'Montantes y Paneles',
    'Ventanas Laterales',
    'Marcos Cajón Salientes',
    'Puertas de Acceso',
    'Puertas Vidriadas',
    'Cubierta del Ático',
    'Cubiertas / Terrazas',
  ],
  'DIVISIONES INTERIORES': [
    'Muros Divisorios Aptos',
    'Muros de Drywall',
    'Pisos de Madera Lam.',
    'Pisos de Porcelanato',
    'Decks de Madera',
    'Pisos de Balcones',
    'Pisos de Alto Tránsito',
    'Cielorrasos de Drywall',
    'Cielos con Registros',
  ],
  'CIRCULACIÓN Y SEGURIDAD': [
    'Escalera Principal',
    'Escalinatas Exteriores',
    'Rampa de Acceso PMR',
    'Rampas Vehiculares',
    'Barandas de Balcón',
    'Barandas de Terrazas',
    'Pasamanos de Punto Fijo',
  ],
  'REMATES Y EXTERIORES': [
    'Pérgola de Ático',
    'Jardineras Modeladas',
    'Árboles y Arbustos',
    'Cerrajería de Lote',
    'Sólido Topográfico',
    'Mobiliario de Contexto',
    'Luminarias de Exterior',
  ],
};

const CATEGORIES: BimCategory[] = [
  'ELEMENTOS ESTRUCTURALES',
  'ENVOLVENTE ARQUITECTÓNICA',
  'DIVISIONES INTERIORES',
  'CIRCULACIÓN Y SEGURIDAD',
  'REMATES Y EXTERIORES',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'checklist' | 'planimetria' | 'calendar' | 'modelers' | 'email'>('checklist');
  const [selectedCategory, setSelectedCategory] = useState<BimCategory | 'TODOS'>('TODOS');
  const [selectedDrawingSeries, setSelectedDrawingSeries] = useState<string | 'TODAS'>('TODAS');

  // Core Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modelers, setModelers] = useState<Modeler[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_PROJECT_DATA.settings);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearDrawings, setConfirmClearDrawings] = useState(false);

  // Load from server, with fallback to localStorage then defaults
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/project');
        if (response.ok) {
          const data = await response.json() as ProjectData;
          if (data && data.tasks) {
            setTasks(data.tasks);
            setModelers(data.modelers || DEFAULT_PROJECT_DATA.modelers);
            setSettings(data.settings || DEFAULT_PROJECT_DATA.settings);
            setEmailLogs(data.emailLogs || []);
            setDrawings(data.drawings || DEFAULT_PROJECT_DATA.drawings || []);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error fetching from server, loading local backup:', err);
      }

      // LocalStorage Backup Fallback
      const local = localStorage.getItem('revit_planner_project');
      if (local) {
        try {
          const parsed = JSON.parse(local) as ProjectData;
          setTasks(parsed.tasks);
          setModelers(parsed.modelers);
          setSettings(parsed.settings);
          setEmailLogs(parsed.emailLogs || []);
          setDrawings(parsed.drawings || DEFAULT_PROJECT_DATA.drawings || []);
          setLoading(false);
          return;
        } catch (e) {
          console.error(e);
        }
      }

      // Default State Fallback
      setTasks(DEFAULT_PROJECT_DATA.tasks);
      setModelers(DEFAULT_PROJECT_DATA.modelers);
      setSettings(DEFAULT_PROJECT_DATA.settings);
      setEmailLogs([]);
      setDrawings(DEFAULT_PROJECT_DATA.drawings || []);
      setLoading(false);
    }

    loadData();
  }, []);

  // Sync / Recalculate schedule whenever tasks, modelers, settings, or drawings change
  useEffect(() => {
    if (loading) return;

    // Run scheduling calculation
    const scheduled = calculateSchedule(tasks, modelers, settings.startDate);
    
    // Check if scheduled is different from current to prevent infinite updates
    const hasChanged = JSON.stringify(scheduled) !== JSON.stringify(tasks);
    if (hasChanged) {
      setTasks(scheduled);
      return;
    }

    // Save to server
    const currentData: ProjectData = {
      tasks,
      modelers,
      settings,
      emailLogs,
      drawings,
    };

    localStorage.setItem('revit_planner_project', JSON.stringify(currentData));

    async function saveToServer() {
      setSaving(true);
      try {
        await fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentData),
        });
      } catch (err) {
        console.error('Failed to sync changes with server:', err);
      } finally {
        setSaving(false);
      }
    }

    const timer = setTimeout(() => {
      saveToServer();
    }, 500);

    return () => clearTimeout(timer);
  }, [tasks, modelers, settings, emailLogs, drawings, loading]);

  // Recalculate and sort priorities to make them neat (1, 2, 3...)
  const handleRenumberPriorities = () => {
    const sorted = [...tasks].sort((a, b) => a.priority - b.priority);
    const renumbered = sorted.map((t, index) => ({
      ...t,
      priority: index + 1,
    }));
    setTasks(renumbered);
  };

  // Add or Edit save handler
  const handleSaveTask = (savedTask: Task) => {
    const exists = tasks.some(t => t.id === savedTask.id);
    let updatedTasks: Task[];

    if (exists) {
      updatedTasks = tasks.map(t => t.id === savedTask.id ? savedTask : t);
    } else {
      updatedTasks = [...tasks, savedTask];
    }

    setTasks(updatedTasks);
    setIsFormOpen(false);
    setEditingTask(null);
  };

  // Delete task handler
  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    setIsFormOpen(false);
    setEditingTask(null);
  };

  // Toggle task status quickly
  const handleToggleStatus = (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Modelado' ? 'Pendiente' : t.status === 'Pendiente' ? 'Modelado' : 'Pendiente';
        return { ...t, status: nextStatus as any };
      }
      return t;
    });
    setTasks(updated);
  };

  // Selection and mass programming handlers
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const handleToggleSelectTask = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (filteredList: Task[]) => {
    const allFilteredIds = filteredList.map(t => t.id);
    const allAlreadySelected = allFilteredIds.every(id => selectedTaskIds.includes(id));
    
    if (allAlreadySelected) {
      setSelectedTaskIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleUpdateTaskField = (id: string, field: keyof Task, value: any) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    });
    setTasks(updated);
  };

  const handleBulkAssign = (assigneeId: string | null) => {
    const updated = tasks.map(t => {
      if (selectedTaskIds.includes(t.id)) {
        return { ...t, assigneeId };
      }
      return t;
    });
    setTasks(updated);
  };

  const handleBulkDuration = (days: number) => {
    const updated = tasks.map(t => {
      if (selectedTaskIds.includes(t.id)) {
        return { ...t, durationDays: days };
      }
      return t;
    });
    setTasks(updated);
  };

  const handleBulkDeliveryDate = (date: string | null) => {
    const updated = tasks.map(t => {
      if (selectedTaskIds.includes(t.id)) {
        return { ...t, targetDeliveryDate: date };
      }
      return t;
    });
    setTasks(updated);
  };

  const handleBulkStatus = (status: 'Modelado' | 'Pendiente' | 'N/A') => {
    const updated = tasks.map(t => {
      if (selectedTaskIds.includes(t.id)) {
        return { ...t, status };
      }
      return t;
    });
    setTasks(updated);
  };

  const handleClearDaysAndDates = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    
    const updated = tasks.map(t => {
      if (selectedCategory === 'TODOS' || t.category === selectedCategory) {
        return {
          ...t,
          durationDays: 0,
          targetDeliveryDate: null,
          scheduledStart: null,
          scheduledEnd: null,
          isDelayed: false,
        };
      }
      return t;
    });
    setTasks(updated);
    setSelectedTaskIds([]); // Clear selection
    setConfirmClear(false);
  };

  const handleUpdateDrawingField = (id: string, field: keyof Drawing, value: any) => {
    const updated = drawings.map(d => {
      if (d.id === id) {
        return { ...d, [field]: value };
      }
      return d;
    });
    setDrawings(updated);
  };

  const handleClearDrawingDates = () => {
    if (!confirmClearDrawings) {
      setConfirmClearDrawings(true);
      return;
    }
    
    const updated = drawings.map(d => {
      if (selectedDrawingSeries === 'TODAS' || d.series === selectedDrawingSeries) {
        return {
          ...d,
          deliveryDate: null,
        };
      }
      return d;
    });
    setDrawings(updated);
    setConfirmClearDrawings(false);
  };

  // Move task UP in priority (decreases priority number, making it run earlier)
  const handleMovePriorityUp = (index: number) => {
    if (index === 0) return;
    const listCopy = [...tasks];
    const current = listCopy[index];
    const prev = listCopy[index - 1];

    // Swap priority values
    const tempPriority = current.priority;
    current.priority = prev.priority;
    prev.priority = tempPriority;

    // Swap list elements to maintain sorted order visual experience
    listCopy[index] = prev;
    listCopy[index - 1] = current;

    setTasks(listCopy);
  };

  // Move task DOWN in priority (increases priority number, making it run later)
  const handleMovePriorityDown = (index: number) => {
    if (index === tasks.length - 1) return;
    const listCopy = [...tasks];
    const current = listCopy[index];
    const next = listCopy[index + 1];

    // Swap priority values
    const tempPriority = current.priority;
    current.priority = next.priority;
    next.priority = tempPriority;

    // Swap list elements to maintain sorted order visual experience
    listCopy[index] = next;
    listCopy[index + 1] = current;

    setTasks(listCopy);
  };

  // Email trigger logic connecting client with backend
  const handleTriggerEmail = async (to: string, subject: string, body: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          body,
          smtpSettings: {
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPass: settings.smtpPass,
          },
        }),
      });

      const data = await response.json();
      
      // Refresh local logs and tasks as the server saves the log itself
      const freshRes = await fetch('/api/project');
      if (freshRes.ok) {
        const freshData = await freshRes.json() as ProjectData;
        if (freshData.emailLogs) {
          setEmailLogs(freshData.emailLogs);
        }
      }

      return data;
    } catch (err: any) {
      console.error('Email trigger client-side error:', err);
      return { success: false, error: err?.message || 'Error de conexión.' };
    }
  };

  // Sort tasks in App state to ensure correct priorities rendering
  const sortedTasksForChecklist = [...tasks].sort((a, b) => a.priority - b.priority);

  const filteredTasks = selectedCategory === 'TODOS' 
    ? sortedTasksForChecklist 
    : sortedTasksForChecklist.filter(t => t.category === selectedCategory);

  // Statistics calculation
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'Modelado').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'Pendiente').length;
  const delayedTasksCount = tasks.filter(t => t.isDelayed).length;
  const activeModelersCount = modelers.filter(m => m.active).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-amber-500" size={44} />
          <p className="text-sm text-slate-400 font-medium tracking-wider uppercase">Iniciando Planificador Revit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-slate-300 font-sans antialiased">
      {/* HEADER SECTION */}
      <header className="bg-[#0F1115] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Spinning Logo from design */}
              <div className="w-10 h-10 bg-amber-500 rounded-sm rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] flex-shrink-0">
                <div className="w-5 h-5 border-2 border-[#0A0A0C] -rotate-45"></div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    FLUXO BOGOTÁ • COLOMBIA
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]"></div>
                    Sincronizado
                  </span>
                </div>
                <h1 id="app-title" className="text-xl font-bold tracking-wider text-white">
                  PLANIFICADOR <span className="text-amber-500">REVIT COLOMBIA</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Optimización secuencial por modelador, exclusión de feriados colombianos y sincronización de correo.
                </p>
              </div>
            </div>

            {/* Project Global Start Date and Save Indicator */}
            <div className="flex items-center gap-3 self-start md:self-center">
              <div className="bg-[#16191D] p-2.5 rounded-xl border border-white/10 text-xs">
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                  <CalendarDays size={12} className="text-amber-500" /> Fecha de Inicio del Proyecto
                </label>
                <input
                  type="date"
                  value={settings.startDate}
                  onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer border-b border-dashed border-white/20 pb-0.5 focus:border-amber-500"
                />
              </div>

              {saving ? (
                <div className="text-[10px] bg-white/5 text-amber-400 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-white/10 font-medium">
                  <RefreshCw size={11} className="animate-spin" /> Guardando...
                </div>
              ) : (
                <div className="text-[10px] bg-white/5 text-emerald-400 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-white/10 font-medium">
                  <CheckCircle2 size={11} /> Guardado
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* METRICS DASHBOARD */}
      <section className="bg-[#0A0A0C] border-b border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Stat 1 */}
            <div className="bg-[#0F1115] rounded-2xl p-4 border border-white/5 flex items-center gap-3.5 shadow-md">
              <div className="p-3 bg-white/5 text-amber-500 rounded-xl border border-white/5">
                <TrendingUp size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Total Tareas</span>
                <span className="text-lg font-bold text-white">{totalTasksCount}</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-[#0F1115] rounded-2xl p-4 border border-white/5 flex items-center gap-3.5 shadow-md">
              <div className="p-3 bg-white/5 text-emerald-500 rounded-xl border border-white/5">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Modelado</span>
                <span className="text-lg font-bold text-white">{completedTasksCount}</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-[#0F1115] rounded-2xl p-4 border border-white/5 flex items-center gap-3.5 shadow-md">
              <div className="p-3 bg-white/5 text-amber-400 rounded-xl border border-white/5">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Pendientes</span>
                <span className="text-lg font-bold text-white">{pendingTasksCount}</span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className={`rounded-2xl p-4 border flex items-center gap-3.5 transition shadow-md ${
              delayedTasksCount > 0 
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' 
                : 'bg-[#0F1115] border-white/5'
            }`}>
              <div className={`p-3 rounded-xl ${delayedTasksCount > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-white/5 text-slate-500'}`}>
                <AlertCircle size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Retrasadas</span>
                <span className="text-lg font-bold">{delayedTasksCount}</span>
              </div>
            </div>

            {/* Stat 5 */}
            <div className="bg-[#0F1115] rounded-2xl p-4 border border-white/5 flex items-center gap-3.5 col-span-2 md:col-span-1 shadow-md">
              <div className="p-3 bg-white/5 text-purple-400 rounded-xl border border-white/5">
                <Users size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Modeladores</span>
                <span className="text-lg font-bold text-white">{activeModelersCount}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CORE NAVIGATION AND LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10">
          <nav className="flex gap-6 -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'checklist'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              <CheckSquare size={16} className={activeTab === 'checklist' ? 'text-amber-500' : ''} />
              Lista de Control BIM
            </button>
            <button
              onClick={() => setActiveTab('planimetria')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'planimetria'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              <FileSpreadsheet size={16} className={activeTab === 'planimetria' ? 'text-amber-500' : ''} />
              Planimetría (Lista de Planos)
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'calendar'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              <Calendar size={16} className={activeTab === 'calendar' ? 'text-amber-500' : ''} />
              Calendario de Entregas
            </button>
            <button
              onClick={() => setActiveTab('modelers')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'modelers'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              <Users size={16} className={activeTab === 'modelers' ? 'text-amber-500' : ''} />
              Modeladores ({modelers.length})
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition flex items-center gap-2 ${
                activeTab === 'email'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10'
              }`}
            >
              <Mail size={16} className={activeTab === 'email' ? 'text-amber-500' : ''} />
              Correo & Alertas
              {delayedTasksCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 block animate-bounce" />
              )}
            </button>
          </nav>
        </div>

        {/* TAB CONTENT: CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0F1115] p-4 border border-white/10 rounded-2xl shadow-sm">
              {/* Category selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedCategory('TODOS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedCategory === 'TODOS'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Ver Todos
                </button>
                {CATEGORIES.map((cat, index) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                    title={cat}
                  >
                    {index + 1}. {cat.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                <button
                  onClick={handleClearDaysAndDates}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    confirmClear
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400'
                  }`}
                  title="Borra los días de duración y fechas de entrega de la categoría seleccionada"
                >
                  <Trash2 size={13} className={confirmClear ? 'text-rose-300' : 'text-rose-400'} />
                  {confirmClear 
                    ? `⚠️ Confirmar Borrar (${selectedCategory === 'TODOS' ? 'Todo' : selectedCategory.split(' ')[0]})` 
                    : 'Borrar Días y Fechas'
                  }
                </button>
                {confirmClear && (
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleRenumberPriorities}
                  className="px-3 py-1.5 border border-white/10 bg-transparent hover:bg-white/5 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Alinea las prioridades de forma secuencial consecutiva (1, 2, 3...)"
                >
                  <Sliders size={13} className="text-amber-500" />
                  Corregir Secuencias
                </button>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsFormOpen(true);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-black font-extrabold uppercase tracking-wider rounded-xl text-[11px] flex items-center gap-1.5 transition shadow-md shadow-white/5"
                >
                  <Plus size={14} strokeWidth={3} />
                  Nueva Tarea
                </button>
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedTaskIds.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 shadow-lg flex flex-col gap-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-white font-extrabold text-xs uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>⚡ Programación en Masa ({selectedTaskIds.length} seleccionadas)</span>
                  </div>
                  <button
                    onClick={() => setSelectedTaskIds([])}
                    className="text-[10px] text-slate-400 hover:text-white uppercase font-bold tracking-wider"
                  >
                    Deseleccionar todo
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  {/* Modeler Assign */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Asignar Modelador:</label>
                    <select
                      onChange={(e) => {
                        handleBulkAssign(e.target.value === 'auto' ? null : e.target.value || null);
                        e.target.value = ''; // Reset select
                      }}
                      className="bg-[#16191D] border border-white/10 rounded-xl py-1.5 px-3 focus:outline-none focus:border-amber-500 text-white font-semibold text-xs cursor-pointer"
                    >
                      <option value="">Elegir...</option>
                      <option value="auto">Auto-asignar</option>
                      {modelers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Definir Duración:</label>
                    <div className="flex items-center gap-1 bg-[#16191D] border border-white/10 rounded-xl px-2 py-0.5">
                      <input
                        type="number"
                        min="0"
                        placeholder="Días"
                        id="bulk-duration-input"
                        className="w-full bg-transparent border-0 focus:outline-none text-white text-xs font-bold text-center py-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = document.getElementById('bulk-duration-input') as HTMLInputElement;
                            if (input) {
                              const val = Math.max(0, parseInt(input.value) || 0);
                              handleBulkDuration(val);
                              input.value = ''; // Reset
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById('bulk-duration-input') as HTMLInputElement;
                          if (input) {
                            const val = Math.max(0, parseInt(input.value) || 0);
                            handleBulkDuration(val);
                            input.value = ''; // Reset
                          }
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] rounded-lg transition"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>

                  {/* Target Date input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fecha de Entrega Límite:</label>
                    <div className="flex items-center gap-1 bg-[#16191D] border border-white/10 rounded-xl px-2 py-0.5">
                      <input
                        type="date"
                        id="bulk-date-input"
                        className="w-full bg-transparent border-0 focus:outline-none text-white text-xs font-semibold cursor-pointer py-1"
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById('bulk-date-input') as HTMLInputElement;
                          if (input) {
                            const val = input.value || null;
                            handleBulkDeliveryDate(val);
                            input.value = ''; // Reset
                          }
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] rounded-lg transition animate-pulse"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>

                  {/* Status selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cambiar Estado:</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkStatus(e.target.value as any);
                          e.target.value = ''; // Reset select
                        }
                      }}
                      className="bg-[#16191D] border border-white/10 rounded-xl py-1.5 px-3 focus:outline-none focus:border-amber-500 text-white font-semibold text-xs cursor-pointer"
                    >
                      <option value="">Elegir...</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Modelado">Modelado</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Table Checklist Grid */}
            <div className="bg-[#0F1115] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#16191D] border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.includes(t.id))}
                          onChange={() => handleSelectAllFiltered(filteredTasks)}
                          className="rounded border-white/10 bg-[#16191D] text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                          title="Seleccionar todas las tareas visibles"
                        />
                      </th>
                      <th className="px-4 py-3 text-center w-12">Estado</th>
                      <th className="px-3 py-3 w-16 text-center">Prioridad</th>
                      <th className="px-4 py-3 min-w-56">Labor / Elemento Revit</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 min-w-36">Asignado</th>
                      <th className="px-4 py-3 text-center w-24">Días</th>
                      <th className="px-4 py-3 min-w-44">Fechas Programadas (Colombia)</th>
                      <th className="px-4 py-3 min-w-28">Límite</th>
                      <th className="px-4 py-3 text-right pr-6 w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task, idx) => {
                        const modeler = modelers.find(m => m.id === task.assigneeId);
                        const isCompleted = task.status === 'Modelado';
                        
                        return (
                          <tr 
                            key={task.id} 
                            className={`hover:bg-white/5 transition ${
                              isCompleted 
                                ? 'bg-emerald-950/5 opacity-65 text-slate-400' 
                                : task.isDelayed 
                                ? 'bg-rose-950/10 text-rose-200 border-l-2 border-rose-500' 
                                : ''
                            }`}
                          >
                            {/* Selection Checkbox */}
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={selectedTaskIds.includes(task.id)}
                                onChange={() => handleToggleSelectTask(task.id)}
                                className="rounded border-white/10 bg-[#16191D] text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>

                            {/* State Toggle Checkbox */}
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => handleToggleStatus(task.id)}
                                className="p-1 text-slate-500 hover:text-amber-500 transition"
                                title={isCompleted ? 'Marcar como Pendiente' : 'Marcar como Modelado'}
                              >
                                {isCompleted ? (
                                  <CheckSquare className="text-emerald-500" size={18} />
                                ) : task.status === 'N/A' ? (
                                  <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">N/A</span>
                                ) : (
                                  <Square size={18} />
                                )}
                              </button>
                            </td>
 
                             {/* Priority Ordering Controls */}
                             <td className="px-3 py-3.5">
                               <div className="flex items-center justify-center gap-1">
                                 <span className="font-bold text-[11px] text-white bg-[#16191D] border border-white/10 w-6 h-6 flex items-center justify-center rounded">
                                   {task.priority}
                                 </span>
                                 <div className="flex flex-col">
                                   <button
                                     onClick={() => handleMovePriorityUp(idx)}
                                     disabled={idx === 0}
                                     className="p-0.5 hover:bg-white/5 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30"
                                     title="Subir prioridad (ejecutar antes)"
                                   >
                                     <ArrowUp size={10} />
                                   </button>
                                   <button
                                     onClick={() => handleMovePriorityDown(idx)}
                                     disabled={idx === filteredTasks.length - 1}
                                     className="p-0.5 hover:bg-white/5 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30"
                                     title="Bajar prioridad (ejecutar después)"
                                   >
                                     <ArrowDown size={10} />
                                   </button>
                                 </div>
                               </div>
                             </td>
 
                             {/* Task Name & Description */}
                             <td className="px-4 py-3.5">
                               <div>
                                 <span className={`font-bold text-sm ${isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
                                   {task.name}
                                 </span>
                                 {task.description && (
                                   <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-xs" title={task.description}>
                                     {task.description}
                                   </p>
                                 )}
                                 {task.notes && (
                                   <span className="inline-block text-[9px] bg-white/5 text-slate-400 border border-white/5 font-mono px-1 py-0.2 rounded mt-1 max-w-xs truncate">
                                     📝 {task.notes}
                                   </span>
                                 )}
                               </div>
                             </td>
 
                             {/* Category Badge */}
                             <td className="px-4 py-3.5">
                               <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400 tracking-wider">
                                 {task.category.split(' ')[0]}
                               </span>
                             </td>
 
                             {/* Modeler Assignee (INLINE EDITABLE!) */}
                             <td className="px-4 py-3.5">
                               <div className="flex items-center gap-1">
                                 {modeler && (
                                   <span 
                                     className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/10" 
                                     style={{ backgroundColor: modeler.color }} 
                                   />
                                 )}
                                 <select
                                   value={task.assigneeId || ''}
                                   onChange={(e) => {
                                     const val = e.target.value || null;
                                     handleUpdateTaskField(task.id, 'assigneeId', val);
                                   }}
                                   className="bg-[#16191D] border border-white/10 rounded-lg py-1 px-1.5 focus:outline-none focus:border-amber-500 text-slate-300 hover:text-white font-semibold text-[11px] cursor-pointer transition max-w-[120px]"
                                 >
                                   <option value="">Auto-asignar</option>
                                   {modelers.map(m => (
                                     <option key={m.id} value={m.id}>
                                       {m.name.split(' ')[0]} {m.name.split(' ')[1] || ''}
                                     </option>
                                   ))}
                                 </select>
                               </div>
                             </td>
 
                             {/* Working Days Duration (INLINE EDITABLE!) */}
                             <td className="px-4 py-3.5 text-center font-bold text-white">
                               <div className="flex items-center justify-center gap-1">
                                 <input
                                   type="number"
                                   min="0"
                                   value={task.durationDays}
                                   onChange={(e) => {
                                     const val = Math.max(0, parseInt(e.target.value) || 0);
                                     handleUpdateTaskField(task.id, 'durationDays', val);
                                   }}
                                   className="w-14 text-center bg-[#16191D] border border-white/10 rounded-lg py-1 px-1 focus:outline-none focus:border-amber-500 font-extrabold text-white text-xs transition"
                                 />
                                 <span className="text-[10px] text-slate-500 font-medium">d</span>
                               </div>
                             </td>

                             {/* Scheduled dates */}
                             <td className="px-4 py-3.5">
                               {task.scheduledStart && task.scheduledEnd ? (
                                 <div className="text-[11px]">
                                   <span className="font-semibold text-slate-200 block">
                                     Del {task.scheduledStart}
                                   </span>
                                   <span className="text-slate-500 font-medium">
                                     Al {task.scheduledEnd}
                                   </span>
                                 </div>
                               ) : (
                                 <span className="text-[10px] text-slate-500 italic">Sin programar (Inactivo)</span>
                               )}
                             </td>
 
                             {/* Target Delivery Date & Delay Alerts (INLINE EDITABLE!) */}
                             <td className="px-4 py-3.5">
                               <div className="space-y-1">
                                 <input
                                   type="date"
                                   value={task.targetDeliveryDate || ''}
                                   onChange={(e) => {
                                     const val = e.target.value || null;
                                     handleUpdateTaskField(task.id, 'targetDeliveryDate', val);
                                   }}
                                   className="bg-[#16191D] border border-white/10 rounded-lg py-1 px-1.5 focus:outline-none focus:border-amber-500 text-slate-300 hover:text-white font-semibold text-[11px] cursor-pointer transition w-full max-w-[125px]"
                                 />
                                 {task.isDelayed && (
                                   <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[8px] font-extrabold uppercase tracking-wide border border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)] animate-pulse">
                                     ⚠️ Retrasado
                                   </span>
                                 )}
                               </div>
                             </td>

                            {/* Action Buttons */}
                            <td className="px-4 py-3.5 text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsFormOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-amber-500 transition"
                                  title="Editar tarea"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-rose-400 transition"
                                  title="Eliminar tarea"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="text-center py-12 bg-[#0F1115] text-slate-500">
                          <Info className="mx-auto mb-2 text-slate-600" size={24} />
                          No hay tareas en esta categoría. Agrega una nueva o cambia el filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend card info - styled as the Amber aviso card */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs text-slate-400 flex gap-3 items-start">
              <Info className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-amber-200">¿Cómo funciona la prioridad y asignación secuencial?</p>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Las labores se ordenan estrictamente por prioridad (el número menor va primero). El motor de programación simula que cada modelador activo solo trabaja en un elemento de su cola a la vez. Cuando termina un elemento, pasa inmediatamente al siguiente al día laborable siguiente. Los fines de semana y los festivos colombianos se omiten de la cuenta de forma automática.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: PLANIMETRÍA */}
        {activeTab === 'planimetria' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-[#0F1115] p-4 border border-white/10 rounded-2xl shadow-sm">
              {/* Series selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'TODAS', label: 'Ver Todos' },
                  { key: 'SERIE 100: ARQUITECTURA GENERAL (AUT)', label: '100: AUT' },
                  { key: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)', label: '200: AM' },
                  { key: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)', label: '300: AC' },
                  { key: 'SERIE 400: CIELORRASOS REFLEJADOS (CC)', label: '400: CC' },
                  { key: 'SERIE 500: DETALLES DE ÁREAS COMUNES (ZC)', label: '500: ZC' },
                  { key: 'SERIE 600: DESPIECES DE APARTAMENTOS Y ZONAS HÚMEDAS (AP)', label: '600: AP' },
                  { key: 'SERIE 700: CARPINTERÍA, VENTANERÍA Y CERRAJERÍA (CAR)', label: '700: CAR' },
                  { key: 'SERIE 800: DETALLES CONSTRUCTIVOS DE NUDOS CRÍTICOS (DTE)', label: '800: DTE' },
                  { key: 'SERIE 900: INFRAESTRUCTURA DE SERVICIOS (UTI)', label: '900: UTI' },
                  { key: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)', label: '800: CF (DTE)' },
                ].map((ser) => (
                  <button
                    key={ser.key}
                    onClick={() => {
                      setSelectedDrawingSeries(ser.key);
                      setConfirmClearDrawings(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition ${
                      selectedDrawingSeries === ser.key
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                    title={ser.key}
                  >
                    {ser.label}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end xl:self-center">
                <button
                  onClick={handleClearDrawingDates}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    confirmClearDrawings
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400'
                  }`}
                  title="Borra las fechas de entrega de la serie seleccionada"
                >
                  <Trash2 size={13} className={confirmClearDrawings ? 'text-rose-300' : 'text-rose-400'} />
                  {confirmClearDrawings 
                    ? `⚠️ Confirmar Borrar (${selectedDrawingSeries === 'TODAS' ? 'Todo' : 'Serie'})` 
                    : 'Borrar Fechas'
                  }
                </button>
                {confirmClearDrawings && (
                  <button
                    onClick={() => setConfirmClearDrawings(false)}
                    className="px-2.5 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Table Drawings Grid */}
            <div className="bg-[#0F1115] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#16191D] border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-center w-28">Código</th>
                      <th className="px-4 py-3 min-w-64">Nombre del Plano</th>
                      <th className="px-4 py-3 text-center w-20">Escala</th>
                      <th className="px-4 py-3 text-center w-20">Realizado</th>
                      <th className="px-4 py-3 text-center w-20">Pendiente</th>
                      <th className="px-4 py-3 text-center w-20">N/A</th>
                      <th className="px-4 py-3 min-w-72">Observaciones Técnicas del Proyecto</th>
                      <th className="px-4 py-3 text-center w-24">Días</th>
                      <th className="px-4 py-3 text-center w-40">Fecha entrega</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {(() => {
                      const filtered = selectedDrawingSeries === 'TODAS'
                        ? drawings
                        : drawings.filter(d => d.series === selectedDrawingSeries);

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} className="text-center py-12 bg-[#0F1115] text-slate-500">
                              <Info className="mx-auto mb-2 text-slate-600" size={24} />
                              No hay planos para la serie seleccionada.
                            </td>
                          </tr>
                        );
                      }

                      // Find unique series represented in the filtered list
                      const uniqueSeries = Array.from(new Set(filtered.map(d => d.series)));

                      return uniqueSeries.map(seriesName => {
                        const seriesDrawings = filtered.filter(d => d.series === seriesName);
                        return (
                          <Fragment key={seriesName}>
                            {/* Series Subheader */}
                            <tr className="bg-[#13161A]">
                              <td colSpan={9} className="px-4 py-2 text-left font-bold text-amber-500 text-[11px] uppercase tracking-wider border-y border-white/5 select-none">
                                {seriesName}
                              </td>
                            </tr>
                            {seriesDrawings.map(d => {
                              return (
                                <tr key={d.id} className="hover:bg-white/5 transition">
                                  {/* Code */}
                                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                                    {d.code}
                                  </td>

                                  {/* Name */}
                                  <td className="px-4 py-3 font-semibold text-white text-[13px]">
                                    {d.name}
                                  </td>

                                  {/* Scale */}
                                  <td className="px-4 py-3 text-center font-mono text-slate-400">
                                    {d.scale}
                                  </td>

                                  {/* Realizado */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'Realizado'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', 'Realizado')}
                                      className="rounded border-white/10 bg-[#16191D] text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                  </td>

                                  {/* Pendiente */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'Pendiente'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', 'Pendiente')}
                                      className="rounded border-white/10 bg-[#16191D] text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                    />
                                  </td>

                                  {/* N/A */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'N/A'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', 'N/A')}
                                      className="rounded border-white/10 bg-[#16191D] text-slate-500 focus:ring-slate-500 w-4 h-4 cursor-pointer"
                                    />
                                  </td>

                                  {/* Observations */}
                                  <td className="px-4 py-3">
                                    <input
                                      type="text"
                                      value={d.observations}
                                      onChange={(e) => handleUpdateDrawingField(d.id, 'observations', e.target.value)}
                                      placeholder="Modificar observaciones técnicas del proyecto..."
                                      className="w-full bg-[#16191D] border border-white/10 rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-amber-500 text-slate-200 text-xs transition"
                                    />
                                  </td>

                                  {/* Days */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="number"
                                      min="1"
                                      value={d.deliveryDate ? getWorkingDaysCount(settings.startDate, d.deliveryDate) : ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                          handleUpdateDrawingField(d.id, 'deliveryDate', null);
                                        } else {
                                          const daysNum = parseInt(val, 10);
                                          if (daysNum > 0) {
                                            const { end } = addWorkingDays(settings.startDate, daysNum);
                                            handleUpdateDrawingField(d.id, 'deliveryDate', end);
                                          }
                                        }
                                      }}
                                      className="w-16 bg-[#16191D] border border-white/10 rounded-lg py-1.5 text-center focus:outline-none focus:border-amber-500 text-slate-200 text-xs transition font-semibold"
                                      placeholder="-"
                                    />
                                  </td>

                                  {/* Delivery Date */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="date"
                                      value={d.deliveryDate || ''}
                                      onChange={(e) => handleUpdateDrawingField(d.id, 'deliveryDate', e.target.value || null)}
                                      className="bg-[#16191D] border border-white/10 rounded-lg py-1 px-2 focus:outline-none focus:border-amber-500 text-slate-200 text-xs cursor-pointer transition w-full max-w-[130px]"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: CALENDAR */}
        {activeTab === 'calendar' && (
          <CalendarView tasks={tasks} modelers={modelers} />
        )}

        {/* TAB CONTENT: MODELERS */}
        {activeTab === 'modelers' && (
          <ModelersSettings modelers={modelers} onUpdateModelers={setModelers} />
        )}

        {/* TAB CONTENT: EMAIL SYNC */}
        {activeTab === 'email' && (
          <EmailSync
            tasks={tasks}
            modelers={modelers}
            settings={settings}
            emailLogs={emailLogs}
            onUpdateSettings={setSettings}
            onTriggerEmail={handleTriggerEmail}
          />
        )}
      </main>

      {/* FLOATING MODAL PANEL FOR CREATE/EDIT TASK */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <TaskForm
              task={editingTask}
              modelers={modelers}
              onSave={handleSaveTask}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTask(null);
              }}
              onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
              suggestedTasksByCategory={SUGGESTED_TASKS_BY_CATEGORY}
            />
          </div>
        </div>
      )}
    </div>
  );
}
