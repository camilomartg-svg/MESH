export type BimCategory =
  | 'ELEMENTOS ESTRUCTURALES'
  | 'ENVOLVENTE ARQUITECTÓNICA'
  | 'DIVISIONES INTERIORES'
  | 'CIRCULACIÓN Y SEGURIDAD'
  | 'REMATES Y EXTERIORES';

export interface Task {
  id: string;
  name: string;
  category: BimCategory;
  description: string;
  durationDays: number;
  priority: number; // 1, 2, 3...
  status: 'Modelado' | 'Pendiente' | 'N/A';
  assigneeId: string | null;
  scheduledStart: string | null; // YYYY-MM-DD
  scheduledEnd: string | null; // YYYY-MM-DD
  notes: string;
  targetDeliveryDate: string | null; // YYYY-MM-DD
  isDelayed: boolean;
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
  status: 'Realizado' | 'Pendiente' | 'N/A';
  observations: string;
  deliveryDate: string | null; // YYYY-MM-DD
  series: string; // e.g. "SERIE 100: ARQUITECTURA GENERAL (AUT)"
}

export interface ProjectData {
  tasks: Task[];
  modelers: Modeler[];
  settings: ProjectSettings;
  emailLogs: EmailLog[];
  drawings?: Drawing[];
}
