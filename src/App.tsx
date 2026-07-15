import { useState, useEffect, Fragment } from 'react';
import { Task, Modeler, ProjectSettings, EmailLog, BimCategory, ProjectData, Drawing } from './types';
import { calculateSchedule, formatDateKey, addWorkingDays, getWorkingDaysCount } from './utils/colombiaCalendar';
import { DEFAULT_PROJECT_DATA, getInitialTaskIdForDrawing } from './utils/defaultData';
import TaskForm from './components/TaskForm';
import CalendarView from './components/CalendarView';
import ModelersSettings from './components/ModelersSettings';
import EmailSync from './components/EmailSync';
import DrawingDatePicker from './components/DrawingDatePicker';
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
  FileSpreadsheet,
  Link2,
  Sun,
  Moon
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

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('mesh_theme');
    return saved ? saved === 'dark' : false; // Default to Light Mode as requested
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('mesh_theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  // Load from server, with fallback to localStorage then defaults
  useEffect(() => {
    const initializeDrawings = (loadedDrawings: Drawing[]): Drawing[] => {
      return loadedDrawings.map(d => {
        if (!d.taskId) {
          return { ...d, taskId: getInitialTaskIdForDrawing(d.code) };
        }
        return d;
      });
    };

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
            setDrawings(initializeDrawings(data.drawings || DEFAULT_PROJECT_DATA.drawings || []));
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
          setDrawings(initializeDrawings(parsed.drawings || DEFAULT_PROJECT_DATA.drawings || []));
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
      setDrawings(initializeDrawings(DEFAULT_PROJECT_DATA.drawings || []));
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
      <div className={`min-h-screen flex flex-col items-center justify-center font-sans transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0A0A0C] text-white' : 'bg-slate-50 text-slate-800'
      }`}>
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className={`animate-spin ${isDarkMode ? 'text-white' : 'text-black'}`} size={44} />
          <p className={`text-sm font-semibold tracking-wider uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Iniciando Planificador Revit...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0A0A0C] text-slate-300' : 'bg-[#F8F9FA] text-slate-800'
    }`}>
      {/* HEADER SECTION */}
      <header className={`border-b transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0F1115] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Mesh Logo */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <img 
                  src={isDarkMode ? "https://i.postimg.cc/L8SdJJcg/cropped-logo-mesh-estudio-2024-(blanco).webp" : "https://i.postimg.cc/mrdYJph3/cropped-logo-mesh-estudio-2024.webp"} 
                  alt="Mesh Estudio" 
                  className="h-10 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`border text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isDarkMode ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    FLUXO BOGOTÁ • COLOMBIA
                  </span>
                  <span className={`border text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                    isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]"></div>
                    Sincronizado
                  </span>
                </div>
                <h1 id="app-title" className={`text-xl font-bold tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  PLANIFICADOR <span className={isDarkMode ? 'text-white border-b border-white' : 'text-slate-950 border-b border-slate-950'}>REVIT COLOMBIA</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Optimización secuencial por modelador, exclusión de feriados colombianos y sincronización de correo.
                </p>
              </div>
            </div>

            {/* Theme Toggle & Project Global Start Date and Save Indicator */}
            <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                  isDarkMode 
                    ? 'bg-[#16191D] border-white/10 hover:bg-white/5 text-slate-300' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                }`}
                title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <div className={`p-2.5 rounded-xl border text-xs ${
                isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                  <CalendarDays size={12} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} /> Fecha de Inicio del Proyecto
                </label>
                <input
                  type="date"
                  value={settings.startDate}
                  onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                  className={`bg-transparent font-bold focus:outline-none cursor-pointer border-b border-dashed pb-0.5 ${
                    isDarkMode 
                      ? 'text-white border-white/20 focus:border-white' 
                      : 'text-slate-900 border-slate-300 focus:border-black'
                  }`}
                />
              </div>

              {saving ? (
                <div className={`text-[10px] px-3 py-2.5 rounded-xl flex items-center gap-1.5 border font-semibold ${
                  isDarkMode ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <RefreshCw size={11} className="animate-spin" /> Guardando...
                </div>
              ) : (
                <div className={`text-[10px] px-3 py-2.5 rounded-xl flex items-center gap-1.5 border font-semibold ${
                  isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <CheckCircle2 size={11} /> Guardado
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* METRICS DASHBOARD */}
      <section className={`border-b transition-colors duration-200 py-6 ${
        isDarkMode ? 'bg-[#0A0A0C] border-white/5' : 'bg-slate-100 border-slate-200/80'
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Stat 1 */}
            <div className={`rounded-2xl p-4 border flex items-center gap-3.5 shadow-sm transition-all ${
              isDarkMode ? 'bg-[#0F1115] border-white/5' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-white/5 text-slate-200 border-white/5' : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
                <TrendingUp size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Total Tareas</span>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalTasksCount}</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className={`rounded-2xl p-4 border flex items-center gap-3.5 shadow-sm transition-all ${
              isDarkMode ? 'bg-[#0F1115] border-white/5' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-white/5 text-slate-200 border-white/5' : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Modelado</span>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{completedTasksCount}</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className={`rounded-2xl p-4 border flex items-center gap-3.5 shadow-sm transition-all ${
              isDarkMode ? 'bg-[#0F1115] border-white/5' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-white/5 text-slate-200 border-white/5' : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Pendientes</span>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{pendingTasksCount}</span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className={`rounded-2xl p-4 border flex items-center gap-3.5 transition-all shadow-sm ${
              delayedTasksCount > 0 
                ? (isDarkMode ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800') 
                : (isDarkMode ? 'bg-[#0F1115] border-white/5' : 'bg-white border-slate-200')
            }`}>
              <div className={`p-3 rounded-xl ${
                delayedTasksCount > 0 
                  ? 'bg-rose-500/20 text-rose-500 animate-pulse' 
                  : (isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600')
              }`}>
                <AlertCircle size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Retrasadas</span>
                <span className={`text-lg font-bold ${isDarkMode || delayedTasksCount > 0 ? '' : 'text-slate-900'}`}>{delayedTasksCount}</span>
              </div>
            </div>

            {/* Stat 5 */}
            <div className={`rounded-2xl p-4 border flex items-center gap-3.5 col-span-2 md:col-span-1 shadow-sm transition-all ${
              isDarkMode ? 'bg-[#0F1115] border-white/5' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-white/5 text-slate-200 border-white/5' : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
                <Users size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Modeladores</span>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeModelersCount}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CORE NAVIGATION AND LAYOUT */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className={`flex border-b transition-colors duration-200 ${
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        }`}>
          <nav className="flex gap-6 -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'checklist'
                  ? (isDarkMode ? 'border-white text-white' : 'border-slate-950 text-slate-950')
                  : (isDarkMode ? 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200')
              }`}
            >
              <CheckSquare size={16} />
              Lista de Control BIM
            </button>
            <button
              onClick={() => setActiveTab('planimetria')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'planimetria'
                  ? (isDarkMode ? 'border-white text-white' : 'border-slate-950 text-slate-950')
                  : (isDarkMode ? 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200')
              }`}
            >
              <FileSpreadsheet size={16} />
              Planimetría (Lista de Planos)
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'calendar'
                  ? (isDarkMode ? 'border-white text-white' : 'border-slate-950 text-slate-950')
                  : (isDarkMode ? 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200')
              }`}
            >
              <Calendar size={16} />
              Calendario de Entregas
            </button>
            <button
              onClick={() => setActiveTab('modelers')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'modelers'
                  ? (isDarkMode ? 'border-white text-white' : 'border-slate-950 text-slate-950')
                  : (isDarkMode ? 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200')
              }`}
            >
              <Users size={16} />
              Modeladores ({modelers.length})
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'email'
                  ? (isDarkMode ? 'border-white text-white' : 'border-slate-950 text-slate-950')
                  : (isDarkMode ? 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200')
              }`}
            >
              <Mail size={16} />
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
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-2xl shadow-sm transition-all ${
              isDarkMode 
                ? 'bg-[#0F1115] border-white/10' 
                : 'bg-white border-slate-200'
            }`}>
              {/* Category selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedCategory('TODOS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === 'TODOS'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                      : isDarkMode
                      ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  Ver Todos
                </button>
                {CATEGORIES.map((cat, index) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                        : isDarkMode
                        ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
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
                      : isDarkMode
                      ? 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400'
                      : 'border-rose-200 bg-rose-50 hover:bg-rose-100/85 text-rose-600'
                  }`}
                  title="Borra los días de duración y fechas de entrega de la categoría seleccionada"
                >
                  <Trash2 size={13} className={confirmClear ? (isDarkMode ? 'text-rose-300' : 'text-rose-700') : (isDarkMode ? 'text-rose-400' : 'text-rose-600')} />
                  {confirmClear 
                    ? `⚠️ Confirmar Borrar (${selectedCategory === 'TODOS' ? 'Todo' : selectedCategory.split(' ')[0]})` 
                    : 'Borrar Días y Fechas'
                  }
                </button>
                {confirmClear && (
                  <button
                    onClick={() => setConfirmClear(false)}
                    className={`px-2.5 py-1.5 border rounded-xl text-xs font-semibold transition ${
                      isDarkMode
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleRenumberPriorities}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    isDarkMode
                      ? 'border-white/10 bg-transparent hover:bg-white/5 text-slate-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                  title="Alinea las prioridades de forma secuencial consecutiva (1, 2, 3...)"
                >
                  <Sliders size={13} className={isDarkMode ? 'text-amber-500' : 'text-slate-800'} />
                  Corregir Secuencias
                </button>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsFormOpen(true);
                  }}
                  className={`px-4 py-2 font-extrabold uppercase tracking-wider rounded-xl text-[11px] flex items-center gap-1.5 transition shadow-md ${
                    isDarkMode
                      ? 'bg-white hover:bg-slate-200 text-black shadow-white/5'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'
                  }`}
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
            <div className={`border rounded-2xl overflow-hidden transition-all shadow-xl ${
              isDarkMode 
                ? 'bg-[#0F1115] border-white/10 shadow-black/40' 
                : 'bg-white border-slate-200/80 shadow-slate-100/80 shadow-md'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className={`border-b font-bold uppercase tracking-wider text-[10px] transition-colors ${
                    isDarkMode 
                      ? 'bg-[#16191D] border-white/10 text-slate-400' 
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                  }`}>
                    <tr>
                      <th className="px-4 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.includes(t.id))}
                          onChange={() => handleSelectAllFiltered(filteredTasks)}
                          className={`rounded focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer ${
                            isDarkMode 
                              ? 'border-white/10 bg-[#16191D] text-amber-500' 
                              : 'border-slate-300 bg-white text-amber-550'
                          }`}
                          title="Seleccionar todas las tareas visibles"
                        />
                      </th>
                      <th className="px-4 py-3 text-center w-12">Estado</th>
                      <th className="px-3 py-3 w-16 text-center">Prioridad</th>
                      <th className="px-4 py-3 min-w-56">Labor / Elemento Revit</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 min-w-36">Asignado</th>
                      <th className="px-4 py-3 text-center w-20">Paralelo</th>
                      <th className="px-4 py-3 text-center w-24">Días</th>
                      <th className="px-4 py-3 min-w-44">Fechas Programadas (Colombia)</th>
                      <th className="px-4 py-3 min-w-28">Límite</th>
                      <th className="px-4 py-3 text-right pr-6 w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors ${
                    isDarkMode 
                      ? 'divide-white/5 text-slate-300' 
                      : 'divide-slate-100 text-slate-700'
                  }`}>
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task, idx) => {
                        const modeler = modelers.find(m => m.id === task.assigneeId);
                        const isCompleted = task.status === 'Modelado';
                        
                        return (
                          <tr 
                            key={task.id} 
                            className={`transition-colors ${
                              isCompleted 
                                ? (isDarkMode ? 'bg-emerald-950/5 opacity-65 text-slate-400 hover:bg-emerald-950/10' : 'bg-emerald-50/20 opacity-70 text-slate-500 hover:bg-emerald-50/30') 
                                : task.isDelayed 
                                ? (isDarkMode ? 'bg-rose-950/10 text-rose-200 border-l-2 border-rose-500 hover:bg-rose-950/15' : 'bg-rose-50/40 text-rose-800 border-l-2 border-rose-500 hover:bg-rose-50/60') 
                                : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50/60')
                            }`}
                          >
                            {/* Selection Checkbox */}
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={selectedTaskIds.includes(task.id)}
                                onChange={() => handleToggleSelectTask(task.id)}
                                className={`rounded focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer ${
                                  isDarkMode
                                    ? 'border-white/10 bg-[#16191D] text-amber-500'
                                    : 'border-slate-300 bg-white text-amber-500'
                                }`}
                              />
                            </td>

                            {/* State Toggle Checkbox */}
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => handleToggleStatus(task.id)}
                                className={`p-1 transition ${
                                  isDarkMode ? 'text-slate-500 hover:text-amber-500' : 'text-slate-400 hover:text-amber-650'
                                }`}
                                title={isCompleted ? 'Marcar como Pendiente' : 'Marcar como Modelado'}
                              >
                                {isCompleted ? (
                                  <CheckSquare className="text-emerald-500" size={18} />
                                ) : task.status === 'N/A' ? (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    isDarkMode 
                                      ? 'text-slate-400 bg-white/5 border-white/10' 
                                      : 'text-slate-500 bg-slate-100 border-slate-200'
                                  }`}>N/A</span>
                                ) : (
                                  <Square size={18} />
                                )}
                              </button>
                            </td>
 
                             {/* Priority Ordering Controls */}
                             <td className="px-3 py-3.5">
                               <div className="flex items-center justify-center gap-1">
                                 <span className={`font-bold text-[11px] w-6 h-6 flex items-center justify-center rounded border ${
                                   isDarkMode
                                     ? 'text-white bg-[#16191D] border-white/10'
                                     : 'text-slate-900 bg-slate-50 border-slate-200 shadow-sm'
                                 }`}>
                                   {task.priority}
                                 </span>
                                 <div className="flex flex-col">
                                   <button
                                     onClick={() => handleMovePriorityUp(idx)}
                                     disabled={idx === 0}
                                     className={`p-0.5 rounded disabled:opacity-30 transition ${
                                       isDarkMode ? 'hover:bg-white/5 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-750'
                                     }`}
                                     title="Subir prioridad (ejecutar antes)"
                                   >
                                     <ArrowUp size={10} />
                                   </button>
                                   <button
                                     onClick={() => handleMovePriorityDown(idx)}
                                     disabled={idx === filteredTasks.length - 1}
                                     className={`p-0.5 rounded disabled:opacity-30 transition ${
                                       isDarkMode ? 'hover:bg-white/5 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-750'
                                     }`}
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
                                 <span className={`font-bold text-sm ${
                                   isCompleted 
                                     ? 'line-through text-slate-500' 
                                     : isDarkMode 
                                     ? 'text-white' 
                                     : 'text-slate-900'
                                 }`}>
                                   {task.name}
                                 </span>
                                 {task.description && (
                                   <p className={`text-[10px] font-medium mt-0.5 truncate max-w-xs ${
                                     isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                   }`} title={task.description}>
                                     {task.description}
                                   </p>
                                 )}
                                 {task.notes && (
                                   <span className={`inline-block text-[9px] font-mono px-1 py-0.2 rounded mt-1 max-w-xs truncate border ${
                                     isDarkMode 
                                       ? 'bg-white/5 text-slate-400 border-white/5' 
                                       : 'bg-slate-50 text-slate-600 border-slate-200'
                                   }`}>
                                     📝 {task.notes}
                                   </span>
                                 )}
                               </div>
                             </td>
 
                             {/* Category Badge */}
                             <td className="px-4 py-3.5">
                               <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border tracking-wider ${
                                 isDarkMode
                                   ? 'bg-white/5 border-white/5 text-slate-400'
                                   : 'bg-slate-150 border-slate-200 text-slate-650'
                               }`}>
                                 {task.category.split(' ')[0]}
                               </span>
                             </td>
 
                             {/* Modeler Assignee (INLINE EDITABLE!) */}
                             <td className="px-4 py-3.5">
                               <div className="flex items-center gap-1">
                                 {modeler && (
                                   <span 
                                     className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/20 shadow-sm" 
                                     style={{ backgroundColor: modeler.color }} 
                                   />
                                 )}
                                 <select
                                   value={task.assigneeId || ''}
                                   onChange={(e) => {
                                     const val = e.target.value || null;
                                     handleUpdateTaskField(task.id, 'assigneeId', val);
                                   }}
                                   className={`border rounded-lg py-1 px-1.5 focus:outline-none focus:border-amber-500 font-semibold text-[11px] cursor-pointer transition max-w-[120px] ${
                                     isDarkMode
                                       ? 'bg-[#16191D] border-white/10 text-slate-300 hover:text-white'
                                       : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                                   }`}
                                 >
                                   <option value="">Auto-asignar</option>
                                   {modelers.map(m => (
                                     <option key={m.id} value={m.id} className={isDarkMode ? 'bg-[#16191D] text-slate-200' : 'bg-white text-slate-800'}>
                                       {m.name.split(' ')[0]} {m.name.split(' ')[1] || ''}
                                     </option>
                                   ))}
                                 </select>
                               </div>
                             </td>
 
                             {/* Parallel Toggle Button */}
                             <td className="px-4 py-3.5 text-center">
                               <button
                                 onClick={() => handleUpdateTaskField(task.id, 'isParallel', !task.isParallel)}
                                 className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition flex items-center justify-center gap-1.5 mx-auto ${
                                   task.isParallel
                                     ? 'bg-amber-500 border-amber-500 text-black shadow-md shadow-amber-500/20'
                                     : isDarkMode
                                     ? 'bg-[#16191D]/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                                     : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 shadow-sm'
                                 }`}
                                 title={task.isParallel ? "Programación en paralelo activada (no consume días secuenciales)" : "Programación secuencial"}
                               >
                                 {task.isParallel ? "Sí" : "No"}
                               </button>
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
                                   className={`w-14 text-center border rounded-lg py-1 px-1 focus:outline-none focus:border-amber-500 font-extrabold text-xs transition ${
                                     isDarkMode
                                       ? 'bg-[#16191D] border-white/10 text-white'
                                       : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                                   }`}
                                 />
                                 <span className="text-[10px] text-slate-500 font-medium">d</span>
                               </div>
                             </td>

                             {/* Scheduled dates */}
                             <td className="px-4 py-3.5">
                               {task.scheduledStart && task.scheduledEnd ? (
                                 <div className="text-[11px]">
                                   <span className={`font-semibold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
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
                                   className={`border rounded-lg py-1 px-1.5 focus:outline-none focus:border-amber-500 font-semibold text-[11px] cursor-pointer transition w-full max-w-[125px] ${
                                     isDarkMode
                                       ? 'bg-[#16191D] border-white/10 text-slate-300 hover:text-white'
                                       : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                                   }`}
                                 />
                                 {task.isDelayed && (
                                   <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border shadow-[0_0_8px_rgba(239,68,68,0.1)] animate-pulse ${
                                     isDarkMode 
                                       ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                       : 'bg-rose-50 text-rose-700 border-rose-200'
                                   }`}>
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
                                  className={`p-1.5 rounded-lg transition ${
                                    isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-amber-500' : 'hover:bg-slate-100 text-slate-550 hover:text-amber-600'
                                  }`}
                                  title="Editar tarea"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className={`p-1.5 rounded-lg transition ${
                                    isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-rose-400' : 'hover:bg-slate-100 text-slate-550 hover:text-rose-600'
                                  }`}
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
                        <td colSpan={11} className={`text-center py-12 transition-colors ${
                          isDarkMode ? 'bg-[#0F1115] text-slate-500' : 'bg-slate-50 text-slate-400'
                        }`}>
                          <Info className="mx-auto mb-2 text-slate-500" size={24} />
                          No hay tareas en esta categoría. Agrega una nueva o cambia el filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend card info - styled as the Amber aviso card */}
            <div className={`p-4 border rounded-2xl text-xs flex gap-3 items-start transition-colors ${
              isDarkMode 
                ? 'bg-amber-500/5 border-amber-500/20 text-slate-400' 
                : 'bg-amber-50/50 border-amber-200/60 text-slate-650 shadow-sm'
            }`}>
              <Info className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className={`font-bold ${isDarkMode ? 'text-amber-200' : 'text-amber-800'}`}>¿Cómo funciona la prioridad y asignación secuencial?</p>
                <p className={`mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-650'}`}>
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
            <div className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 p-4 border rounded-2xl shadow-sm transition-all ${
              isDarkMode 
                ? 'bg-[#0F1115] border-white/10' 
                : 'bg-white border-slate-200'
            }`}>
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
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                      selectedDrawingSeries === ser.key
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                        : isDarkMode
                        ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
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
                      : isDarkMode
                      ? 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400'
                      : 'border-rose-200 bg-rose-50 hover:bg-rose-100/85 text-rose-600'
                  }`}
                  title="Borra las fechas de entrega de la serie seleccionada"
                >
                  <Trash2 size={13} className={confirmClearDrawings ? (isDarkMode ? 'text-rose-300' : 'text-rose-700') : (isDarkMode ? 'text-rose-400' : 'text-rose-600')} />
                  {confirmClearDrawings 
                    ? `⚠️ Confirmar Borrar (${selectedDrawingSeries === 'TODAS' ? 'Todo' : 'Serie'})` 
                    : 'Borrar Fechas'
                  }
                </button>
                {confirmClearDrawings && (
                  <button
                    onClick={() => setConfirmClearDrawings(false)}
                    className={`px-2.5 py-1.5 border rounded-xl text-xs font-semibold transition ${
                      isDarkMode
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Table Drawings Grid */}
            <div className={`border rounded-2xl overflow-hidden transition-all shadow-xl ${
              isDarkMode 
                ? 'bg-[#0F1115] border-white/10 shadow-black/40' 
                : 'bg-white border-slate-200/80 shadow-slate-100/80 shadow-md'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className={`border-b font-bold uppercase tracking-wider text-[10px] transition-colors ${
                    isDarkMode 
                      ? 'bg-[#16191D] border-white/10 text-slate-400' 
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                  }`}>
                    <tr>
                      <th className="px-4 py-3 text-center w-24">Código</th>
                      <th className="px-4 py-3 text-center w-24">Días</th>
                      <th className="px-4 py-3 min-w-48">Nombre del Plano</th>
                      <th className="px-4 py-3 w-64">Entregable BIM / Tarea</th>
                      <th className="px-4 py-3 w-36">Modelador</th>
                      <th className="px-4 py-3 text-center w-16">Realizado</th>
                      <th className="px-4 py-3 text-center w-16">Pendiente</th>
                      <th className="px-4 py-3 text-center w-16">N/A</th>
                      <th className="px-4 py-3 min-w-64">Observaciones Técnicas del Proyecto</th>
                      <th className="px-4 py-3 text-center w-40">Fecha entrega</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors ${
                    isDarkMode 
                      ? 'divide-white/5 text-slate-300' 
                      : 'divide-slate-100 text-slate-700'
                  }`}>
                    {(() => {
                      const filtered = selectedDrawingSeries === 'TODAS'
                        ? drawings
                        : drawings.filter(d => d.series === selectedDrawingSeries);

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className={`text-center py-12 transition-colors ${
                              isDarkMode ? 'bg-[#0F1115] text-slate-500' : 'bg-slate-50 text-slate-400'
                            }`}>
                              <Info className="mx-auto mb-2 text-slate-500" size={24} />
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
                            <tr className={isDarkMode ? 'bg-[#13161A]' : 'bg-slate-100/60'}>
                              <td colSpan={10} className={`px-4 py-2 text-left font-bold text-amber-500 text-[11px] uppercase tracking-wider border-y select-none ${
                                isDarkMode ? 'border-white/5' : 'border-slate-100'
                              }`}>
                                {seriesName}
                              </td>
                            </tr>
                            {seriesDrawings.map(d => {
                              const linkedTask = d.taskId ? tasks.find(t => t.id === d.taskId) : null;
                              const finalDeliveryDate = d.deliveryDate || (linkedTask ? linkedTask.scheduledEnd : null);
                              const finalDays = finalDeliveryDate ? getWorkingDaysCount(settings.startDate, finalDeliveryDate) : '';
                              const assignedModeler = linkedTask 
                                ? modelers.find(m => m.id === linkedTask.assigneeId) 
                                : (d.assigneeId ? modelers.find(m => m.id === d.assigneeId) : null);
                              const isDone = d.status === 'Realizado';

                              return (
                                <tr 
                                  key={d.id} 
                                  className={`transition-colors ${
                                    isDone
                                      ? (isDarkMode ? 'bg-emerald-950/5 opacity-65 text-slate-400 hover:bg-emerald-950/10' : 'bg-emerald-50/20 opacity-70 text-slate-500 hover:bg-emerald-50/30')
                                      : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50/60')
                                  }`}
                                >
                                  {/* Code */}
                                  <td className={`px-4 py-3 text-center font-mono font-bold text-[11px] ${
                                    isDone ? 'text-slate-500 line-through' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                    {d.code}
                                  </td>

                                  {/* Days */}
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex items-center gap-1.5 justify-center">
                                      {linkedTask && <Link2 size={12} className="text-amber-500 shrink-0" title="Sincronizado con entregable" />}
                                      <input
                                        type="number"
                                        min="1"
                                        value={finalDays}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '') {
                                            handleUpdateDrawingField(d.id, 'deliveryDate', null);
                                            if (d.taskId) {
                                              handleUpdateTaskField(d.taskId, 'durationDays', 0);
                                              handleUpdateTaskField(d.taskId, 'targetDeliveryDate', null);
                                            }
                                          } else {
                                            const daysNum = parseInt(val, 10);
                                            if (daysNum > 0) {
                                              const { end } = addWorkingDays(settings.startDate, daysNum);
                                              handleUpdateDrawingField(d.id, 'deliveryDate', end);
                                              if (d.taskId) {
                                                handleUpdateTaskField(d.taskId, 'durationDays', daysNum);
                                                handleUpdateTaskField(d.taskId, 'targetDeliveryDate', end);
                                              }
                                            }
                                          }
                                        }}
                                        className={`w-14 border rounded-lg py-1.5 text-center focus:outline-none focus:border-amber-500 text-xs transition font-semibold ${
                                          isDarkMode
                                            ? 'bg-[#16191D] border-white/10 text-slate-200'
                                            : 'bg-white border-slate-200 text-slate-850 shadow-sm'
                                        }`}
                                        placeholder="-"
                                      />
                                    </div>
                                  </td>

                                  {/* Name */}
                                  <td className={`px-4 py-3 font-semibold text-[13px] ${
                                    isDone
                                      ? 'line-through text-slate-450'
                                      : isDarkMode
                                      ? 'text-white'
                                      : 'text-slate-900'
                                  }`}>
                                    {d.name}
                                  </td>

                                  {/* Entregable BIM / Tarea */}
                                  <td className="px-4 py-3">
                                    <select
                                      value={d.taskId || ''}
                                      onChange={(e) => {
                                        const newTaskId = e.target.value || null;
                                        handleUpdateDrawingField(d.id, 'taskId', newTaskId);
                                        // Sync assignee directly on link if available
                                        if (newTaskId) {
                                          const matchedTask = tasks.find(t => t.id === newTaskId);
                                          if (matchedTask) {
                                            handleUpdateDrawingField(d.id, 'assigneeId', matchedTask.assigneeId);
                                          }
                                        }
                                      }}
                                      className={`w-full border rounded-lg py-1.5 px-2 focus:outline-none focus:border-amber-500 text-[11px] transition cursor-pointer font-medium ${
                                        isDarkMode
                                          ? 'bg-[#16191D] border-white/10 text-slate-200'
                                          : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                                      }`}
                                    >
                                      <option value="" className={isDarkMode ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>⚠️ Manual (Sin vinculación)</option>
                                      {tasks.map(t => {
                                        const m = modelers.find(mod => mod.id === t.assigneeId);
                                        return (
                                          <option key={t.id} value={t.id} className={isDarkMode ? 'bg-[#16191D] text-slate-200' : 'bg-white text-slate-800'}>
                                            {t.name} ({m ? m.name.replace(/^(Ing\.|Arq\.|Tec\.)\s*/, '') : 'Sin asignar'})
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </td>

                                  {/* Modelador */}
                                  <td className="px-4 py-3">
                                    {linkedTask ? (
                                      <div className={`flex items-center gap-1.5 justify-start text-[11px] font-medium ${
                                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                                      }`} title="Sincronizado con entregable">
                                        <span 
                                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-black/20" 
                                          style={{ backgroundColor: assignedModeler?.color || '#555' }}
                                        />
                                        <span className="truncate max-w-[100px]">
                                          {assignedModeler ? assignedModeler.name.replace(/^(Ing\.|Arq\.|Tec\.)\s*/, '') : 'Sin asignar'}
                                        </span>
                                        <Link2 size={10} className="text-amber-500 shrink-0" />
                                      </div>
                                    ) : (
                                      <select
                                        value={d.assigneeId || ''}
                                        onChange={(e) => handleUpdateDrawingField(d.id, 'assigneeId', e.target.value || null)}
                                        className={`w-full border rounded-lg py-1.5 px-2 focus:outline-none focus:border-amber-500 text-[11px] transition cursor-pointer font-medium max-w-[130px] ${
                                          isDarkMode
                                            ? 'bg-[#16191D] border-white/10 text-slate-200'
                                            : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                                        }`}
                                      >
                                        <option value="" className={isDarkMode ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>Sin asignar</option>
                                        {modelers.map(m => (
                                          <option key={m.id} value={m.id} className={isDarkMode ? 'bg-[#16191D] text-slate-200' : 'bg-white text-slate-850'}>
                                            {m.name.replace(/^(Ing\.|Arq\.|Tec\.)\s*/, '')}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </td>

                                  {/* Realizado */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'Realizado'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', 'Realizado')}
                                      className={`rounded focus:ring-emerald-500 w-4 h-4 cursor-pointer ${
                                        isDarkMode
                                          ? 'border-white/10 bg-[#16191D] text-emerald-500'
                                          : 'border-slate-300 bg-white text-emerald-500'
                                      }`}
                                    />
                                  </td>

                                  {/* Pendiente */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'Pendiente'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', 'Pendiente')}
                                      className={`rounded focus:ring-amber-500 w-4 h-4 cursor-pointer ${
                                        isDarkMode
                                          ? 'border-white/10 bg-[#16191D] text-amber-500'
                                          : 'border-slate-300 bg-white text-amber-500'
                                      }`}
                                    />
                                  </td>

                                  {/* N/A */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'N/A'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', 'N/A')}
                                      className={`rounded focus:ring-slate-500 w-4 h-4 cursor-pointer ${
                                        isDarkMode
                                          ? 'border-white/10 bg-[#16191D] text-slate-500'
                                          : 'border-slate-300 bg-white text-slate-400'
                                      }`}
                                    />
                                  </td>

                                  {/* Observations */}
                                  <td className="px-4 py-3">
                                    <input
                                      type="text"
                                      value={d.observations}
                                      onChange={(e) => handleUpdateDrawingField(d.id, 'observations', e.target.value)}
                                      placeholder="Modificar observaciones..."
                                      className={`w-full border rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-amber-500 text-xs transition ${
                                        isDarkMode
                                          ? 'bg-[#16191D] border-white/10 text-slate-200'
                                          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                                      }`}
                                    />
                                  </td>

                                  {/* Delivery Date / Calendar Selector */}
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex items-center gap-1.5 justify-center">
                                      {linkedTask && <Link2 size={12} className="text-amber-500 shrink-0" title="Sincronizado con entregable" />}
                                      <DrawingDatePicker
                                        currentDate={finalDeliveryDate}
                                        onChange={(dateVal) => {
                                          handleUpdateDrawingField(d.id, 'deliveryDate', dateVal);
                                          if (d.taskId) {
                                            handleUpdateTaskField(d.taskId, 'targetDeliveryDate', dateVal);
                                            if (dateVal) {
                                              const daysNum = getWorkingDaysCount(settings.startDate, dateVal);
                                              handleUpdateTaskField(d.taskId, 'durationDays', daysNum);
                                            } else {
                                              handleUpdateTaskField(d.taskId, 'durationDays', 0);
                                            }
                                          }
                                        }}
                                        modelerId={linkedTask ? linkedTask.assigneeId : (d.assigneeId || null)}
                                        modelers={modelers}
                                        tasks={tasks}
                                        drawings={drawings}
                                        drawingId={d.id}
                                        projectStartDate={settings.startDate}
                                        isDarkMode={isDarkMode}
                                      />
                                    </div>
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
          <CalendarView tasks={tasks} modelers={modelers} isDarkMode={isDarkMode} />
        )}

        {/* TAB CONTENT: MODELERS */}
        {activeTab === 'modelers' && (
          <ModelersSettings modelers={modelers} onUpdateModelers={setModelers} isDarkMode={isDarkMode} />
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
            isDarkMode={isDarkMode}
          />
        )}
      </main>

      {/* FOOTER WITH NORA LOGO AND THEME TOGGLE SUPPORT */}
      <footer className={`border-t py-12 transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0A0A0C] border-white/5' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
          <img
            src={isDarkMode ? "https://i.postimg.cc/rzpVzNDL/image.png" : "https://i.postimg.cc/tR3YSryT/LOGO-NORA-NEGRO.png"}
            alt="Nora Logo"
            referrerPolicy="no-referrer"
            className="h-16 object-contain opacity-90 hover:opacity-100 transition-opacity"
            onError={(e) => {
              const target = e.currentTarget;
              if (isDarkMode && target.src.includes('image.png')) {
                target.src = "https://i.postimg.cc/rzpVzNDL/LOGO-NORA-BLANCO.png";
              } else {
                // Fallback: invert light logo to make it white
                target.src = "https://i.postimg.cc/tR3YSryT/LOGO-NORA-NEGRO.png";
                target.style.filter = "invert(1) brightness(2)";
              }
            }}
          />
        </div>
      </footer>

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
