export interface MediaAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'gdrive';
  url: string; // Base64 encoded data to persist in localStorage, or Google Drive URL
}

export type DevLogType = 'nota' | 'incidencia';

export interface DevLogEntry {
  id: string;
  type: DevLogType;
  title?: string;
  description: string;
  resolved?: boolean; // Only for 'incidencia'
  createdAt: string;
  attachments: MediaAttachment[];
}

export interface DevNotesData {
  entries: DevLogEntry[];
}

export type BimCategory = string;

export interface Task {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  durationDays: number;
  priority: number; // 1, 2, 3...
  status: 'Realizado' | 'Modelado' | 'En desarrollo' | 'Pendiente' | 'N/A';
  assigneeId: string | null;
  scheduledStart: string | null; // YYYY-MM-DD
  scheduledEnd: string | null; // YYYY-MM-DD
  notes: string;
  targetDeliveryDate: string | null; // YYYY-MM-DD
  isDelayed: boolean;
  isParallel?: boolean;
  manualStart?: string | null; // YYYY-MM-DD
  parallelWithTaskId?: string | null;
  devNotes?: DevNotesData;
  activationTimestamp?: number;
}

export interface Modeler {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

export interface ProjectSettings {
  startDate: string; // YYYY-MM-DD
  sendToEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  autoAlerts: boolean;
}

export interface EmailLog {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
}

export interface Drawing {
  id: string;
  code: string;
  name: string;
  scale: string;
  status: 'Realizado' | 'En desarrollo' | 'Pendiente' | 'N/A';
  observations: string;
  deliveryDate: string | null; // YYYY-MM-DD
  series: string; // e.g. "SERIE 100: ARQUITECTURA GENERAL (AUT)"
  taskId?: string | null;
  assigneeId?: string | null;
  isParallel?: boolean;
  parallelWithDrawingId?: string | null;
  durationDays?: number | '';
  manualStart?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  devNotes?: DevNotesData;
  activationTimestamp?: number;
}

export interface ProjectDefinition {
  id: string;
  title: string;
  description: string;
  isDefined: boolean;
  attachments: MediaAttachment[];
  createdAt: string;
}

export interface ProjectData {
  tasks: Task[];
  modelers: Modeler[];
  settings: ProjectSettings;
  emailLogs: EmailLog[];
  drawings?: Drawing[];
  bimCategories?: string[];
  drawingSeries?: string[];
  definitions?: ProjectDefinition[];
}
