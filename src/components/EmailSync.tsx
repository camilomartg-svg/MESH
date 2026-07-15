import React, { useState } from 'react';
import { Task, Modeler, ProjectSettings, EmailLog } from '../types';
import { Mail, Settings, AlertTriangle, Play, RefreshCw, CheckCircle, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface EmailSyncProps {
  tasks: Task[];
  modelers: Modeler[];
  settings: ProjectSettings;
  emailLogs: EmailLog[];
  onUpdateSettings: (settings: ProjectSettings) => void;
  onTriggerEmail: (to: string, subject: string, body: string) => Promise<any>;
}

export default function EmailSync({
  tasks,
  modelers,
  settings,
  emailLogs,
  onUpdateSettings,
  onTriggerEmail,
}: EmailSyncProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'logs'>('status');
  
  // SMTP Local settings states for safe typing
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(settings.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(settings.smtpPass || '');
  const [sendToEmail, setSendToEmail] = useState(settings.sendToEmail || 'imagina3ddesign@gmail.com');
  const [autoAlerts, setAutoAlerts] = useState(settings.autoAlerts ?? true);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendAllState, setSendAllState] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [responseMsg, setResponseMsg] = useState<string | null>(null);

  // Filter delayed tasks
  const delayedTasks = tasks.filter((t) => t.isDelayed);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort),
      smtpUser: smtpUser.trim(),
      smtpPass: smtpPass.trim(),
      sendToEmail: sendToEmail.trim(),
      autoAlerts,
    });
    setResponseMsg('Configuración de correo guardada con éxito.');
    setTimeout(() => setResponseMsg(null), 4000);
  };

  const getModelerName = (id: string | null) => {
    const m = modelers.find((mod) => mod.id === id);
    return m ? m.name : 'No Asignado';
  };

  const triggerSingleAlert = async (task: Task) => {
    setSendingId(task.id);
    setResponseMsg(null);
    const modelerName = getModelerName(task.assigneeId);
    
    const subject = `⚠️ ALERTA DE RETRASO: Tarea de Modelado Revit - ${task.name}`;
    const body = `Estimado Coordinador BIM / Equipo de Modelado,

Se ha generado una alerta automática de retraso para la siguiente labor:

• Tarea: ${task.name}
• Categoría: ${task.category}
• Modelador Asignado: ${modelerName}
• Prioridad de Ejecución: ${task.priority}
• Días Laborales Planificados: ${task.durationDays} días

⚠️ DETALLE DE ENTREGA:
- Fecha límite comprometida: ${task.targetDeliveryDate || 'No definida'}
- Fecha estimada actual calculada: ${task.scheduledEnd || 'No programada'}

Por favor, revisen el Planificador para optimizar prioridades o redistribuir tareas en el equipo.

Saludos cordiales,
Sistema de Control y Planificación de Modelado Revit (Colombia)`;

    try {
      const res = await onTriggerEmail(sendToEmail, subject, body);
      if (res && res.success) {
        setResponseMsg(`¡Alerta enviada para "${task.name}"!`);
        if (res.previewUrl) {
          setResponseMsg(`Alerta enviada para "${task.name}". Demo link generado.`);
        }
      } else {
        setResponseMsg(`Error al enviar: ${res?.error || 'Verifica la consola.'}`);
      }
    } catch (err: any) {
      setResponseMsg(`Error: ${err?.message || 'Error de conexión.'}`);
    } finally {
      setSendingId(null);
      setTimeout(() => setResponseMsg(null), 6000);
    }
  };

  const triggerAllAlerts = async () => {
    if (delayedTasks.length === 0) return;
    setSendAllState('sending');
    setResponseMsg(null);

    let successCount = 0;
    for (const task of delayedTasks) {
      const modelerName = getModelerName(task.assigneeId);
      const subject = `⚠️ ALERTA GENERAL DE RETRASO: ${task.name}`;
      const body = `Se reporta retraso en el flujo de modelado:
Labor: ${task.name}
Asignado: ${modelerName}
Entrega Prevista: ${task.targetDeliveryDate || 'N/A'}
Calendario Calculado: ${task.scheduledEnd || 'N/A'}`;

      try {
        await onTriggerEmail(sendToEmail, subject, body);
        successCount++;
      } catch (e) {
        console.error('Error in batch email:', e);
      }
    }

    setSendAllState('success');
    setResponseMsg(`Se enviaron ${successCount} correos de alerta a ${sendToEmail}.`);
    setTimeout(() => {
      setSendAllState('idle');
      setResponseMsg(null);
    }, 6000);
  };

  return (
    <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl">
            <Mail size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Sincronización de Correo y Alertas</h2>
            <p className="text-xs text-slate-500">
              Administra el envío automático de notificaciones de retraso a tu email ante diferencias de calendario.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 p-1 border border-white/10 rounded-xl self-start lg:self-center">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'status' ? 'bg-[#16191D] text-white border border-white/10 shadow-sm' : 'text-slate-500 hover:text-white'
            }`}
          >
            Tareas Retrasadas ({delayedTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'config' ? 'bg-[#16191D] text-white border border-white/10 shadow-sm' : 'text-slate-500 hover:text-white'
            }`}
          >
            Configuración Correo (SMTP)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'logs' ? 'bg-[#16191D] text-white border border-white/10 shadow-sm' : 'text-slate-500 hover:text-white'
            }`}
          >
            Historial de Envíos ({emailLogs.length})
          </button>
        </div>
      </div>

      {responseMsg && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium rounded-xl flex items-center gap-2">
          <CheckCircle size={14} />
          <span>{responseMsg}</span>
        </div>
      )}

      {/* VIEW: STATUS / DELAYED TASKS */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-2.5 text-xs text-rose-200">
              <AlertTriangle className="text-rose-500 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-rose-300">Retrasos detectados en el cronograma</p>
                <p className="text-slate-400 mt-0.5">
                  Hay <strong className="text-white">{delayedTasks.length} labores</strong> que no se entregarán a tiempo según sus prioridades y días laborables calculados.
                </p>
              </div>
            </div>
            {delayedTasks.length > 0 && (
              <button
                onClick={triggerAllAlerts}
                disabled={sendAllState === 'sending'}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50"
              >
                <Play size={13} />
                {sendAllState === 'sending' ? 'Enviando...' : 'Enviar Alertas Generales'}
              </button>
            )}
          </div>

          {delayedTasks.length > 0 ? (
            <div className="border border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="text-[10px] uppercase font-bold text-slate-400 bg-[#16191D] border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3">Prioridad / Labor</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3">Modelador</th>
                      <th className="px-4 py-3">Entrega Límite</th>
                      <th className="px-4 py-3">Cálculo Calendario</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {delayedTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px]">
                              {task.priority}
                            </span>
                            <span className="font-semibold text-white">{task.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-400">{task.category}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-300">
                          {getModelerName(task.assigneeId)}
                        </td>
                        <td className="px-4 py-3.5 text-rose-400 font-bold">
                          {task.targetDeliveryDate || 'Sin fecha'}
                        </td>
                        <td className="px-4 py-3.5 text-amber-400 font-semibold">
                          📅 {task.scheduledEnd}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => triggerSingleAlert(task)}
                            disabled={sendingId === task.id}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg text-[10px] font-bold transition disabled:opacity-50"
                          >
                            {sendingId === task.id ? 'Enviando...' : 'Enviar Alerta'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-[#0A0A0C] rounded-2xl border border-white/5">
              <CheckCircle className="text-emerald-500 mx-auto mb-2.5 animate-pulse" size={32} />
              <p className="text-sm font-semibold text-white">¡Cronograma al día!</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No hay labores retrasadas detectadas. Todas las fechas calculadas por el calendario cumplen con los plazos comprometidos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW: CONFIGURATION / SMTP SETTINGS */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl text-xs text-slate-300">
          <div className="p-3 bg-emerald-500/5 text-emerald-300 border border-emerald-500/20 rounded-xl flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
            <span>
              <strong>Por defecto, las alertas de demo son funcionales y seguras.</strong> Si no ingresas credenciales, se usará una cuenta segura de simulación de Ethereal con enlaces visuales interactivos.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Enviar Notificaciones A (Email)
              </label>
              <input
                type="email"
                required
                value={sendToEmail}
                onChange={(e) => setSendToEmail(e.target.value)}
                className="w-full px-3 py-2 border border-white/10 bg-[#16191D] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-1">Correo de recepción del Coordinador BIM.</p>
            </div>

            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAlerts}
                  onChange={(e) => setAutoAlerts(e.target.checked)}
                  className="rounded border-white/10 bg-[#16191D] text-amber-500 focus:ring-amber-500"
                />
                <span className="font-semibold text-slate-300">¿Alertas automáticas en segundo plano?</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
              <Settings size={14} className="text-amber-500" /> Configuración SMTP Personalizada (Opcional)
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Servidor de Correo (SMTP Host)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3 py-2 border border-white/10 bg-[#16191D] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Puerto SMTP
                  </label>
                  <input
                    type="number"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-white/10 bg-[#16191D] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Usuario SMTP (Email)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: micorreo@gmail.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full px-3 py-2 border border-white/10 bg-[#16191D] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Contraseña de Aplicación / SMTP
                  </label>
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full px-3 py-2 border border-white/10 bg-[#16191D] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-white hover:bg-slate-200 text-black font-extrabold uppercase tracking-widest text-xs rounded-xl transition shadow-md shadow-white/5"
            >
              Guardar Configuración
            </button>
          </div>
        </form>
      )}

      {/* VIEW: LOGS / HISTORY OF EMAILS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Mostrando últimos envíos de alerta</span>
            <span className="text-[10px] text-slate-500 italic">Sincronizado localmente con el servidor</span>
          </div>

          {emailLogs.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {emailLogs.map((log) => (
                <div key={log.id} className="p-4 bg-[#16191D] border border-white/10 rounded-2xl text-xs space-y-2 hover:bg-white/5 transition">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-500 font-mono">
                      📅 {new Date(log.timestamp).toLocaleString('es-CO')}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[9px] ${
                      log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {log.status === 'sent' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {log.status === 'sent' ? 'Enviado' : 'Fallido'}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-white block">Asunto: {log.subject}</span>
                    <span className="text-slate-400 font-medium mt-0.5 block">Destinatario: {log.to}</span>
                  </div>

                  <p className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap bg-[#0A0A0C] border border-white/10 p-2.5 rounded-lg max-h-24 overflow-y-auto">
                    {log.body}
                  </p>

                  {/* If ethereal link generated */}
                  {log.errorMessage && log.errorMessage.includes('ethereal.email') && (
                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Bandeja de Entrada de Prueba (Ethereal):</span>
                      <a
                        href={log.errorMessage.split('aquí: ')[1] || '#'}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold text-[10px] hover:underline"
                      >
                        Abrir Demo Inbox <ExternalLink size={10} />
                      </a>
                    </div>
                  )}

                  {log.status === 'failed' && (
                    <p className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded-lg font-mono border border-rose-500/20">
                      Error: {log.errorMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#0A0A0C] rounded-2xl border border-white/5">
              <Mail className="text-slate-600 mx-auto mb-2" size={32} />
              <p className="text-sm font-semibold text-white">Sin historial de envío</p>
              <p className="text-xs text-slate-500 mt-1">
                Las alertas enviadas de forma manual o automática aparecerán aquí en orden cronológico.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
