import React, { useState } from 'react';
import { Task, Drawing, ProjectDefinition, DevLogEntry, MediaAttachment } from '../types';
import { FileText, AlertCircle, CheckCircle2, Circle, Upload, Paperclip, X, Image as ImageIcon, Video, Plus, Save, ExternalLink } from 'lucide-react';
import { uploadFileToDrive } from '../utils/firebase';

interface DefinitionsTabProps {
  tasks: Task[];
  drawings: Drawing[];
  definitions: ProjectDefinition[];
  onUpdateDefinitions: (defs: ProjectDefinition[]) => void;
  isDarkMode: boolean;
}

export default function DefinitionsTab({ tasks, drawings, definitions, onUpdateDefinitions, isDarkMode }: DefinitionsTabProps) {
  // Aggregate all notes and incidents
  const allNotes: { source: string; entry: DevLogEntry }[] = [];
  
  tasks.forEach(t => {
    if (t.devNotes?.entries) {
      t.devNotes.entries.forEach(e => allNotes.push({ source: `[Tarea] ${t.code} - ${t.name}`, entry: e }));
    }
  });

  drawings.forEach(d => {
    if (d.devNotes?.entries) {
      d.devNotes.entries.forEach(e => allNotes.push({ source: `[Plano] ${d.code} - ${d.name}`, entry: e }));
    }
  });

  // Sort notes by date descending
  allNotes.sort((a, b) => new Date(b.entry.createdAt).getTime() - new Date(a.entry.createdAt).getTime());

  const [newDefTitle, setNewDefTitle] = useState('');
  const [newDefDesc, setNewDefDesc] = useState('');
  const [newDefAttachments, setNewDefAttachments] = useState<MediaAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const newAtts: MediaAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`El archivo ${file.name} supera los 5MB.`);
        }
        const uploaded = await uploadFileToDrive(file);
        newAtts.push(uploaded);
      }
      setNewDefAttachments(prev => [...prev, ...newAtts]);
    } catch (err: any) {
      setUploadError(err.message || 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddDefinition = () => {
    if (!newDefTitle.trim()) return;

    const newDef: ProjectDefinition = {
      id: 'def_' + Date.now(),
      title: newDefTitle.trim(),
      description: newDefDesc.trim(),
      isDefined: false,
      attachments: newDefAttachments,
      createdAt: new Date().toISOString()
    };

    onUpdateDefinitions([newDef, ...definitions]);
    setNewDefTitle('');
    setNewDefDesc('');
    setNewDefAttachments([]);
  };

  const handleToggleDefinition = (id: string) => {
    const updated = definitions.map(d => {
      if (d.id === id) return { ...d, isDefined: !d.isDefined };
      return d;
    });
    onUpdateDefinitions(updated);
  };

  const handleDeleteDefinition = (id: string) => {
    if (!window.confirm('¿Eliminar esta definición?')) return;
    const updated = definitions.filter(d => d.id !== id);
    onUpdateDefinitions(updated);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* SECTION 1: DEFINITIONS */}
      <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-[#0F1115] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <FileText size={20} />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Definiciones Pendientes
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Lista de decisiones o parámetros que deben aclararse para avanzar con el proyecto.
            </p>
          </div>
        </div>

        {/* Add new definition form */}
        <div className={`mb-8 p-4 rounded-xl border ${isDarkMode ? 'bg-[#16181D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={newDefTitle}
              onChange={(e) => setNewDefTitle(e.target.value)}
              placeholder="Ej. Espesor de vidrio para fachada, Tipo de luminaria pasillos..."
              className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all ${
                isDarkMode 
                  ? 'bg-black/20 border border-white/10 text-white focus:border-indigo-500/50 focus:bg-black/40' 
                  : 'bg-white border border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
              }`}
            />
            <textarea
              value={newDefDesc}
              onChange={(e) => setNewDefDesc(e.target.value)}
              placeholder="Describe cuál fue la definición o detalles adicionales (opcional)..."
              rows={2}
              className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all resize-none ${
                isDarkMode 
                  ? 'bg-black/20 border border-white/10 text-white focus:border-indigo-500/50 focus:bg-black/40' 
                  : 'bg-white border border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
              }`}
            />
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isDarkMode 
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300' 
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                  {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Paperclip size={16} />}
                  <span>{isUploading ? 'Subiendo...' : 'Adjuntar Archivos'}</span>
                </label>

                {newDefAttachments.length > 0 && (
                  <span className={`text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {newDefAttachments.length} archivo(s) listo(s)
                  </span>
                )}
                {uploadError && (
                  <span className="text-sm text-rose-500">{uploadError}</span>
                )}
              </div>

              <button
                onClick={handleAddDefinition}
                disabled={!newDefTitle.trim() || isUploading}
                className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={16} />
                Añadir Definición
              </button>
            </div>
          </div>
        </div>

        {/* Definitions List */}
        <div className="space-y-4">
          {definitions.length === 0 ? (
            <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No hay definiciones registradas.
            </div>
          ) : (
            definitions.map(def => (
              <div key={def.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                def.isDefined
                  ? (isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200')
                  : (isDarkMode ? 'bg-[#16181D] border-white/5' : 'bg-slate-50 border-slate-200')
              }`}>
                <button
                  onClick={() => handleToggleDefinition(def.id)}
                  className={`mt-1 shrink-0 ${def.isDefined ? 'text-emerald-500' : (isDarkMode ? 'text-slate-600' : 'text-slate-300')}`}
                >
                  {def.isDefined ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className={`font-bold text-base ${def.isDefined && !isDarkMode ? 'text-emerald-900' : (isDarkMode ? 'text-white' : 'text-slate-900')} ${def.isDefined ? 'line-through opacity-70' : ''}`}>
                      {def.title}
                    </h3>
                    <button
                      onClick={() => handleDeleteDefinition(def.id)}
                      className={`shrink-0 p-1 rounded-lg transition-colors ${
                        isDarkMode ? 'text-slate-500 hover:bg-white/10 hover:text-rose-400' : 'text-slate-400 hover:bg-slate-200 hover:text-rose-500'
                      }`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {def.description && (
                    <p className={`mt-2 text-sm whitespace-pre-wrap ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {def.description}
                    </p>
                  )}

                  {def.attachments?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {def.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            isDarkMode 
                              ? 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/10' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {att.type === 'image' ? <ImageIcon size={14} /> : att.type === 'video' ? <Video size={14} /> : <FileText size={14} />}
                          <span className="truncate max-w-[150px]">{att.name}</span>
                          <ExternalLink size={12} className="opacity-50" />
                        </a>
                      ))}
                    </div>
                  )}
                  
                  <div className={`mt-3 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Añadido el {new Date(def.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: CONSOLIDADO DE NOTAS E INCIDENCIAS */}
      <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-[#0F1115] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <AlertCircle size={20} />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Resumen de Notas e Incidencias
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Consolidado de todas las notas e incidencias registradas en Tareas y Planos.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {allNotes.length === 0 ? (
            <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No hay notas ni incidencias registradas en el proyecto.
            </div>
          ) : (
            allNotes.map((item, index) => {
              const isIncidencia = item.entry.type === 'incidencia';
              return (
                <div key={index} className={`flex flex-col gap-2 p-4 rounded-xl border ${
                  isDarkMode 
                    ? (isIncidencia ? 'bg-rose-500/5 border-rose-500/20' : 'bg-[#16181D] border-white/5')
                    : (isIncidencia ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200')
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isIncidencia
                          ? (isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700')
                          : (isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700')
                      }`}>
                        {item.entry.type}
                      </span>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.source}
                      </span>
                    </div>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {new Date(item.entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {item.entry.title && (
                    <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {item.entry.title}
                    </h4>
                  )}
                  
                  <p className={`text-sm whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {item.entry.description}
                  </p>

                  {item.entry.attachments?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.entry.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                            isDarkMode 
                              ? 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/10' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Paperclip size={12} />
                          <span className="truncate max-w-[100px]">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
