import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { ProjectData } from './src/types';
import { DEFAULT_PROJECT_DATA } from './src/utils/defaultData';

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'project_data.json');

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Initialize project data if it doesn't exist
function loadProjectData(): ProjectData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading project data file:', error);
  }
  return DEFAULT_PROJECT_DATA;
}

function saveProjectData(data: ProjectData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing project data file:', error);
  }
}

// API Routes
app.get('/api/project', (req, res) => {
  const data = loadProjectData();
  res.json(data);
});

app.post('/api/project', (req, res) => {
  const data = req.body as ProjectData;
  saveProjectData(data);
  res.json({ success: true, message: 'Datos de proyecto guardados exitosamente.' });
});

// Send email endpoint supporting both user SMTP configuration and direct fallback
app.post('/api/send-email', async (req, res) => {
  const { to, subject, body, smtpSettings } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ success: false, error: 'Faltan campos obligatorios: to, subject, body' });
  }

  let transporter;
  const hasSmtpConfig = smtpSettings && smtpSettings.smtpHost && smtpSettings.smtpUser && smtpSettings.smtpPass;

  try {
    if (hasSmtpConfig) {
      // Use user's custom SMTP configuration
      transporter = nodemailer.createTransport({
        host: smtpSettings.smtpHost,
        port: Number(smtpSettings.smtpPort) || 587,
        secure: Number(smtpSettings.smtpPort) === 465,
        auth: {
          user: smtpSettings.smtpUser,
          pass: smtpSettings.smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log(`Sending email using custom SMTP: ${smtpSettings.smtpHost}`);
    } else {
      // Fallback: Use direct transport or mock/etheral
      // Direct transport sends directly to the recipient's MX server.
      // For reliable local dev preview, we can create a test ethereal account or mock successful log
      // Let's create an Ethereal Account dynamically if no custom SMTP is specified so the user gets a working preview link!
      // This is extremely premium!
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`Sending email via Ethereal fallback account: ${testAccount.user}`);
    }

    const mailOptions = {
      from: hasSmtpConfig ? `"Planificador Revit" <${smtpSettings.smtpUser}>` : '"Planificador Revit (Demo)" <demo-planificador-revit@ethereal.email>',
      to,
      subject,
      html: body.replace(/\n/g, '<br>'),
    };

    const info = await transporter.sendMail(mailOptions);
    
    let previewUrl = null;
    if (!hasSmtpConfig) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`Email sent successfully to ethereal. Preview URL: ${previewUrl}`);
    }

    // Save this log into project_data.json
    const projectData = loadProjectData();
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      to,
      subject,
      body,
      status: 'sent' as const,
      errorMessage: previewUrl ? `Ver bandeja de entrada demo aquí: ${previewUrl}` : null,
    };
    projectData.emailLogs = [newLog, ...(projectData.emailLogs || [])];
    saveProjectData(projectData);

    return res.json({
      success: true,
      message: 'Correo enviado con éxito.',
      messageId: info.messageId,
      previewUrl,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    // Save failed log
    const projectData = loadProjectData();
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      to,
      subject,
      body,
      status: 'failed' as const,
      errorMessage: error?.message || String(error),
    };
    projectData.emailLogs = [newLog, ...(projectData.emailLogs || [])];
    saveProjectData(projectData);

    return res.status(500).json({
      success: false,
      error: 'No se pudo enviar el correo.',
      details: error?.message || String(error),
    });
  }
});

// Setup dev server or static distribution serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
