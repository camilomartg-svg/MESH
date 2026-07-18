import React, { useState, useEffect, Fragment } from 'react';
import { Task, Modeler, ProjectSettings, EmailLog, BimCategory, ProjectData, Drawing, DevLogEntry, DevLogType, MediaAttachment, DevNotesData, ProjectDefinition } from './types';
import { calculateUnifiedSchedule, formatDateKey, addWorkingDays, getWorkingDaysCount, parseDate } from './utils/colombiaCalendar';
import { DEFAULT_PROJECT_DATA, getInitialTaskIdForDrawing } from './utils/defaultData';
import { 
  uploadFileToDrive, 
  saveProjectDataToFirebase, 
  loadProjectDataFromFirebase 
} from './utils/firebase';
import TaskForm from './components/TaskForm';
import CalendarView from './components/CalendarView';
import TimelineView from './components/TimelineView';
import ModelersSettings from './components/ModelersSettings';
import EmailSync from './components/EmailSync';
import DrawingDatePicker from './components/DrawingDatePicker';
import DefinitionsTab from './components/DefinitionsTab';
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
  Moon,
  FileText,
  Image,
  Video,
  Paperclip,
  X,
  Search,
  ExternalLink,
  Upload,
  Save
} from 'lucide-react';

export function getGoogleDrivePreviewUrl(url: string): string | null {
  if (!url) return null;
  // Standard file/d/ FILE_ID /view
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${fileDMatch[1]}&sz=w800`;
  }
  // open?id= FILE_ID
  const openIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openIdMatch && openIdMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${openIdMatch[1]}&sz=w800`;
  }
  return null;
}

export function isImageFile(name: string): boolean {
  if (!name) return false;
  const ext = name.split('.').pop()?.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp', 'tiff'].includes(ext || '');
}

export function isVideoFile(name: string): boolean {
  if (!name) return false;
  const ext = name.split('.').pop()?.toLowerCase();
  return ['mp4', 'mov', 'avi', 'mkv', 'webm', 'ogg', '3gp'].includes(ext || '');
}

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

const DRAWING_SERIES_OPTIONS = [
  "SERIE 100: ARQUITECTURA GENERAL (AUT)",
  "SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)",
  "SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)",
  "SERIE 400: CIELORRASOS REFLEJADOS (CC)",
  "SERIE 500: DETALLES DE ÁREAS COMUNES (ZC)",
  "SERIE 600: DESPIECES DE APARTAMENTOS Y ZONAS HÚMEDAS (AP)",
  "SERIE 700: CARPINTERÍA, VENTANERÍA Y CERRAJERÍA (CAR)",
  "SERIE 800: DETALLES CONSTRUCTIVOS DE NUDOS CRÍTICOS (DTE)",
  "SERIE 900: INFRAESTRUCTURA DE SERVICIOS (UTI)",
  "SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)"
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'checklist' | 'planimetria' | 'calendar' | 'timeline' | 'modelers' | 'email' | 'definitions'>('checklist');
  const [selectedCategory, setSelectedCategory] = useState<string | 'TODOS'>('TODOS');
  const [selectedDrawingSeries, setSelectedDrawingSeries] = useState<string | 'TODAS'>('TODAS');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [drawingSearchQuery, setDrawingSearchQuery] = useState('');

  // Dynamic Categories and Drawing Series States
  const [bimCategories, setBimCategories] = useState<string[]>([]);
  const [drawingSeries, setDrawingSeries] = useState<string[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isSeriesManagerOpen, setIsSeriesManagerOpen] = useState(false);

  // Core Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modelers, setModelers] = useState<Modeler[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_PROJECT_DATA.settings);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [definitions, setDefinitions] = useState<ProjectDefinition[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearDrawings, setConfirmClearDrawings] = useState(false);

  // Drawings bulk selection and individual edit states
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null);

  const [localDates, setLocalDates] = useState<{ [id: string]: string }>({});
  const [dateTimers, setDateTimers] = useState<{ [id: string]: NodeJS.Timeout }>({});

  const handleDebouncedDateChange = (id: string, type: 'task' | 'drawing', newVal: string) => {
    setLocalDates(prev => ({ ...prev, [id]: newVal }));
    if (dateTimers[id]) clearTimeout(dateTimers[id]);
    
    const timer = setTimeout(() => {
       if (type === 'task') handleUpdateTaskField(id, 'manualStart', newVal || null);
       else handleUpdateDrawingField(id, 'manualStart', newVal || null);
       
       setLocalDates(prev => { const n = { ...prev }; delete n[id]; return n; });
       setDateTimers(prev => { const n = { ...prev }; delete n[id]; return n; });
    }, 1500);
    setDateTimers(prev => ({ ...prev, [id]: timer }));
  };

  const handleDateBlur = (id: string, type: 'task' | 'drawing', newVal: string) => {
    if (dateTimers[id]) {
      clearTimeout(dateTimers[id]);
      if (type === 'task') handleUpdateTaskField(id, 'manualStart', newVal || null);
      else handleUpdateDrawingField(id, 'manualStart', newVal || null);
      
      setLocalDates(prev => { const n = { ...prev }; delete n[id]; return n; });
      setDateTimers(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  // Drawing Form States
  const [isDrawingFormOpen, setIsDrawingFormOpen] = useState(false);
  const [newDrawingName, setNewDrawingName] = useState('');
  const [newDrawingSeries, setNewDrawingSeries] = useState('SERIE 100: ARQUITECTURA GENERAL (AUT)');
  const [newDrawingObservations, setNewDrawingObservations] = useState('');
  const [newDrawingDays, setNewDrawingDays] = useState(3);
  const [newDrawingModelerId, setNewDrawingModelerId] = useState('');

  // Development Notes States (Incidencias y Notas de Avance)
  const [isDevNotesOpen, setIsDevNotesOpen] = useState(false);
  const [activeDevNotesId, setActiveDevNotesId] = useState<string | null>(null);
  const [activeDevNotesType, setActiveDevNotesType] = useState<'task' | 'drawing' | null>(null);
  const [devEntries, setDevEntries] = useState<DevLogEntry[]>([]);
  
  // States for adding a new entry in the modal
  const [newEntryType, setNewEntryType] = useState<DevLogType>('nota');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryDescription, setNewEntryDescription] = useState('');
  const [newEntryAttachments, setNewEntryAttachments] = useState<MediaAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Lightbox view state for attachments
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
        // Try to load from Firebase Firestore first
        const fbData = await loadProjectDataFromFirebase();
        if (fbData && fbData.tasks) {
          console.log('Loaded project data from Firebase Firestore');
          setTasks(fbData.tasks);
          setModelers(fbData.modelers || DEFAULT_PROJECT_DATA.modelers);
          setSettings(fbData.settings || DEFAULT_PROJECT_DATA.settings);
          setEmailLogs(fbData.emailLogs || []);
          setDrawings(initializeDrawings(fbData.drawings || DEFAULT_PROJECT_DATA.drawings || []));
          setBimCategories(fbData.bimCategories || CATEGORIES);
          setDrawingSeries(fbData.drawingSeries || DRAWING_SERIES_OPTIONS);
          setDefinitions(fbData.definitions || []);
          setLoading(false);
          return;
        }
      } catch (fbErr) {
        console.warn('Could not load from Firebase Firestore, trying server api:', fbErr);
      }

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
            setBimCategories(data.bimCategories || CATEGORIES);
            setDrawingSeries(data.drawingSeries || DRAWING_SERIES_OPTIONS);
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
          setBimCategories(parsed.bimCategories || CATEGORIES);
          setDrawingSeries(parsed.drawingSeries || DRAWING_SERIES_OPTIONS);
          setDefinitions(parsed.definitions || []);
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
      setBimCategories(CATEGORIES);
      setDrawingSeries(DRAWING_SERIES_OPTIONS);
      setDefinitions([]);
      setLoading(false);
    }

    loadData();
  }, []);

  // Sync / Recalculate schedule whenever tasks, modelers, settings, or drawings change
  const handleManualSave = async () => {
    if (saving) return;
    setSaving(true);
    const currentData: ProjectData = {
      tasks,
      modelers,
      settings,
      emailLogs,
      drawings,
      bimCategories,
      drawingSeries,
      definitions,
    };
    try {
      await Promise.allSettled([
        saveProjectDataToFirebase(currentData),
        fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentData),
        })
      ]);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to sync changes:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    // Auto-generate M001... and P001... codes based on alphabetical order of names
    const sortedT = [...tasks].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    let tasksChanged = false;
    const newTasks = tasks.map(t => {
      const idx = sortedT.findIndex(x => x.id === t.id);
      const expectedCode = `M${String(idx + 1).padStart(3, '0')}`;
      if (t.code !== expectedCode) {
        tasksChanged = true;
        return { ...t, code: expectedCode };
      }
      return t;
    });

    const sortedD = drawings ? [...drawings].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })) : [];
    let drawingsChanged = false;
    const newDrawings = drawings ? drawings.map(d => {
      const idx = sortedD.findIndex(x => x.id === d.id);
      const expectedCode = `P${String(idx + 1).padStart(3, '0')}`;
      if (d.code !== expectedCode) {
        drawingsChanged = true;
        return { ...d, code: expectedCode };
      }
      return d;
    }) : [];

    if (tasksChanged || drawingsChanged) {
      if (tasksChanged) setTasks(newTasks);
      if (drawingsChanged && drawings) setDrawings(newDrawings);
      return;
    }

    // Run scheduling calculation
    const { scheduledTasks: scheduled, scheduledDrawings } = calculateUnifiedSchedule(tasks, drawings || [], modelers, settings.startDate);
    
    // Check if scheduled is different from current to prevent infinite updates
    const hasChanged = JSON.stringify(scheduled) !== JSON.stringify(tasks);
    const drawingsScheduleChanged = JSON.stringify(scheduledDrawings) !== JSON.stringify(drawings);

    if (hasChanged || drawingsScheduleChanged) {
      if (hasChanged) setTasks(scheduled);
      if (drawingsScheduleChanged && drawings) setDrawings(scheduledDrawings);
      return;
    }

    // Save to local storage instantly
    const currentData: ProjectData = {
      tasks,
      modelers,
      settings,
      emailLogs,
      drawings,
      bimCategories,
      drawingSeries,
      definitions,
    };
    localStorage.setItem('revit_planner_project', JSON.stringify(currentData));
    
    // Mark as unsaved
    setHasUnsavedChanges(true);

    // Auto-save debounced (30 minutes = 1,800,000 ms)
    const timer = setTimeout(() => {
      handleManualSave();
    }, 1800000);

    return () => clearTimeout(timer);
  }, [tasks, modelers, settings, emailLogs, drawings, bimCategories, drawingSeries, loading]);

  // Periodically fetch project data from server for real-time collaboration
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(async () => {
      if (saving || hasUnsavedChanges) return; // Do not fetch while saving or if we have unsaved local changes
      
      try {
        const data = await loadProjectDataFromFirebase();
        if (data && data.tasks) {
            // Only update state if it is structurally different from what we have
            // This prevents resetting active user interactions if data hasn't changed.
            setTasks(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(data.tasks)) {
                return data.tasks;
              }
              return prev;
            });
            setModelers(prev => {
              const incoming = data.modelers || DEFAULT_PROJECT_DATA.modelers;
              if (JSON.stringify(prev) !== JSON.stringify(incoming)) {
                return incoming;
              }
              return prev;
            });
            setSettings(prev => {
              const incoming = data.settings || DEFAULT_PROJECT_DATA.settings;
              if (JSON.stringify(prev) !== JSON.stringify(incoming)) {
                return incoming;
              }
              return prev;
            });
            setEmailLogs(prev => {
              const incoming = data.emailLogs || [];
              if (JSON.stringify(prev) !== JSON.stringify(incoming)) {
                return incoming;
              }
              return prev;
            });
            setDrawings(prev => {
              const incoming = data.drawings || [];
              if (JSON.stringify(prev) !== JSON.stringify(incoming)) {
                return incoming;
              }
              return prev;
            });
            setBimCategories(prev => {
              const incoming = data.bimCategories || CATEGORIES;
              if (JSON.stringify(prev) !== JSON.stringify(incoming)) {
                return incoming;
              }
              return prev;
            });
            setDrawingSeries(prev => {
              const incoming = data.drawingSeries || DRAWING_SERIES_OPTIONS;
              if (JSON.stringify(prev) !== JSON.stringify(incoming)) {
                return incoming;
              }
              return prev;
            });
          }
      } catch (err) {
        console.warn('Sync error:', err);
      }
    }, 6000); // Check every 6 seconds

    return () => clearInterval(interval);
  }, [loading, saving, hasUnsavedChanges]);

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

  const checkScheduleCollision = (assigneeId: string, newStart: string, durationDays: number, ignoreId: string): string | null => {
    const { end: newEnd } = addWorkingDays(newStart, durationDays);
    const checkOverlap = (start1: string, end1: string, start2: string, end2: string) => {
      return start1 <= end2 && end1 >= start2;
    };
    
    // Check tasks
    const collidingTask = tasks.find(t => 
      t.id !== ignoreId && 
      (t.assigneeId === assigneeId || (!t.assigneeId && !assigneeId)) && 
      t.scheduledStart && t.scheduledEnd && 
      checkOverlap(newStart, newEnd, t.scheduledStart, t.scheduledEnd)
    );
    if (collidingTask) return `[${collidingTask.code}] ${collidingTask.name}`;
    
    // Check drawings
    const collidingDrawing = (drawings || []).find(d => 
      d.id !== ignoreId && 
      (d.assigneeId === assigneeId || (!d.assigneeId && !assigneeId)) && 
      d.scheduledStart && d.scheduledEnd && 
      checkOverlap(newStart, newEnd, d.scheduledStart, d.scheduledEnd)
    );
    if (collidingDrawing) return `[${collidingDrawing.code}] ${collidingDrawing.name}`;

    return null;
  };

  const getTaskBlockIds = (startId: string, currentTasks: Task[]) => {
    const parentOf: Record<string, string> = {};
    const childrenOf: Record<string, string[]> = {};
    currentTasks.forEach(t => {
      if (t.isParallel && t.parallelWithTaskId) {
        parentOf[t.id] = t.parallelWithTaskId;
        if (!childrenOf[t.parallelWithTaskId]) childrenOf[t.parallelWithTaskId] = [];
        childrenOf[t.parallelWithTaskId].push(t.id);
      }
    });
    let rootId = startId;
    while (parentOf[rootId]) rootId = parentOf[rootId];
    const block = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      block.add(curr);
      if (childrenOf[curr]) queue.push(...childrenOf[curr]);
    }
    return Array.from(block);
  };

  const getDrawingBlockIds = (startId: string, currentDrawings: Drawing[]) => {
    const parentOf: Record<string, string> = {};
    const childrenOf: Record<string, string[]> = {};
    currentDrawings.forEach(d => {
      if (d.isParallel && d.parallelWithDrawingId) {
        parentOf[d.id] = d.parallelWithDrawingId;
        if (!childrenOf[d.parallelWithDrawingId]) childrenOf[d.parallelWithDrawingId] = [];
        childrenOf[d.parallelWithDrawingId].push(d.id);
      }
    });
    let rootId = startId;
    while (parentOf[rootId]) rootId = parentOf[rootId];
    const block = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      block.add(curr);
      if (childrenOf[curr]) queue.push(...childrenOf[curr]);
    }
    return Array.from(block);
  };

  const handleUpdateTaskField = (id: string, field: keyof Task, value: any) => {
    if (field === 'manualStart' && value) {
      const task = tasks.find(t => t.id === id);
      if (task) {
        const collidingName = checkScheduleCollision(task.assigneeId || '', value, Number(task.durationDays) || 0, id);
        if (collidingName) {
          const confirm = window.confirm(`La fecha seleccionada se cruza con "${collidingName}". ¿Deseas reasignarla de todos modos? Esto empujará y reajustará el cronograma restante.`);
          if (!confirm) return;
        }
      }
    }
    setTasks(prev => {
      let targetIds = [id];
      if (field === 'manualStart') {
        targetIds = getTaskBlockIds(id, prev);
      }
      return prev.map(t => {
        if (targetIds.includes(t.id)) {
          const newTask = { ...t, [field]: value };
          const isActivatingField = ['durationDays', 'assigneeId', 'isParallel', 'manualStart'].includes(field as string);
          if (isActivatingField) {
            const wasActive = Number(t.durationDays) > 0;
            const isNowActive = Number(newTask.durationDays) > 0;
            
            if (isNowActive && (!wasActive || !t.activationTimestamp)) {
              newTask.activationTimestamp = Date.now();
            } else if (!isNowActive && !newTask.manualStart) {
              newTask.activationTimestamp = undefined;
            }
            if (field === 'manualStart') newTask.activationTimestamp = Date.now();
          }
          return newTask;
        }
        return t;
      });
    });
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
    const ts = Date.now();
    const updated = tasks.map((t, idx) => {
      if (selectedTaskIds.includes(t.id)) {
        const newTask = { ...t, durationDays: days };
        if (days > 0 && (!(Number(t.durationDays) > 0) || !t.activationTimestamp)) {
           newTask.activationTimestamp = ts + idx; // unique but sequential
        } else if (days === 0 && !newTask.manualStart) {
           newTask.activationTimestamp = undefined;
        }
        return newTask;
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
    if (field === 'manualStart' && value) {
      const drawing = drawings.find(d => d.id === id);
      if (drawing) {
        const collidingName = checkScheduleCollision(drawing.assigneeId || '', value, Number(drawing.durationDays !== undefined ? drawing.durationDays : 3) || 0, id);
        if (collidingName) {
          const confirm = window.confirm(`La fecha seleccionada se cruza con "${collidingName}". ¿Deseas reasignarla de todos modos? Esto empujará y reajustará el cronograma restante.`);
          if (!confirm) return;
        }
      }
    }
    setDrawings(prev => {
      let targetIds = [id];
      if (field === 'manualStart') {
        targetIds = getDrawingBlockIds(id, prev);
      }
      return prev.map(d => {
        if (targetIds.includes(d.id)) {
          const newD = { ...d, [field]: value };
          const isActivatingField = ['durationDays', 'assigneeId', 'isParallel', 'manualStart'].includes(field as string);
          if (isActivatingField) {
            const wasActive = d.durationDays !== undefined && Number(d.durationDays) > 0;
            const isNowActive = newD.durationDays !== undefined && Number(newD.durationDays) > 0;
            
            if (isNowActive && (!wasActive || !d.activationTimestamp)) {
              newD.activationTimestamp = Date.now();
            } else if (!isNowActive && !newD.manualStart) {
              newD.activationTimestamp = undefined;
            }
            if (field === 'manualStart') newD.activationTimestamp = Date.now();
          }
          return newD;
        }
        return d;
      });
    });
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
          durationDays: 0,
          manualStart: null,
          scheduledStart: null,
          scheduledEnd: null,
          deliveryDate: null,
        };
      }
      return d;
    });
    setDrawings(updated);
    setSelectedDrawingIds([]); // Clear selection too
    setConfirmClearDrawings(false);
  };

  const handleDeleteDrawing = (id: string) => {
    setDrawings(drawings.filter(d => d.id !== id));
    setSelectedDrawingIds(prev => prev.filter(item => item !== id));
  };

  // Development Notes Handlers (Registros de Avance e Incidencias)
  const handleOpenDevNotes = (id: string, type: 'task' | 'drawing') => {
    setActiveDevNotesId(id);
    setActiveDevNotesType(type);
    
    let existingDevNotes;
    if (type === 'task') {
      const task = tasks.find(t => t.id === id);
      existingDevNotes = task?.devNotes;
    } else {
      const drawing = drawings.find(d => d.id === id);
      existingDevNotes = drawing?.devNotes;
    }
    
    setDevEntries(existingDevNotes?.entries || []);
    // Reset form states
    setNewEntryType('nota');
    setNewEntryDescription('');
    setNewEntryAttachments([]);
    setIsDevNotesOpen(true);
  };

  const handleSaveDevNotes = (updatedEntries: DevLogEntry[]) => {
    if (!activeDevNotesId || !activeDevNotesType) return;
    
    const notesData: DevNotesData = {
      entries: updatedEntries
    };
    
    if (activeDevNotesType === 'task') {
      const updated = tasks.map(t => {
        if (t.id === activeDevNotesId) {
          return { ...t, devNotes: notesData };
        }
        return t;
      });
      setTasks(updated);
    } else {
      const updated = drawings.map(d => {
        if (d.id === activeDevNotesId) {
          return { ...d, devNotes: notesData };
        }
        return d;
      });
      setDrawings(updated);
    }
    setDevEntries(updatedEntries);
  };

  const handleAddDevEntry = () => {
    if (!newEntryDescription.trim()) return;
    
    const newEntry: DevLogEntry = {
      id: 'entry_' + Math.random().toString(36).substr(2, 9),
      type: newEntryType,
      title: newEntryTitle.trim(),
      description: newEntryDescription.trim(),
      resolved: newEntryType === 'incidencia' ? false : undefined,
      createdAt: new Date().toISOString(),
      attachments: newEntryAttachments
    };
    
    const updated = [...devEntries, newEntry];
    handleSaveDevNotes(updated);
    
    // Reset form states for another addition
    setNewEntryDescription('');
    setNewEntryAttachments([]);
  };

  const handleToggleEntryResolved = (entryId: string) => {
    const updated = devEntries.map(entry => {
      if (entry.id === entryId && entry.type === 'incidencia') {
        return { ...entry, resolved: !entry.resolved };
      }
      return entry;
    });
    handleSaveDevNotes(updated);
  };

  const handleDeleteDevEntry = (entryId: string) => {
    const updated = devEntries.filter(entry => entry.id !== entryId);
    handleSaveDevNotes(updated);
  };

  const handleAddAttachmentToNewEntry = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const att = await uploadFileToDrive(file);
      setNewEntryAttachments(prev => [...prev, att]);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || String(err));
      alert("Error al subir archivo: " + (err.message || String(err)));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachmentFromNewEntry = (attId: string) => {
    setNewEntryAttachments(prev => prev.filter(att => att.id !== attId));
  };

  const handleAddAttachmentToExistingEntry = async (entryId: string, file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);
    try {
      const att = await uploadFileToDrive(file);
      
      const updated = devEntries.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            attachments: [...(entry.attachments || []), att]
          };
        }
        return entry;
      });
      handleSaveDevNotes(updated);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || String(err));
      alert("Error al subir archivo: " + (err.message || String(err)));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachmentFromExistingEntry = (entryId: string, attId: string) => {
    const updated = devEntries.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          attachments: entry.attachments.filter(att => att.id !== attId)
        };
      }
      return entry;
    });
    handleSaveDevNotes(updated);
  };

  const handleAddGoogleDriveLinkToNewEntry = (url: string) => {
    if (!url || !url.trim()) return;
    const cleanUrl = url.trim();
    const newAttachment: MediaAttachment = {
      id: 'att_gdrive_' + Math.random().toString(36).substr(2, 9),
      name: 'Google Drive',
      type: 'gdrive',
      url: cleanUrl
    };
    setNewEntryAttachments(prev => [...prev, newAttachment]);
  };

  const handleAddGoogleDriveLinkToExistingEntry = (entryId: string, url: string) => {
    if (!url || !url.trim()) return;
    const cleanUrl = url.trim();
    const newAttachment: MediaAttachment = {
      id: 'att_gdrive_' + Math.random().toString(36).substr(2, 9),
      name: 'Google Drive',
      type: 'gdrive',
      url: cleanUrl
    };
    
    const updated = devEntries.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          attachments: [...(entry.attachments || []), newAttachment]
        };
      }
      return entry;
    });
    handleSaveDevNotes(updated);
  };

  // Helper functions for drawings bulk selection
  const handleToggleSelectDrawing = (id: string) => {
    setSelectedDrawingIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFilteredDrawings = (filteredList: Drawing[]) => {
    const allFilteredIds = filteredList.map(d => d.id);
    const allAlreadySelected = allFilteredIds.every(id => selectedDrawingIds.includes(id));
    
    if (allAlreadySelected) {
      setSelectedDrawingIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedDrawingIds(prev => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleBulkAssignDrawings = (assigneeId: string | null) => {
    const updated = drawings.map(d => {
      if (selectedDrawingIds.includes(d.id)) {
        return { ...d, assigneeId };
      }
      return d;
    });
    setDrawings(updated);
  };

  const handleBulkDurationDrawings = (days: number) => {
    const ts = Date.now();
    const updated = drawings.map((d, idx) => {
      if (selectedDrawingIds.includes(d.id)) {
        const newD = { ...d, durationDays: days };
        if (days > 0 && (!(d.durationDays !== undefined && Number(d.durationDays) > 0) || !d.activationTimestamp)) {
           newD.activationTimestamp = ts + idx;
        } else if (days === 0 && !newD.manualStart) {
           newD.activationTimestamp = undefined;
        }
        return newD;
      }
      return d;
    });
    setDrawings(updated);
  };

  const handleBulkStatusDrawings = (status: 'Realizado' | 'En desarrollo' | 'Pendiente' | 'N/A') => {
    const updated = drawings.map(d => {
      if (selectedDrawingIds.includes(d.id)) {
        return { ...d, status };
      }
      return d;
    });
    setDrawings(updated);
  };

  const handleBulkStartDateDrawings = (startDate: string | null) => {
    const updated = drawings.map(d => {
      if (selectedDrawingIds.includes(d.id)) {
        return { ...d, manualStart: startDate };
      }
      return d;
    });
    setDrawings(updated);
  };

  // Helper functions for individual drawing edit modal
  const handleStartEditDrawing = (d: Drawing) => {
    setEditingDrawing(d);
    setNewDrawingName(d.name);
    setNewDrawingSeries(d.series);
    setNewDrawingObservations(d.observations || '');
    setNewDrawingDays(d.durationDays !== undefined ? d.durationDays : 3);
    setNewDrawingModelerId(d.assigneeId || '');
    setIsDrawingFormOpen(true);
  };

  const handleStartCreateDrawing = () => {
    setEditingDrawing(null);
    setNewDrawingName('');
    setNewDrawingSeries(selectedDrawingSeries !== 'TODAS' ? selectedDrawingSeries : (drawingSeries[0] || 'SERIE 100: ARQUITECTURA GENERAL (AUT)'));
    setNewDrawingObservations('');
    setNewDrawingDays(3);
    setNewDrawingModelerId('');
    setIsDrawingFormOpen(true);
  };

  const handleSaveDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrawingName.trim()) return;

    if (editingDrawing) {
      // Edit mode
      const updated = drawings.map(d => {
        if (d.id === editingDrawing.id) {
          return {
            ...d,
            name: newDrawingName.trim(),
            series: newDrawingSeries,
            durationDays: newDrawingDays,
            assigneeId: newDrawingModelerId || null,
            observations: newDrawingObservations.trim(),
          };
        }
        return d;
      });
      setDrawings(updated);
    } else {
      // Create mode
      const id = `draw-${Date.now()}`;
      const { end } = addWorkingDays(settings.startDate, newDrawingDays);

      const newDrawing: Drawing = {
        id,
        code: 'TEMP', // Will be overwritten by automatic sequential P001... generation
        name: newDrawingName.trim(),
        scale: '1:50',
        status: 'Pendiente',
        observations: newDrawingObservations.trim(),
        deliveryDate: end,
        series: newDrawingSeries,
        assigneeId: newDrawingModelerId || null,
        durationDays: newDrawingDays,
        manualStart: null,
        isParallel: false,
      };

      setDrawings([...drawings, newDrawing]);
    }

    setIsDrawingFormOpen(false);
    setEditingDrawing(null);
    setNewDrawingName('');
    setNewDrawingObservations('');
    setNewDrawingDays(3);
    setNewDrawingModelerId('');
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

  // Sort tasks alphabetically by name as requested by user
  const sortedTasksForChecklist = [...tasks].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  const unfilteredFilteredTasks = selectedCategory === 'TODOS' 
    ? sortedTasksForChecklist 
    : sortedTasksForChecklist.filter(t => t.category === selectedCategory);

  const filteredTasks = taskSearchQuery.trim() === ''
    ? unfilteredFilteredTasks
    : unfilteredFilteredTasks.filter(t => {
        const q = taskSearchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.code && t.code.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
        );
      });

  // Statistics calculation
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'Modelado' || t.status === 'Realizado').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'Pendiente' || t.status === 'En desarrollo').length;
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
            Iniciando Planificador UNUM...
          </p>
        </div>
      </div>
    );
  }

  const handleReorderActivities = (modelerId: string, orderedItems: { id: string, type: 'task' | 'drawing' }[]) => {
    const baseTs = Date.now();
    
    const updatedTasks = tasks.map(t => {
      const orderIndex = orderedItems.findIndex(item => item.id === t.id && item.type === 'task');
      if (orderIndex !== -1) {
         return { ...t, activationTimestamp: baseTs + orderIndex, assigneeId: modelerId === 'unassigned' ? null : modelerId };
      }
      return t;
    });

    const updatedDrawings = drawings.map(d => {
      const orderIndex = orderedItems.findIndex(item => item.id === d.id && item.type === 'drawing');
      if (orderIndex !== -1) {
         return { ...d, activationTimestamp: baseTs + orderIndex, assigneeId: modelerId === 'unassigned' ? null : modelerId };
      }
      return d;
    });

    setTasks(updatedTasks);
    setDrawings(updatedDrawings);
  };

  const handleUpdateActivity = (id: string, type: 'task' | 'drawing', field: string, value: any) => {
    if (type === 'task') {
      handleUpdateTaskField(id, field as keyof Task, value);
    } else {
      handleUpdateDrawingField(id, field as keyof Drawing, value);
    }
  };

  const handleUpdateBlockDates = (
    blockActivities: { id: string; type: 'task' | 'drawing' }[],
    newDate: string,
    draggedId: string,
    newModelerId: string
  ) => {
    // 1. Check collisions only for the dragged item to avoid popup spam
    const draggedItemTask = tasks.find(t => t.id === draggedId);
    const draggedItemDrawing = drawings.find(d => d.id === draggedId);
    const duration = draggedItemTask ? Number(draggedItemTask.durationDays) : (draggedItemDrawing && draggedItemDrawing.durationDays !== undefined ? Number(draggedItemDrawing.durationDays) : 3);
    
    if (draggedItemTask || draggedItemDrawing) {
      const collidingName = checkScheduleCollision(
        newModelerId === 'unassigned' ? null : newModelerId, 
        newDate, 
        duration || 0, 
        draggedId
      );
      if (collidingName) {
         const confirm = window.confirm(`La fecha seleccionada se cruza con "${collidingName}". ¿Deseas reasignarla de todos modos?`);
         if (!confirm) return;
      }
    }

    setTasks(prev => prev.map(t => {
      const inBlock = blockActivities.find(b => b.id === t.id && b.type === 'task');
      if (inBlock) {
        return {
          ...t,
          manualStart: newDate,
          activationTimestamp: Date.now(),
          assigneeId: t.id === draggedId ? (newModelerId === 'unassigned' ? null : newModelerId) : t.assigneeId
        };
      }
      return t;
    }));

    setDrawings(prev => prev.map(d => {
      const inBlock = blockActivities.find(b => b.id === d.id && b.type === 'drawing');
      if (inBlock) {
        return {
          ...d,
          manualStart: newDate,
          activationTimestamp: Date.now(),
          assigneeId: d.id === draggedId ? (newModelerId === 'unassigned' ? null : newModelerId) : d.assigneeId
        };
      }
      return d;
    }));
  };

  // --- PROJECT TIMELINE CALCULATIONS ---
  const activeTasksForSummary = tasks.filter(t => Number(t.durationDays) > 0 || t.manualStart || t.isParallel);
  const activeDrawingsForSummary = drawings.filter(d => (d.durationDays !== undefined && Number(d.durationDays) > 0) || d.manualStart || d.isParallel);

  const allStarts = [...activeTasksForSummary, ...activeDrawingsForSummary].map(x => x.scheduledStart).filter(Boolean) as string[];
  const modelEnds = activeTasksForSummary.map(t => t.scheduledEnd).filter(Boolean) as string[];
  const drawEnds = activeDrawingsForSummary.map(d => d.scheduledEnd).filter(Boolean) as string[];

  const minStart = allStarts.length > 0 ? allStarts.reduce((min, curr) => curr < min ? curr : min, allStarts[0]) : null;
  const maxModelEnd = modelEnds.length > 0 ? modelEnds.reduce((max, curr) => curr > max ? curr : max, modelEnds[0]) : null;
  const maxDrawEnd = drawEnds.length > 0 ? drawEnds.reduce((max, curr) => curr > max ? curr : max, drawEnds[0]) : null;
  
  let maxGlobalEnd = null;
  if (maxModelEnd && maxDrawEnd) maxGlobalEnd = maxModelEnd > maxDrawEnd ? maxModelEnd : maxDrawEnd;
  else if (maxModelEnd) maxGlobalEnd = maxModelEnd;
  else if (maxDrawEnd) maxGlobalEnd = maxDrawEnd;

  let totalCalendarDays = 0;
  let totalWorkingDays = 0;

  if (minStart && maxGlobalEnd) {
    totalWorkingDays = getWorkingDaysCount(minStart, maxGlobalEnd);
    const startD = parseDate(minStart);
    const endD = parseDate(maxGlobalEnd);
    const diffTime = Math.abs(endD.getTime() - startD.getTime());
    totalCalendarDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }


  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden font-sans antialiased transition-colors duration-200 ${
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
                  PLANIFICADOR <span className={isDarkMode ? 'text-white border-b border-white' : 'text-slate-950 border-b border-slate-950'}>UNUM</span>
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

              <button 
                onClick={handleManualSave}
                disabled={saving || !hasUnsavedChanges}
                className={`text-[10px] px-3 py-2.5 rounded-xl flex items-center gap-1.5 border font-semibold transition ${
                  saving
                    ? (isDarkMode ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200')
                    : hasUnsavedChanges 
                      ? (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100')
                      : (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                }`}
              >
                {saving ? (
                  <><RefreshCw size={11} className="animate-spin" /> Guardando...</>
                ) : hasUnsavedChanges ? (
                  <><Save size={11} /> Guardar</>
                ) : (
                  <><CheckCircle2 size={11} /> Guardado</>
                )}
              </button>
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

          {/* PROJECT SUMMARY BANNER */}
          <div className={`mt-6 rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm transition-all ${
            isDarkMode ? 'bg-[#0F1115] border-white/5' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-6 md:gap-12 w-full">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Inicio Global</span>
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{minStart ? minStart.split('-').reverse().join('/') : '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fin Modelado</span>
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{maxModelEnd ? maxModelEnd.split('-').reverse().join('/') : '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fin Planimetría</span>
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{maxDrawEnd ? maxDrawEnd.split('-').reverse().join('/') : '-'}</span>
              </div>
              <div className="flex flex-col border-l pl-6 md:pl-12 border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Días Laborales</span>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{totalWorkingDays} <span className="text-xs font-medium text-slate-500">días</span></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Días Naturales</span>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{totalCalendarDays} <span className="text-xs font-medium text-slate-500">días</span></span>
              </div>
            </div>
          </div>

      </section>

      {/* CORE NAVIGATION AND LAYOUT */}
      <main className="w-full max-w-full overflow-hidden px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
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
              Modelado
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
              onClick={() => setActiveTab('timeline')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? (isDarkMode ? 'border-white text-white' : 'border-slate-950 text-slate-950')
                  : (isDarkMode ? 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200')
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
              Línea de Tiempo
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
            <button
              onClick={() => setActiveTab('definitions')}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === 'definitions'
                  ? (isDarkMode ? 'border-white text-white' : 'border-slate-950 text-slate-950')
                  : (isDarkMode ? 'border-transparent text-slate-500 hover:text-slate-300 hover:border-white/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200')
              }`}
            >
              <FileText size={16} />
              Notas y Definiciones
            </button>
          </nav>
        </div>

        {/* TAB CONTENT: CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border rounded-2xl shadow-sm transition-all ${
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
                {bimCategories.map((cat, index) => (
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
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                  </span>
                  <input
                    type="text"
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    placeholder="Buscar elemento o plano..."
                    className={`w-full pl-9 pr-8 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors ${
                      isDarkMode
                        ? 'bg-[#16191D] border-white/10 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-sm'
                    }`}
                  />
                  {taskSearchQuery && (
                    <button
                      onClick={() => setTaskSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-200"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
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
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    isDarkMode
                      ? 'border-white/10 bg-transparent hover:bg-white/5 text-slate-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                  title="Crear y editar categorías de modelado Revit"
                >
                  <Sliders size={13} className={isDarkMode ? 'text-amber-500' : 'text-slate-800'} />
                  Categorías
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
              <div className={`border rounded-2xl p-4 shadow-lg flex flex-col gap-3 animate-fadeIn transition-colors ${
                isDarkMode 
                  ? 'bg-amber-500/5 border-amber-500/20' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className={`flex items-center justify-between border-b pb-2 ${
                  isDarkMode ? 'border-white/5' : 'border-slate-200'
                }`}>
                  <div className={`flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>⚡ Programación en Masa ({selectedTaskIds.length} seleccionadas)</span>
                  </div>
                  <button
                    onClick={() => setSelectedTaskIds([])}
                    className={`text-[10px] uppercase font-bold tracking-wider transition ${
                      isDarkMode ? 'text-slate-400 hover:text-white' : 'text-amber-700 hover:text-amber-800'
                    }`}
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
                      className={`border rounded-xl py-1.5 px-3 focus:outline-none focus:border-amber-500 font-semibold text-xs cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#16191D] border-white/10 text-white'
                          : 'bg-white border-slate-250 text-slate-800 shadow-sm'
                      }`}
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
                    <div className={`flex items-center gap-1 border rounded-xl px-2 py-0.5 ${
                      isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-white border-slate-250 shadow-sm'
                    }`}>
                      <input
                        type="number"
                        min="0"
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        placeholder="Días"
                        id="bulk-duration-input"
                        className={`w-full bg-transparent border-0 focus:outline-none text-xs font-bold text-center py-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}
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
                    <div className={`flex items-center gap-1 border rounded-xl px-2 py-0.5 ${
                      isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-white border-slate-250 shadow-sm'
                    }`}>
                      <input
                        type="date"
                        id="bulk-date-input"
                        className={`w-full bg-transparent border-0 focus:outline-none text-xs font-semibold cursor-pointer py-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}
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
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] rounded-lg transition"
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
                      className={`border rounded-xl py-1.5 px-3 focus:outline-none focus:border-amber-500 font-semibold text-xs cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#16191D] border-white/10 text-white'
                          : 'bg-white border-slate-250 text-slate-800 shadow-sm'
                      }`}
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
                      <th className="px-2 py-2 text-center w-10">
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
                      <th className="px-2 py-2 text-center w-16">Código</th>
                      <th className="px-2 py-2 min-w-[140px] max-w-[200px]">Labor / Elemento Revit</th>
                      <th className="px-2 py-2 w-20">Categoría</th>
                      <th className="px-2 py-2 min-w-[105px]">Asignado</th>
                      <th className="px-2 py-2 text-center w-16">Paralelo</th>
                      <th className="px-2 py-2 text-center w-14">Días</th>
                      <th className="px-2 py-2 text-center w-12 text-[9px]">Pendiente</th>
                      <th className="px-2 py-2 text-center w-12 text-[9px]">En desarr.</th>
                      <th className="px-2 py-2 text-center w-12 text-[9px]">Realizado</th>
                      <th className="px-2 py-2 text-center w-10 text-[9px]">N/A</th>
                      <th className="px-2 py-2 min-w-[115px]">Fecha Inicio</th>
                      <th className="px-2 py-2 min-w-[80px]">Fecha Límite</th>
                      <th className="px-2 py-2 min-w-[110px]">Observaciones</th>
                      <th className="px-2 py-2 text-right pr-4 w-16">Acciones</th>
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
                        const isCompleted = task.status === 'Modelado' || task.status === 'Realizado';
                        
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
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedTaskIds.includes(task.id)}
                                onChange={() => handleToggleSelectTask(task.id)}
                                className={`rounded focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer ${
                                  isDarkMode
                                    ? 'border-white/10 bg-[#16191D] text-amber-500'
                                    : 'border-slate-300 bg-white text-amber-550'
                                }`}
                              />
                            </td>

                            {/* Código */}
                            <td className={`px-2 py-2 text-center font-mono font-bold text-[11px] ${
                              isCompleted ? 'text-slate-500 line-through' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {task.code || 'S/C'} <span className="text-[7px] text-red-500 font-bold block">[{task.activationTimestamp ? task.activationTimestamp.toString().slice(-6) : '0'}]</span>
                            </td>

                            {/* Task Name & Description */}
                            <td className="px-2 py-2">
                              <div className="max-w-[180px]">
                                <span className={`font-bold text-xs block whitespace-normal break-words leading-tight ${
                                  isCompleted 
                                    ? 'line-through text-slate-500' 
                                    : isDarkMode 
                                    ? 'text-white' 
                                    : 'text-slate-900'
                                }`}>
                                  {task.name}
                                </span>
                                {task.description && (
                                  <p className={`text-[10px] font-medium mt-0.5 whitespace-normal break-words leading-tight max-w-[180px] ${
                                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                  }`} title={task.description}>
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Category Badge */}
                            <td className="px-2 py-2">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border tracking-wider block text-center truncate max-w-[90px] ${
                                isDarkMode
                                  ? 'bg-white/5 border-white/5 text-slate-400'
                                  : 'bg-slate-150 border-slate-200 text-slate-650'
                              }`}>
                                {task.category.split(' ')[0]}
                              </span>
                            </td>

                            {/* Modeler Assignee */}
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                {modeler && (
                                  <span 
                                    className="w-2 h-2 rounded-full flex-shrink-0 border border-black/20 shadow-sm" 
                                    style={{ backgroundColor: modeler.color }} 
                                  />
                                )}
                                <select
                                  value={task.assigneeId || ''}
                                  onChange={(e) => {
                                    const val = e.target.value || null;
                                    handleUpdateTaskField(task.id, 'assigneeId', val);
                                  }}
                                  className={`border rounded-lg py-0.5 px-1 focus:outline-none focus:border-amber-500 font-semibold text-[10px] cursor-pointer transition max-w-[90px] ${
                                    isDarkMode
                                      ? 'bg-[#16191D] border-white/10 text-slate-300 hover:text-white'
                                      : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                                  }`}
                                >
                                  <option value="">Auto-asignar</option>
                                  {modelers.map(m => (
                                    <option key={m.id} value={m.id} className={isDarkMode ? 'bg-[#16191D] text-slate-200' : 'bg-white text-slate-800'}>
                                      {m.name.split(' ')[0]} {m.name.split(' ')[1]?.charAt(0) || ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* Parallel Toggle Button */}
                            <td className="px-2 py-2 text-center">
                             <div className="flex flex-col items-center gap-1">
                               <button
                                 type="button"
                                 onClick={() => {
                                   const newIsParallel = !task.isParallel;
                                   setTasks(prev => prev.map(t => {
                                     if (t.id === task.id) {
                                       return {
                                         ...t,
                                         isParallel: newIsParallel,
                                         parallelWithTaskId: newIsParallel ? t.parallelWithTaskId : null
                                       };
                                     }
                                     return t;
                                   }));
                                 }}
                                 className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold border transition flex items-center justify-center gap-1 mx-auto ${
                                   task.isParallel
                                     ? 'bg-amber-500 border-amber-500 text-black shadow-sm'
                                     : isDarkMode
                                     ? 'bg-[#16191D]/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                                     : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 shadow-sm'
                                 }`}
                                 title={task.isParallel ? "Programación en paralelo activada (no consume días secuenciales)" : "Programación secuencial"}
                                >
                                 {task.isParallel ? "Sí" : "No"}
                               </button>

                               {task.isParallel && (
                                 <select
                                   value={task.parallelWithTaskId || ''}
                                   onChange={(e) => {
                                     handleUpdateTaskField(task.id, 'parallelWithTaskId', e.target.value || null);
                                   }}
                                   className={`border rounded-md py-0.5 px-0.5 focus:outline-none focus:border-amber-500 font-semibold text-[8px] cursor-pointer transition max-w-[80px] ${
                                     isDarkMode
                                       ? 'bg-[#16191D] border-white/10 text-slate-300 hover:text-white'
                                       : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                                   }`}
                                 >
                                   <option value="">-- Con cuál --</option>
                                   {tasks
                                     .filter(t => t.id !== task.id)
                                     .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
                                     .map(t => (
                                       <option key={t.id} value={t.id}>
                                         [{t.code || 'S/C'}] {t.name}
                                       </option>
                                     ))
                                   }
                                 </select>
                               )}
                             </div>
                            </td>

                            {/* Working Days Duration */}
                            <td className="px-2 py-2 text-center font-bold">
                              <div className="flex items-center justify-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  onWheel={(e) => (e.target as HTMLElement).blur()}
                                  value={task.durationDays}
                                  onChange={(e) => {
                                    const valStr = e.target.value;
                                    const val = valStr === '' ? '' : Math.max(0, parseInt(valStr) || 0);
                                    handleUpdateTaskField(task.id, 'durationDays', val);
                                  }}
                                  className={`w-11 text-center border rounded-lg py-0.5 px-0.5 focus:outline-none focus:border-amber-500 font-extrabold text-[11px] transition ${
                                    isDarkMode
                                      ? 'bg-[#16191D] border-white/10 text-white'
                                      : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                                  }`}
                                />
                                <span className="text-[9px] text-slate-500 font-medium">d</span>
                              </div>
                            </td>

                            {/* Pendiente Checkbox */}
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={task.status === 'Pendiente'}
                                onChange={() => handleUpdateTaskField(task.id, 'status', 'Pendiente')}
                                className={`rounded focus:ring-slate-500 w-3.5 h-3.5 cursor-pointer ${
                                  isDarkMode
                                    ? 'border-white/10 bg-[#16191D] text-slate-500'
                                    : 'border-slate-300 bg-white text-slate-400'
                                }`}
                              />
                            </td>

                            {/* En desarrollo Checkbox */}
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={task.status === 'En desarrollo'}
                                onChange={() => handleUpdateTaskField(task.id, 'status', task.status === 'En desarrollo' ? 'Pendiente' : 'En desarrollo')}
                                className={`rounded focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer ${
                                  isDarkMode
                                    ? 'border-white/10 bg-[#16191D] text-amber-500'
                                    : 'border-slate-300 bg-white text-amber-550'
                                }`}
                              />
                            </td>

                            {/* Realizado Checkbox */}
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={task.status === 'Realizado' || task.status === 'Modelado'}
                                onChange={() => handleUpdateTaskField(task.id, 'status', (task.status === 'Realizado' || task.status === 'Modelado') ? 'Pendiente' : 'Realizado')}
                                className={`rounded focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer ${
                                  isDarkMode
                                    ? 'border-white/10 bg-[#16191D] text-emerald-500'
                                    : 'border-slate-300 bg-white text-emerald-550'
                                }`}
                              />
                            </td>

                            {/* N/A Checkbox */}
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={task.status === 'N/A'}
                                onChange={() => handleUpdateTaskField(task.id, 'status', task.status === 'N/A' ? 'Pendiente' : 'N/A')}
                                className={`rounded focus:ring-slate-500 w-3.5 h-3.5 cursor-pointer ${
                                  isDarkMode
                                    ? 'border-white/10 bg-[#16191D] text-slate-500'
                                    : 'border-slate-300 bg-white text-slate-450'
                                }`}
                              />
                            </td>

                            {/* Scheduled date: Fecha Inicio */}
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="date"
                                  value={localDates[task.id] !== undefined ? localDates[task.id] : (task.manualStart || task.scheduledStart || '')}
                                  onChange={(e) => handleDebouncedDateChange(task.id, 'task', e.target.value)}
                                  onBlur={(e) => handleDateBlur(task.id, 'task', e.target.value)}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className={`border rounded-lg py-0.5 px-1 focus:outline-none focus:border-amber-500 text-[10px] transition max-w-[95px] font-semibold cursor-pointer ${
                                    task.manualStart
                                      ? 'border-amber-500 text-amber-500 font-bold bg-amber-500/5'
                                      : isDarkMode
                                      ? 'bg-[#16191D] border-white/10 text-slate-300'
                                      : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                                  }`}
                                  title={task.manualStart ? "Fecha de inicio manual" : "Fecha de inicio automática. Haz clic para fijar manualmente."}
                                />
                                {task.manualStart && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTaskField(task.id, 'manualStart', null)}
                                    className="text-rose-500 hover:text-rose-400 font-extrabold text-[9px] px-0.5 shrink-0"
                                    title="Quitar fecha manual y volver a automático"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Scheduled date: Fecha Límite */}
                            <td className="px-2 py-2">
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {task.scheduledEnd || '-'}
                                </span>
                                {task.isDelayed && (
                                  <span className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[7px] font-extrabold uppercase tracking-wide border shadow-sm ${
                                    isDarkMode 
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    ⚠️ Retrasado
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Observaciones */}
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={task.notes || ''}
                                onChange={(e) => handleUpdateTaskField(task.id, 'notes', e.target.value)}
                                placeholder="Observaciones..."
                                className={`w-full border rounded-lg py-1 px-1.5 focus:outline-none focus:border-amber-500 text-[11px] transition ${
                                  isDarkMode
                                    ? 'bg-[#16191D] border-white/10 text-slate-200'
                                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                                }`}
                              />
                            </td>

                            {/* Action Buttons */}
                            <td className="px-2 py-2 text-right pr-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDevNotes(task.id, 'task')}
                                  className={`p-1 rounded-lg transition relative ${
                                    isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-amber-500' : 'hover:bg-slate-100 text-slate-550 hover:text-amber-600'
                                  }`}
                                  title="Notas de Desarrollo"
                                >
                                  <FileText size={13} />
                                  {task.devNotes?.entries && task.devNotes.entries.length > 0 && (
                                    <span className={`absolute top-0 right-0 w-1 h-1 rounded-full ${
                                      task.devNotes.entries.some(e => e.type === 'incidencia' && !e.resolved)
                                        ? 'bg-rose-500 animate-pulse'
                                        : 'bg-amber-500'
                                    }`} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsFormOpen(true);
                                  }}
                                  className={`p-1 rounded-lg transition ${
                                    isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-amber-500' : 'hover:bg-slate-100 text-slate-550 hover:text-amber-600'
                                  }`}
                                  title="Editar tarea"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task.id)}
                                  className={`p-1 rounded-lg transition ${
                                    isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-rose-400' : 'hover:bg-slate-100 text-slate-550 hover:text-rose-600'
                                  }`}
                                  title="Eliminar tarea"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                     ) : (
                      <tr>
                        <td colSpan={15} className={`text-center py-12 transition-colors ${
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
        {activeTab === 'planimetria' && (() => {
          const unfilteredFilteredDrawings = selectedDrawingSeries === 'TODAS'
            ? drawings
            : drawings.filter(d => d.series === selectedDrawingSeries);

          const filteredDrawings = drawingSearchQuery.trim() === ''
            ? unfilteredFilteredDrawings
            : unfilteredFilteredDrawings.filter(d => {
                const q = drawingSearchQuery.toLowerCase();
                return (
                  d.name.toLowerCase().includes(q) ||
                  (d.code && d.code.toLowerCase().includes(q)) ||
                  (d.series && d.series.toLowerCase().includes(q)) ||
                  (d.notes && d.notes.toLowerCase().includes(q))
                );
              });

          return (
            <div className="space-y-6">
            {/* Top Toolbar */}
            <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border rounded-2xl shadow-sm transition-all ${
              isDarkMode 
                ? 'bg-[#0F1115] border-white/10' 
                : 'bg-white border-slate-200'
            }`}>
              {/* Series selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => {
                    setSelectedDrawingSeries('TODAS');
                    setConfirmClearDrawings(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                    selectedDrawingSeries === 'TODAS'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                      : isDarkMode
                      ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  Ver Todos
                </button>
                {drawingSeries.map((ser) => {
                  // Get nice label
                  const match = ser.match(/SERIE\s+(\d+)\s*:\s*(.*)/i);
                  let label = ser;
                  if (match) {
                    const num = match[1];
                    const name = match[2];
                    const parenMatch = name.match(/\((.*?)\)/);
                    if (parenMatch) {
                      label = `${num}: ${parenMatch[1]}`;
                    } else {
                      label = `${num}: ${name.slice(0, 5).toUpperCase()}`;
                    }
                  } else {
                    label = ser.slice(0, 12);
                  }

                  return (
                    <button
                      key={ser}
                      onClick={() => {
                        setSelectedDrawingSeries(ser);
                        setConfirmClearDrawings(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                        selectedDrawingSeries === ser
                          ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                          : isDarkMode
                          ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                      title={ser}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                  </span>
                  <input
                    type="text"
                    value={drawingSearchQuery}
                    onChange={(e) => setDrawingSearchQuery(e.target.value)}
                    placeholder="Buscar plano..."
                    className={`w-full pl-9 pr-8 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors ${
                      isDarkMode
                        ? 'bg-[#16191D] border-white/10 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-sm'
                    }`}
                  />
                  {drawingSearchQuery && (
                    <button
                      onClick={() => setDrawingSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-200"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleStartCreateDrawing}
                  className={`px-4 py-1.5 font-extrabold uppercase tracking-wider rounded-xl text-[10px] flex items-center gap-1.5 transition shadow-sm ${
                    isDarkMode
                      ? 'bg-white hover:bg-slate-200 text-black shadow-white/5'
                      : 'bg-slate-900 hover:bg-slate-850 text-white shadow-slate-200'
                  }`}
                >
                  <Plus size={13} strokeWidth={2.5} />
                  Agregar Plano
                </button>
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
                <button
                  onClick={() => setIsSeriesManagerOpen(true)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    isDarkMode
                      ? 'border-white/10 bg-transparent hover:bg-white/5 text-slate-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                  title="Crear y editar series de planimetría"
                >
                  <Sliders size={13} className={isDarkMode ? 'text-amber-500' : 'text-slate-800'} />
                  Series
                </button>
              </div>
            </div>

            {/* Drawing Bulk Actions Panel */}
            {selectedDrawingIds.length > 0 && (
              <div className={`border rounded-2xl p-4 shadow-lg flex flex-col gap-3 animate-fadeIn transition-colors ${
                isDarkMode 
                  ? 'bg-amber-500/5 border-amber-500/20' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className={`flex items-center justify-between border-b pb-2 ${
                  isDarkMode ? 'border-white/5' : 'border-slate-200'
                }`}>
                  <div className={`flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>
                    <CheckSquare size={14} className="text-amber-500" />
                    Edición en Bloque: {selectedDrawingIds.length} planos seleccionados
                  </div>
                  <button
                    onClick={() => setSelectedDrawingIds([])}
                    className={`text-xs font-bold cursor-pointer transition ${
                      isDarkMode ? 'text-amber-500 hover:text-amber-400' : 'text-amber-700 hover:text-amber-800'
                    }`}
                  >
                    Desmarcar todos
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {/* Assign Modelers */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Asignar a:</span>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'clear') {
                          handleBulkAssignDrawings(null);
                        } else if (val) {
                          handleBulkAssignDrawings(val);
                        }
                        e.target.value = ''; // Reset
                      }}
                      className={`border rounded-lg py-1 px-2 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#16191D] border-white/10 text-slate-300'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="clear">-- Quitar asignación --</option>
                      {modelers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration days */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Duración (días):</span>
                    <input
                      type="number"
                      min="0"
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      placeholder="Ej. 5"
                      id="bulk-drawing-days-input"
                      className={`w-16 border rounded-lg py-1 px-2 focus:outline-none focus:border-amber-500 font-semibold text-center ${
                        isDarkMode
                          ? 'bg-[#16191D] border-white/10 text-white'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt((e.target as HTMLInputElement).value);
                          if (!isNaN(val) && val >= 0) {
                            handleBulkDurationDrawings(val);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById('bulk-drawing-days-input') as HTMLInputElement;
                        const val = parseInt(el?.value || '');
                        if (!isNaN(val) && val >= 0) {
                          handleBulkDurationDrawings(val);
                          if (el) el.value = '';
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-500 text-black rounded-lg font-bold hover:bg-amber-400 transition"
                    >
                      Aplicar
                    </button>
                  </div>

                  {/* Status update */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Estado:</span>
                    <div className="flex items-center gap-1">
                      {(['Pendiente', 'En desarrollo', 'Realizado', 'N/A'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => handleBulkStatusDrawings(st)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                            st === 'Realizado'
                              ? isDarkMode 
                                ? 'bg-[#10B981]/15 border-[#10B981]/35 text-emerald-400 hover:bg-[#10B981]/25' 
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : st === 'En desarrollo'
                              ? isDarkMode 
                                ? 'bg-[#0EA5E9]/15 border-[#0EA5E9]/35 text-sky-400 hover:bg-[#0EA5E9]/25' 
                                : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                              : st === 'Pendiente'
                              ? isDarkMode 
                                ? 'bg-[#F59E0B]/15 border-[#F59E0B]/35 text-amber-400 hover:bg-[#F59E0B]/25' 
                                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                              : isDarkMode 
                                ? 'bg-slate-500/15 border-slate-500/35 text-slate-400 hover:bg-slate-500/25' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fecha de Inicio Manual update */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Fecha de Inicio:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        id="bulk-drawing-date-input"
                        className={`border rounded-lg py-1 px-2 focus:outline-none focus:border-amber-500 font-semibold text-xs cursor-pointer ${
                          isDarkMode
                            ? 'bg-[#16191D] border-white/10 text-slate-300'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      />
                      <button
                        onClick={() => {
                          const el = document.getElementById('bulk-drawing-date-input') as HTMLInputElement;
                          const val = el?.value || null;
                          handleBulkStartDateDrawings(val);
                          if (el) el.value = '';
                        }}
                        className="px-2.5 py-1 bg-amber-500 text-black rounded-lg font-bold hover:bg-amber-400 transition"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                      <th className="px-2 py-2 text-center w-10">
                        <input
                          type="checkbox"
                          checked={filteredDrawings.length > 0 && filteredDrawings.every(d => selectedDrawingIds.includes(d.id))}
                          onChange={() => handleSelectAllFilteredDrawings(filteredDrawings)}
                          className={`rounded focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer ${
                            isDarkMode 
                              ? 'border-white/10 bg-[#16191D] text-amber-500' 
                              : 'border-slate-300 bg-white text-amber-550'
                          }`}
                          title="Seleccionar todos los planos visibles"
                        />
                      </th>
                      <th className="px-2 py-2 text-center w-16">CÓDIGO</th>
                      <th className="px-2 py-2 min-w-[140px] max-w-[200px]">LABOR/ELEMENTO REVIT</th>
                      <th className="px-2 py-2 w-20">CATEGORÍA</th>
                      <th className="px-2 py-2 min-w-[105px]">ASIGNADO</th>
                      <th className="px-2 py-2 text-center w-16">PARALELO</th>
                      <th className="px-2 py-2 text-center w-14">DÍAS</th>
                      <th className="px-2 py-2 text-center w-12 text-[9px]">PENDIENTE</th>
                      <th className="px-2 py-2 text-center w-12 text-[9px]">EN DESARR.</th>
                      <th className="px-2 py-2 text-center w-12 text-[9px]">REALIZADO</th>
                      <th className="px-2 py-2 text-center w-10 text-[9px]">N/A</th>
                      <th className="px-2 py-2 min-w-[115px] font-bold">FECHA INICIO</th>
                      <th className="px-2 py-2 min-w-[80px] font-bold">FECHA LÍMITE</th>
                      <th className="px-2 py-2 min-w-[110px]">OBSERVACIONES</th>
                      <th className="px-2 py-2 text-right pr-4 w-16">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors ${
                    isDarkMode 
                      ? 'divide-white/5 text-slate-300' 
                      : 'divide-slate-100 text-slate-700'
                  }`}>
                    {(() => {
                      if (filteredDrawings.length === 0) {
                        return (
                          <tr>
                            <td colSpan={15} className={`text-center py-12 transition-colors ${
                              isDarkMode ? 'bg-[#0F1115] text-slate-500' : 'bg-slate-50 text-slate-400'
                            }`}>
                              <Info className="mx-auto mb-2 text-slate-500" size={24} />
                              No hay planos para la serie seleccionada.
                            </td>
                          </tr>
                        );
                      }

                      // Find unique series represented in the filtered list
                      const uniqueSeries = Array.from(new Set(filteredDrawings.map(d => d.series)));

                      return uniqueSeries.map(seriesName => {
                        const seriesDrawings = filteredDrawings.filter(d => d.series === seriesName);
                        return (
                          <Fragment key={seriesName}>
                            {/* Series Subheader */}
                            <tr className={isDarkMode ? 'bg-[#13161A]' : 'bg-slate-100/60'}>
                              <td colSpan={15} className={`px-4 py-2 text-left font-bold text-amber-500 text-[11px] uppercase tracking-wider border-y select-none ${
                                isDarkMode ? 'border-white/5' : 'border-slate-100'
                              }`}>
                                {seriesName}
                              </td>
                            </tr>
                            {seriesDrawings.map(d => {
                              const isDone = d.status === 'Realizado';
                              const modeler = modelers.find(m => m.id === d.assigneeId);

                              return (
                                <tr 
                                  key={d.id} 
                                  className={`transition-colors ${
                                    isDone
                                      ? (isDarkMode ? 'bg-emerald-950/5 opacity-65 text-slate-450 hover:bg-emerald-950/10' : 'bg-emerald-50/20 opacity-70 text-slate-500 hover:bg-emerald-50/30')
                                      : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50/60')
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedDrawingIds.includes(d.id)}
                                      onChange={() => handleToggleSelectDrawing(d.id)}
                                      className={`rounded focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer ${
                                        isDarkMode 
                                          ? 'border-white/10 bg-[#16191D] text-amber-500' 
                                          : 'border-slate-300 bg-white text-amber-550'
                                      }`}
                                    />
                                  </td>

                                  {/* Code */}
                                  <td className={`px-2 py-1.5 text-center font-mono font-bold text-[10px] ${
                                    isDone ? 'text-slate-500 line-through' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                    {d.code}
                                  </td>

                                  {/* Nombre del Plano */}
                                  <td className="px-2 py-1.5">
                                    <div className="max-w-[180px]">
                                      <span className={`font-semibold text-xs block whitespace-normal break-words leading-tight ${
                                        isDone
                                          ? 'line-through text-slate-500'
                                          : isDarkMode
                                          ? 'text-white'
                                          : 'text-slate-800'
                                      }`}>
                                        {d.name}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Categoría */}
                                  <td className="px-2 py-1.5">
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border tracking-wider block text-center truncate max-w-[90px] ${
                                      isDarkMode
                                        ? 'bg-white/5 border-white/5 text-slate-400'
                                        : 'bg-slate-150 border-slate-200 text-slate-650'
                                    }`}>
                                      {d.series.split(' ')[0] || 'PLANO'}
                                    </span>
                                  </td>

                                  {/* Modelador */}
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      {modeler && (
                                        <span 
                                          className="w-2 h-2 rounded-full flex-shrink-0 border border-black/20 shadow-sm" 
                                          style={{ backgroundColor: modeler.color }} 
                                        />
                                      )}
                                      <select
                                        value={d.assigneeId || ''}
                                        onChange={(e) => handleUpdateDrawingField(d.id, 'assigneeId', e.target.value || null)}
                                        className={`border rounded-lg py-0.5 px-1 focus:outline-none focus:border-amber-500 font-semibold text-[10px] cursor-pointer transition max-w-[90px] ${
                                          isDarkMode
                                            ? 'bg-[#16191D] border-white/10 text-slate-300 hover:text-white'
                                            : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                                        }`}
                                      >
                                        <option value="" className={isDarkMode ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>Sin asignar</option>
                                        {modelers.map(m => (
                                          <option key={m.id} value={m.id} className={isDarkMode ? 'bg-[#16191D] text-slate-200' : 'bg-white text-slate-850'}>
                                            {m.name.split(' ')[0]} {m.name.split(' ')[1]?.charAt(0) || ''}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>

                                  {/* Parallel Toggle Button */}
                                  <td className="px-2 py-1.5 text-center">
                                    <div className="flex flex-col gap-1 items-center justify-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = drawings.map(x => {
                                            if (x.id === d.id) {
                                              const nextParallel = !x.isParallel;
                                              return {
                                                ...x,
                                                isParallel: nextParallel,
                                                parallelWithDrawingId: nextParallel ? x.parallelWithDrawingId : null
                                              };
                                            }
                                            return x;
                                          });
                                          setDrawings(updated);
                                        }}
                                        className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold border transition flex items-center justify-center gap-1 mx-auto ${
                                          d.isParallel
                                            ? 'bg-amber-500 border-amber-500 text-black shadow-sm'
                                            : isDarkMode
                                            ? 'bg-[#16191D]/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 shadow-sm'
                                        }`}
                                        title={d.isParallel ? "Programación en paralelo activada (no consume días secuenciales)" : "Programación secuencial"}
                                      >
                                        {d.isParallel ? "Sí" : "No"}
                                      </button>

                                      {d.isParallel && (
                                        <select
                                          value={d.parallelWithDrawingId || ''}
                                          onChange={(e) => handleUpdateDrawingField(d.id, 'parallelWithDrawingId', e.target.value || null)}
                                          className={`border rounded-md py-0.5 px-0.5 focus:outline-none focus:border-amber-500 font-semibold text-[8px] cursor-pointer transition max-w-[80px] ${
                                            isDarkMode
                                              ? 'bg-[#16191D] border-white/10 text-slate-300 hover:text-white'
                                              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                                          }`}
                                        >
                                          <option value="">-- Con cuál --</option>
                                          {drawings
                                            .filter(x => x.id !== d.id)
                                            .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
                                            .map(x => (
                                              <option key={x.id} value={x.id}>
                                                [{x.code || 'S/C'}] {x.name}
                                              </option>
                                            ))
                                          }
                                        </select>
                                      )}
                                    </div>
                                  </td>

                                  {/* Días */}
                                  <td className="px-2 py-1.5 text-center font-bold">
                                    <div className="flex items-center justify-center gap-0.5">
                                      <input
                                        type="number"
                                        min="0"
                                        onWheel={(e) => (e.target as HTMLElement).blur()}
                                        value={d.durationDays !== undefined ? d.durationDays : 3}
                                        onChange={(e) => {
                                          const valStr = e.target.value;
                                          const val = valStr === '' ? '' : Math.max(0, parseInt(valStr, 10) || 0);
                                          handleUpdateDrawingField(d.id, 'durationDays', val);
                                        }}
                                        className={`w-11 text-center border rounded-lg py-0.5 px-0.5 focus:outline-none focus:border-amber-500 font-extrabold text-[11px] transition ${
                                          isDarkMode
                                            ? 'bg-[#16191D] border-white/10 text-white'
                                            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                                        }`}
                                      />
                                      <span className="text-[9px] text-slate-500 font-medium">d</span>
                                    </div>
                                  </td>

                                  {/* Pendiente Checkbox */}
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'Pendiente'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', 'Pendiente')}
                                      className={`rounded focus:ring-slate-500 w-3.5 h-3.5 cursor-pointer ${
                                        isDarkMode
                                          ? 'border-white/10 bg-[#16191D] text-slate-500'
                                          : 'border-slate-300 bg-white text-slate-455'
                                      }`}
                                    />
                                  </td>

                                  {/* En desarrollo Checkbox */}
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'En desarrollo'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', d.status === 'En desarrollo' ? 'Pendiente' : 'En desarrollo')}
                                      className={`rounded focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer ${
                                        isDarkMode
                                          ? 'border-white/10 bg-[#16191D] text-amber-500'
                                          : 'border-slate-300 bg-white text-amber-550'
                                      }`}
                                    />
                                  </td>

                                  {/* Realizado Checkbox */}
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'Realizado'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', d.status === 'Realizado' ? 'Pendiente' : 'Realizado')}
                                      className={`rounded focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer ${
                                        isDarkMode
                                          ? 'border-white/10 bg-[#16191D] text-emerald-500'
                                          : 'border-slate-300 bg-white text-emerald-550'
                                      }`}
                                    />
                                  </td>

                                  {/* N/A Checkbox */}
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={d.status === 'N/A'}
                                      onChange={() => handleUpdateDrawingField(d.id, 'status', d.status === 'N/A' ? 'Pendiente' : 'N/A')}
                                      className={`rounded focus:ring-slate-500 w-3.5 h-3.5 cursor-pointer ${
                                        isDarkMode
                                          ? 'border-white/10 bg-[#16191D] text-slate-500'
                                          : 'border-slate-300 bg-white text-slate-455'
                                      }`}
                                    />
                                  </td>

                                  {/* Scheduled date: Fecha Inicio */}
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-0.5">
                                      <input
                                        type="date"
                                        value={localDates[d.id] !== undefined ? localDates[d.id] : (d.manualStart || d.scheduledStart || '')}
                                        onChange={(e) => handleDebouncedDateChange(d.id, 'drawing', e.target.value)}
                                        onBlur={(e) => handleDateBlur(d.id, 'drawing', e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={`border rounded-lg py-0.5 px-1 focus:outline-none focus:border-amber-500 text-[10px] transition max-w-[95px] font-semibold cursor-pointer ${
                                          d.manualStart
                                            ? 'border-amber-500 text-amber-500 font-bold bg-amber-500/5'
                                            : isDarkMode
                                            ? 'bg-[#16191D] border-white/10 text-slate-300'
                                            : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                                        }`}
                                        title={d.manualStart ? "Fecha de inicio manual" : "Fecha de inicio automática. Haz clic para fijar manualmente."}
                                      />
                                      {d.manualStart && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateDrawingField(d.id, 'manualStart', null)}
                                          className="text-rose-500 hover:text-rose-400 font-extrabold text-[9px] px-0.5 shrink-0"
                                          title="Quitar fecha manual y volver a automático"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  {/* Scheduled date: Fecha Límite */}
                                  <td className="px-2 py-1.5">
                                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                      {d.scheduledEnd || '-'}
                                    </span>
                                  </td>

                                  {/* Observaciones */}
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="text"
                                      value={d.observations || ''}
                                      onChange={(e) => handleUpdateDrawingField(d.id, 'observations', e.target.value)}
                                      placeholder="Observaciones..."
                                      className={`w-full border rounded-lg py-1 px-1.5 focus:outline-none focus:border-amber-500 text-[11px] transition ${
                                        isDarkMode
                                          ? 'bg-[#16191D] border-white/10 text-slate-200'
                                          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                                      }`}
                                    />
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="px-2 py-1.5 text-right pr-4">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDevNotes(d.id, 'drawing')}
                                        className={`p-1 rounded-lg transition relative ${
                                          isDarkMode ? 'hover:bg-amber-500/15 text-slate-400 hover:text-amber-500' : 'hover:bg-amber-50 text-slate-550 hover:text-amber-600'
                                        }`}
                                        title="Notas de Desarrollo"
                                      >
                                        <FileText size={13} />
                                        {d.devNotes?.entries && d.devNotes.entries.length > 0 && (
                                          <span className={`absolute top-0 right-0 w-1 h-1 rounded-full ${
                                            d.devNotes.entries.some(e => e.type === 'incidencia' && !e.resolved)
                                              ? 'bg-rose-500 animate-pulse'
                                              : 'bg-amber-500'
                                          }`} />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditDrawing(d)}
                                        className={`p-1 rounded-lg transition ${
                                          isDarkMode ? 'hover:bg-amber-500/15 text-slate-400 hover:text-amber-500' : 'hover:bg-amber-50 text-slate-550 hover:text-amber-600'
                                        }`}
                                        title="Editar plano"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDrawing(d.id)}
                                        className={`p-1 rounded-lg transition ${
                                          isDarkMode ? 'hover:bg-rose-950/30 text-slate-400 hover:text-rose-400' : 'hover:bg-rose-50 text-slate-550 hover:text-rose-600'
                                        }`}
                                        title="Eliminar plano"
                                      >
                                        <Trash2 size={13} />
                                      </button>
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
        );
      })()}

        {/* TAB CONTENT: CALENDAR */}
        {activeTab === 'calendar' && (
          <CalendarView 
            tasks={tasks} 
            drawings={drawings}
            modelers={modelers} 
            isDarkMode={isDarkMode} 
            onUpdateActivity={handleUpdateActivity}
          />
        )}

        {/* TAB CONTENT: TIMELINE */}
        {activeTab === 'timeline' && (
          <TimelineView 
            tasks={tasks} 
            drawings={drawings} 
            modelers={modelers} 
            isDarkMode={isDarkMode} 
            onUpdateActivity={handleUpdateActivity}
            onReorder={handleReorderActivities}
            onUpdateBlockDates={handleUpdateBlockDates}
          />
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

        {/* TAB CONTENT: DEFINITIONS */}
        {activeTab === 'definitions' && (
          <DefinitionsTab
            tasks={tasks}
            drawings={drawings}
            definitions={definitions}
            onUpdateDefinitions={(newDefs) => {
              setDefinitions(newDefs);
              setHasUnsavedChanges(true);
            }}
            isDarkMode={isDarkMode}
          />
        )}
      </main>

      {/* FOOTER WITH NORA LOGO AND THEME TOGGLE SUPPORT */}
      <footer className={`border-t py-12 transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0A0A0C] border-white/5' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center space-y-2">
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
          <span className={`text-xs font-medium tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>POWERED BY: nora</span>
        </div>
      </footer>

      {/* FLOATING MODAL PANEL FOR CREATE/EDIT TASK */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <TaskForm
              task={editingTask}
              tasks={tasks}
              modelers={modelers}
              onSave={handleSaveTask}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTask(null);
              }}
              onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
              suggestedTasksByCategory={SUGGESTED_TASKS_BY_CATEGORY}
              isDarkMode={isDarkMode}
              bimCategories={bimCategories}
            />
          </div>
        </div>
      )}

      {/* FLOATING MODAL FOR CATEGORY MANAGER */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 border transition-all shadow-2xl ${
            isDarkMode 
              ? 'bg-[#0F1115] border-white/10 text-white shadow-black/80' 
              : 'bg-white border-slate-200 text-slate-800 shadow-slate-200'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-amber-500">
                <Sliders size={18} />
                Gestionar Categorías
              </h3>
              <button
                onClick={() => setIsCategoryManagerOpen(false)}
                className={`p-1.5 rounded-lg transition ${
                  isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* New Category Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ej. INSTALACIONES HIDRÁULICAS"
                  id="new-category-input"
                  className={`flex-1 border rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500 transition font-medium ${
                    isDarkMode
                      ? 'bg-[#16191D] border-white/10 text-white'
                      : 'bg-white border-slate-200 text-slate-850 shadow-sm'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                      if (val && !bimCategories.includes(val)) {
                        setBimCategories([...bimCategories, val]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const el = document.getElementById('new-category-input') as HTMLInputElement;
                    const val = el?.value.trim().toUpperCase();
                    if (val && !bimCategories.includes(val)) {
                      setBimCategories([...bimCategories, val]);
                      if (el) el.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition text-xs uppercase"
                >
                  Agregar
                </button>
              </div>

              {/* Category List */}
              <div className={`border rounded-xl p-2 max-h-60 overflow-y-auto space-y-1 ${
                isDarkMode ? 'border-white/5 bg-[#16191D]/30' : 'border-slate-100 bg-slate-50/50'
              }`}>
                {bimCategories.map(cat => {
                  const tasksCount = tasks.filter(t => t.category === cat).length;
                  return (
                    <div
                      key={cat}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                        isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold tracking-wide">{cat}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{tasksCount} tareas asociadas</span>
                      </div>
                      <button
                        onClick={() => {
                          if (tasksCount > 0) {
                            if (!confirm(`La categoría "${cat}" tiene ${tasksCount} tareas asociadas. ¿Estás seguro de que deseas eliminarla? Las tareas quedarán con categoría sin actualizar.`)) {
                              return;
                            }
                          }
                          setBimCategories(bimCategories.filter(c => c !== cat));
                        }}
                        className={`p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition`}
                        title="Eliminar categoría"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  onClick={() => setIsCategoryManagerOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition text-xs uppercase cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING MODAL FOR SERIES MANAGER */}
      {isSeriesManagerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 border transition-all shadow-2xl ${
            isDarkMode 
              ? 'bg-[#0F1115] border-white/10 text-white shadow-black/80' 
              : 'bg-white border-slate-200 text-slate-800 shadow-slate-200'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-amber-500">
                <Sliders size={18} />
                Gestionar Series (Planimetría)
              </h3>
              <button
                onClick={() => setIsSeriesManagerOpen(false)}
                className={`p-1.5 rounded-lg transition ${
                  isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* New Series Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ej. SERIE 1000: DETALLES DE PAISAJISMO (PAI)"
                  id="new-series-input"
                  className={`flex-1 border rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500 transition font-medium ${
                    isDarkMode
                      ? 'bg-[#16191D] border-white/10 text-white'
                      : 'bg-white border-slate-200 text-slate-850 shadow-sm'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                      if (val && !drawingSeries.includes(val)) {
                        setDrawingSeries([...drawingSeries, val]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const el = document.getElementById('new-series-input') as HTMLInputElement;
                    const val = el?.value.trim().toUpperCase();
                    if (val && !drawingSeries.includes(val)) {
                      setDrawingSeries([...drawingSeries, val]);
                      if (el) el.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition text-xs uppercase"
                >
                  Agregar
                </button>
              </div>

              {/* Series List */}
              <div className={`border rounded-xl p-2 max-h-60 overflow-y-auto space-y-1 ${
                isDarkMode ? 'border-white/5 bg-[#16191D]/30' : 'border-slate-100 bg-slate-50/50'
              }`}>
                {drawingSeries.map(ser => {
                  const drawingsCount = drawings.filter(d => d.series === ser).length;
                  return (
                    <div
                      key={ser}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                        isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold tracking-wide">{ser}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{drawingsCount} planos asociados</span>
                      </div>
                      <button
                        onClick={() => {
                          if (drawingsCount > 0) {
                            if (!confirm(`La serie "${ser}" tiene ${drawingsCount} planos asociados. ¿Estás seguro de que deseas eliminarla? Los planos quedarán con serie sin actualizar.`)) {
                              return;
                            }
                          }
                          setDrawingSeries(drawingSeries.filter(s => s !== ser));
                        }}
                        className={`p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition`}
                        title="Eliminar serie"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  onClick={() => setIsSeriesManagerOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition text-xs uppercase cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING MODAL PANEL FOR CREATE/EDIT DRAWING */}
      {isDrawingFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl p-6 border transition-all shadow-2xl ${
            isDarkMode 
              ? 'bg-[#0F1115] border-white/10 text-white shadow-black/80' 
              : 'bg-white border-slate-200 text-slate-800 shadow-slate-200'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-amber-500">
                {editingDrawing ? <Edit3 size={18} /> : <Plus size={18} />}
                {editingDrawing ? 'Editar Plano' : 'Agregar Nuevo Plano'}
              </h3>
              <button
                onClick={() => {
                  setIsDrawingFormOpen(false);
                  setEditingDrawing(null);
                }}
                className={`p-1.5 rounded-lg transition ${
                  isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDrawing} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Nombre del Plano <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDrawingName}
                  onChange={(e) => setNewDrawingName(e.target.value)}
                  placeholder="ej. PLANTA DE ARQUITECTURA GENERAL"
                  className={`w-full border rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500 transition font-medium ${
                    isDarkMode
                      ? 'bg-[#16191D] border-white/10 text-white'
                      : 'bg-white border-slate-200 text-slate-850 shadow-sm'
                  }`}
                />
              </div>

              {/* Series */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Serie / Grupo
                </label>
                <select
                  value={newDrawingSeries}
                  onChange={(e) => setNewDrawingSeries(e.target.value)}
                  className={`w-full border rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500 transition cursor-pointer font-semibold ${
                    isDarkMode
                      ? 'bg-[#16191D] border-white/10 text-white'
                      : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                  }`}
                >
                  {drawingSeries.map(opt => (
                    <option key={opt} value={opt} className={isDarkMode ? 'bg-[#16191D]' : 'bg-white'}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Days */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                    Duración (Días)
                  </label>
                  <input
                    type="number"
                    min="0"
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    required
                    value={newDrawingDays}
                    onChange={(e) => setNewDrawingDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className={`w-full border rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500 transition font-medium ${
                      isDarkMode
                        ? 'bg-[#16191D] border-white/10 text-white'
                        : 'bg-white border-slate-200 text-slate-850 shadow-sm'
                    }`}
                  />
                </div>

                {/* Modeler */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                    Asignar Modeler
                  </label>
                  <select
                    value={newDrawingModelerId}
                    onChange={(e) => setNewDrawingModelerId(e.target.value)}
                    className={`w-full border rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500 transition cursor-pointer font-medium ${
                      isDarkMode
                        ? 'bg-[#16191D] border-white/10 text-white'
                        : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                    }`}
                  >
                    <option value="">Sin asignar</option>
                    {modelers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Observaciones Técnicas del Proyecto
                </label>
                <textarea
                  value={newDrawingObservations}
                  onChange={(e) => setNewDrawingObservations(e.target.value)}
                  placeholder="ej. Requiere validación de espesores de muros estructurales..."
                  rows={3}
                  className={`w-full border rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500 transition font-medium ${
                    isDarkMode
                      ? 'bg-[#16191D] border-white/10 text-white'
                      : 'bg-white border-slate-200 text-slate-850 shadow-sm'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDrawingFormOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    isDarkMode
                      ? 'border-white/10 hover:bg-white/5 text-slate-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold transition bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
                >
                  Guardar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING MODAL FOR DEVELOPMENT NOTES & DESIGN ISSUES */}
      {isDevNotesOpen && (() => {
        // Find the active item name and details
        let itemName = '';
        let itemCode = '';
        let itemDetail = '';
        if (activeDevNotesType === 'task') {
          const task = tasks.find(t => t.id === activeDevNotesId);
          itemName = task?.name || '';
          itemCode = task?.code || '';
          itemDetail = task?.category || '';
        } else {
          const drawing = drawings.find(d => d.id === activeDevNotesId);
          itemName = drawing?.name || '';
          itemCode = drawing?.code || '';
          itemDetail = drawing?.series || '';
        }

        // Sort entries: newest first
        const sortedEntries = [...devEntries].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
            <div className={`w-full max-w-3xl rounded-3xl p-6 border transition-all shadow-2xl flex flex-col my-8 ${
              isDarkMode 
                ? 'bg-[#0F1115] border-white/10 text-white shadow-black/90' 
                : 'bg-white border-slate-200 text-slate-800 shadow-xl shadow-slate-200'
            }`}>
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-2xl">
                    <FileText size={22} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-md font-extrabold uppercase tracking-wider flex items-center gap-2">
                      Bitácora de Diseño e Incidencias
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      {itemCode ? `[${itemCode}] ` : ''}{itemName} <span className="text-amber-500">•</span> {itemDetail}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDevNotesOpen(false)}
                  className={`p-1.5 rounded-lg transition ${
                    isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
                

                {/* 1. SECCIÓN: AÑADIR NUEVO REGISTRO */}
                <div className={`border rounded-2xl p-4 space-y-4 ${
                  isDarkMode ? 'bg-[#16191D]/40 border-white/5' : 'bg-slate-50/50 border-slate-150'
                }`}>
                  <h4 className="text-[11px] uppercase font-bold text-amber-600 dark:text-amber-500 tracking-wider">
                    + Añadir Nuevo Registro o Incidencia de Diseño:
                  </h4>

                  {/* Selector Segmentado de Tipo */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-[#0A0C0E] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewEntryType('nota')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition uppercase ${
                        newEntryType === 'nota'
                          ? 'bg-amber-500 text-black shadow'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <FileText size={14} />
                      Nota de Avance (Bitácora)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEntryType('incidencia')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition uppercase ${
                        newEntryType === 'incidencia'
                          ? 'bg-rose-500 text-white shadow'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <AlertCircle size={14} />
                      Incidencia de Diseño
                    </button>
                  </div>

                  {/* Title and Description Inputs */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                        Título (Opcional para Notas, Recomendado para Incidencias):
                      </label>
                      <input
                        type="text"
                        value={newEntryTitle}
                        onChange={(e) => setNewEntryTitle(e.target.value)}
                        placeholder={
                          newEntryType === 'nota'
                            ? "ej. Registro fotográfico de vaciado de concreto / Avance del plano..."
                            : "ej. Interferencia detectada en ducto de aire acondicionado..."
                        }
                        className={`w-full border rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none transition ${
                          newEntryType === 'incidencia'
                            ? 'focus:border-rose-500'
                            : 'focus:border-amber-500'
                        } ${
                          isDarkMode
                            ? 'bg-[#16191D] border-white/10 text-white placeholder-slate-600'
                            : 'bg-white border-slate-200 text-slate-850 placeholder-slate-400 shadow-sm'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                        Descripción detallada:
                      </label>
                      <textarea
                        value={newEntryDescription}
                        onChange={(e) => setNewEntryDescription(e.target.value)}
                        placeholder={
                          newEntryType === 'nota'
                            ? "Escribe aquí la nota de avance para el libro de anotaciones..."
                            : "Escribe aquí la incidencia de diseño que requiere resolución obligatoria..."
                        }
                        rows={3}
                        className={`w-full border rounded-xl py-2 px-3.5 text-xs focus:outline-none transition font-medium ${
                          newEntryType === 'incidencia'
                            ? 'focus:border-rose-500'
                            : 'focus:border-amber-500'
                        } ${
                          isDarkMode
                            ? 'bg-[#16191D] border-white/10 text-white placeholder-slate-600'
                            : 'bg-white border-slate-200 text-slate-850 placeholder-slate-400 shadow-sm'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Multimedia attachments specifically for this new entry */}
                  <div className="space-y-3 p-3 rounded-2xl bg-slate-100/50 dark:bg-[#0A0C0E]/30 border border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5">
                        <Paperclip size={12} />
                        Soportes y Archivos de Avance:
                      </span>
                      <div className="flex items-center gap-3">
                        {isUploading && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 animate-pulse">
                            <RefreshCw size={10} className="animate-spin" />
                            <span>Subiendo soporte...</span>
                          </div>
                        )}
                        <a
                          href="https://drive.google.com/drive/u/0/folders/1QLsbOFqJ-6DGUUutYHNsTm8wUj059BhD"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-extrabold text-amber-600 dark:text-amber-500 hover:underline uppercase flex items-center gap-1"
                        >
                          📂 Carpeta Drive
                        </a>
                      </div>
                    </div>

                    {/* Drag and Drop Zone / Classic File Uploader */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => {
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const files = Array.from(e.dataTransfer.files) as File[];
                        if (files && files.length > 0) {
                          files.forEach(file => {
                            handleAddAttachmentToNewEntry(file);
                          });
                        }
                      }}
                      onClick={() => {
                        const fileInput = document.getElementById('new-entry-file-input');
                        if (fileInput) fileInput.click();
                      }}
                      className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                        isDragging
                          ? 'border-amber-500 bg-amber-500/5'
                          : 'border-slate-300 dark:border-white/10 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="file"
                        id="new-entry-file-input"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []) as File[];
                          if (files && files.length > 0) {
                            files.forEach(file => {
                              handleAddAttachmentToNewEntry(file);
                            });
                          }
                          e.target.value = ''; // Reset file input
                        }}
                      />
                      <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 mb-2">
                        <Upload size={20} className={isUploading ? "animate-bounce" : ""} />
                      </div>
                      <span className={`text-xs font-bold text-center ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        Arrastra aquí tus fotos y videos o haz clic para buscarlos
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-center font-medium">
                        ✓ Se guardarán permanentemente en la nube
                      </span>
                    </div>

                    {/* Inline preview list of attachments of the new entry */}
                    {newEntryAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 bg-slate-100 dark:bg-[#0A0C0E]/55 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
                        {newEntryAttachments.map(att => {
                          const previewUrl = att.type === 'gdrive' ? getGoogleDrivePreviewUrl(att.url) : att.url;
                          const isGdrive = att.type === 'gdrive';
                          const isImg = att.type === 'image' || isImageFile(att.name) || (isGdrive && previewUrl);
                          const isVid = att.type === 'video' || isVideoFile(att.name);

                          return (
                            <div
                              key={att.id}
                              className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-white/10 flex items-center justify-center bg-black"
                            >
                              {isImg ? (
                                <img
                                  src={previewUrl || att.url}
                                  alt={att.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : isVid ? (
                                <Video size={20} className="text-amber-500" />
                              ) : (
                                <Paperclip size={20} className="text-amber-500" />
                              )}
                              {isGdrive && (
                                <span className="absolute bottom-0.5 right-0.5 bg-amber-500 text-black font-extrabold text-[6px] uppercase px-0.5 rounded shadow-sm">
                                  Drive
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachmentFromNewEntry(att.id)}
                                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 hover:bg-rose-600 text-white transition"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add action Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddDevEntry}
                      disabled={!newEntryDescription.trim()}
                      className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase transition-all shadow cursor-pointer ${
                        !newEntryDescription.trim()
                          ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-white/5 dark:text-slate-500'
                          : newEntryType === 'incidencia'
                          ? 'bg-rose-500 hover:bg-rose-400 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-black'
                      }`}
                    >
                      Añadir {newEntryType === 'incidencia' ? 'Incidencia' : 'Nota'}
                    </button>
                  </div>
                </div>

                {/* 2. SECCIÓN: HISTORIAL DE REGISTROS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <h4 className="text-[11px] uppercase font-extrabold text-slate-500 tracking-wider">
                      Historial de Avances y Control de Incidencias:
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500">
                      {devEntries.length} registros
                    </span>
                  </div>

                  {sortedEntries.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">
                        No hay notas de avance ni incidencias registradas para esta actividad.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedEntries.map(entry => {
                        const isIncidencia = entry.type === 'incidencia';
                        const isResolved = isIncidencia && entry.resolved;

                        return (
                          <div
                            key={entry.id}
                            className={`border rounded-2xl p-4 transition-all flex flex-col gap-3 relative overflow-hidden ${
                              isIncidencia
                                ? isResolved
                                  ? isDarkMode 
                                    ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5' 
                                    : 'bg-emerald-50/50 border-emerald-150 shadow-sm'
                                  : isDarkMode 
                                    ? 'bg-rose-500/5 border-rose-500/20 shadow-rose-500/5' 
                                    : 'bg-rose-50/50 border-rose-150 shadow-sm'
                                : isDarkMode
                                  ? 'bg-[#16191D]/25 border-white/5'
                                  : 'bg-white border-slate-200 shadow-sm'
                            }`}
                          >
                            {/* Card Header Info */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                {/* Badges */}
                                {isIncidencia ? (
                                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                    isResolved
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse'
                                  }`}>
                                    {isResolved ? 'Incidencia Resuelta' : 'Incidencia Pendiente'}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Nota de Avance
                                  </span>
                                )}

                                {/* Timestamp */}
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                  {new Date(entry.createdAt).toLocaleString('es-CO', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>

                              {/* Actions: delete entry entirely */}
                              <button
                                type="button"
                                onClick={() => handleDeleteDevEntry(entry.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                                title="Eliminar registro"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Card Content (Checkbox + Description) */}
                            <div className="flex items-start gap-3">
                              {/* If it's an incident, render a big gorgeous clickable checkbox */}
                              {isIncidencia && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleEntryResolved(entry.id)}
                                  className={`p-1 rounded-xl transition-all border shrink-0 mt-0.5 ${
                                    isResolved
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : isDarkMode
                                      ? 'border-white/20 hover:border-rose-500 text-transparent bg-[#16191D]'
                                      : 'border-slate-300 hover:border-rose-500 text-transparent bg-white'
                                  }`}
                                  title={isResolved ? "Marcar como pendiente" : "Marcar como resuelto"}
                                >
                                  <CheckSquare size={16} className={isResolved ? 'opacity-100' : 'opacity-0'} />
                                </button>
                              )}

                              {/* Description Text */}
                              <div className="flex-1">
                                {entry.title && (
                                  <h4 className={`text-xs font-black tracking-tight mb-0.5 uppercase ${
                                    isResolved
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : isDarkMode ? 'text-white' : 'text-slate-900'
                                  }`}>
                                    {entry.title}
                                  </h4>
                                )}
                                <p className={`text-xs font-semibold leading-relaxed ${
                                  isResolved
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : isDarkMode ? 'text-slate-300' : 'text-slate-650'
                                }`}>
                                  {entry.description}
                                </p>
                              </div>
                            </div>

                            {/* Attachments specific to this log card */}
                            {entry.attachments && entry.attachments.length > 0 && (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                                {entry.attachments.map(att => {
                                  const previewUrl = att.type === 'gdrive' ? getGoogleDrivePreviewUrl(att.url) : att.url;
                                  const isGdrive = att.type === 'gdrive';
                                  const isImage = att.type === 'image' || isImageFile(att.name) || (isGdrive && previewUrl);
                                  const isVideo = att.type === 'video' || isVideoFile(att.name);

                                  return (
                                    <div
                                      key={att.id}
                                      className={`relative rounded-xl border group overflow-hidden aspect-video bg-black flex flex-col items-center justify-center ${
                                        isDarkMode ? 'border-white/5' : 'border-slate-200'
                                      }`}
                                    >
                                      {isImage ? (
                                        <div className="w-full h-full relative cursor-pointer">
                                          <img
                                            src={previewUrl || att.url}
                                            alt={att.name}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                            onClick={() => {
                                              if (isGdrive) {
                                                window.open(att.url, '_blank');
                                              } else {
                                                setLightboxImage(att.url);
                                              }
                                            }}
                                          />
                                          <span className="absolute bottom-1 right-1 bg-amber-500 text-black font-extrabold text-[8px] uppercase px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                                            {isGdrive ? 'GDrive' : 'Local'} <ExternalLink size={6} />
                                          </span>
                                        </div>
                                      ) : isVideo ? (
                                        isGdrive ? (
                                          <div 
                                            onClick={() => window.open(att.url, '_blank')}
                                            className="w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-900/95 hover:bg-slate-900 text-slate-300 hover:text-white transition p-2 text-center"
                                          >
                                            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 transition">
                                              <Video size={16} />
                                            </div>
                                            <span className="text-[9px] font-bold uppercase truncate w-full px-1">
                                              {att.name}
                                            </span>
                                            <span className="text-[8px] text-slate-500 font-extrabold uppercase">
                                              Ver en Drive
                                            </span>
                                          </div>
                                        ) : (
                                          <video
                                            src={att.url}
                                            controls
                                            className="w-full h-full object-contain"
                                          />
                                        )
                                      ) : (
                                        <a
                                          href={att.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`w-full h-full p-2.5 flex flex-col items-center justify-center gap-1.5 transition text-center ${
                                            isDarkMode ? 'bg-[#16191D]/80 hover:bg-[#16191D] text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                                          }`}
                                        >
                                          <Paperclip size={18} className="text-amber-500" />
                                          <span className="text-[9px] font-bold uppercase tracking-wide truncate w-full px-1">
                                            {att.name || 'Archivo'}
                                          </span>
                                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">
                                            Ver en Drive
                                          </span>
                                        </a>
                                      )}

                                      {/* Delete attachment specifically from this card */}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAttachmentFromExistingEntry(entry.id, att.id)}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/75 text-white hover:bg-rose-600 transition shadow opacity-0 group-hover:opacity-100 duration-200 animate-fadeIn"
                                        title="Eliminar soporte"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end pt-4 mt-6 border-t border-slate-200 dark:border-white/5">
                <button
                  onClick={() => setIsDevNotesOpen(false)}
                  className="px-6 py-2.5 bg-slate-900 text-white dark:bg-amber-500 dark:text-black font-extrabold rounded-xl hover:opacity-90 transition text-xs uppercase cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX / FULL-SCREEN IMAGE PREVIEW */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition shadow-lg"
          >
            <X size={20} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Vista de soporte" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10 animate-scaleUp"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
