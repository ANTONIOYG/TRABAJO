import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import dotenv from 'dotenv';
import {
  initMySQL,
  getMySQLStatus,
  testMySQLConnection,
  migrateDataToMySQL,
  getMySQLAllData,
  saveMySQLEmployee,
  deleteMySQLEmployee,
  saveMySQLLog,
  deleteMySQLLog,
  saveMySQLSettings,
  exportMySQLDump,
} from './mysql.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const ENV_FILE = path.resolve(__dirname, '..', '.env');
const LEGACY_DB_FILE = path.resolve(__dirname, '..', 'database.json');

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper: Update .env file with new variables
async function updateEnvFile(updates: Record<string, string>) {
  try {
    let content = '';
    try {
      content = await fs.readFile(ENV_FILE, 'utf-8');
    } catch {
      content = '';
    }

    const lines = content.split(/\r?\n/);
    const updatedKeys = new Set<string>();

    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) return line;
      const key = line.substring(0, eqIdx).trim();
      if (key in updates) {
        updatedKeys.add(key);
        return `${key}=${updates[key]}`;
      }
      return line;
    });

    for (const [key, val] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}=${val}`);
      }
    }

    await fs.writeFile(ENV_FILE, newLines.join('\n'), 'utf-8');
  } catch (err) {
    console.warn('No se pudo escribir en el archivo .env', err);
  }
}

// ================= API ENDPOINTS (EXCLUSIVO MYSQL EXTERNA) =================

// 1. Obtener todos los datos desde MySQL externa
app.get('/api/data', async (_req: Request, res: Response) => {
  try {
    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({
        success: false,
        error: 'No hay conexión con la base de datos MySQL externa. Verifique las credenciales en Ajustes o en el archivo .env.',
      });
      return;
    }

    const mysqlData = await getMySQLAllData();
    if (!mysqlData) {
      res.status(500).json({ success: false, error: 'Error al recuperar los datos desde la base de datos MySQL' });
      return;
    }

    res.json({
      success: true,
      source: 'mysql',
      data: mysqlData,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Guardar todos los datos (Sincronización directa en MySQL)
app.post('/api/data', async (req: Request, res: Response) => {
  try {
    const dbData = req.body;
    if (!dbData || !Array.isArray(dbData.employees) || !Array.isArray(dbData.logs)) {
      res.status(400).json({ success: false, error: 'Formato de base de datos inválido' });
      return;
    }

    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({
        success: false,
        error: 'No se pueden guardar los datos: Base de datos MySQL externa desconectada.',
      });
      return;
    }

    const mysqlResult = await migrateDataToMySQL(dbData);

    res.json({
      success: true,
      data: dbData,
      source: 'mysql',
      mysqlResult,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Obtener registros de jornada desde MySQL
app.get('/api/logs', async (_req: Request, res: Response) => {
  try {
    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({ success: false, error: 'MySQL externa desconectada', logs: [] });
      return;
    }

    const data = await getMySQLAllData();
    res.json({ success: true, logs: data?.logs || [], source: 'mysql' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Crear o actualizar un registro de jornada directamente en MySQL
app.post('/api/logs', async (req: Request, res: Response) => {
  try {
    const log = req.body;
    if (!log || !log.employeeId || !log.date) {
      res.status(400).json({ success: false, error: 'Datos de jornada incompletos' });
      return;
    }

    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({ success: false, error: 'No se puede guardar: Base de datos MySQL externa desconectada' });
      return;
    }

    const savedLog = await saveMySQLLog(log);
    if (!savedLog) {
      res.status(500).json({ success: false, error: 'Error al registrar la jornada en MySQL' });
      return;
    }

    res.json({
      success: true,
      log: savedLog,
      source: 'mysql',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Eliminar registro de jornada directamente en MySQL
app.delete('/api/logs/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);

    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({ success: false, error: 'Base de datos MySQL externa desconectada' });
      return;
    }

    await deleteMySQLLog(id);
    res.json({ success: true, message: 'Registro de jornada eliminado con éxito en MySQL' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Obtener empleados desde MySQL
app.get('/api/employees', async (_req: Request, res: Response) => {
  try {
    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({ success: false, error: 'MySQL externa desconectada', employees: [] });
      return;
    }

    const data = await getMySQLAllData();
    res.json({ success: true, employees: data?.employees || [], source: 'mysql' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Crear o actualizar empleado directamente en MySQL
app.post('/api/employees', async (req: Request, res: Response) => {
  try {
    const employee = req.body;
    if (!employee || !employee.name || !employee.dni) {
      res.status(400).json({ success: false, error: 'Nombre y DNI del empleado requeridos' });
      return;
    }

    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({ success: false, error: 'No se puede guardar: Base de datos MySQL externa desconectada' });
      return;
    }

    const savedEmp = await saveMySQLEmployee(employee);
    if (!savedEmp) {
      res.status(500).json({ success: false, error: 'Error al registrar empleado en MySQL' });
      return;
    }

    res.json({
      success: true,
      employee: savedEmp,
      source: 'mysql',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Eliminar empleado directamente en MySQL
app.delete('/api/employees/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);

    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({ success: false, error: 'Base de datos MySQL externa desconectada' });
      return;
    }

    await deleteMySQLEmployee(id);
    res.json({ success: true, message: 'Empleado y registros asociados eliminados con éxito en MySQL' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Actualizar ajustes generales directamente en MySQL
app.post('/api/settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({ success: false, error: 'No se pueden guardar ajustes: MySQL externa desconectada' });
      return;
    }

    await saveMySQLSettings(settings);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= ENDPOINTS MYSQL GESTIÓN =================

// 10. Consultar estado actual de conexión MySQL
app.get('/api/mysql/status', (_req: Request, res: Response) => {
  res.json({ success: true, status: getMySQLStatus() });
});

// 11. Probar conexión a cualquier servidor MySQL externo
app.post('/api/mysql/test', async (req: Request, res: Response) => {
  try {
    const result = await testMySQLConnection(req.body);
    res.json(result);
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// 12. Conectar y guardar nueva configuración de MySQL
app.post('/api/mysql/connect', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database, ssl, enabled, migrateCurrentData } = req.body;

    const envUpdates: Record<string, string> = {
      MYSQL_ENABLED: enabled !== false ? 'true' : 'false',
      MYSQL_HOST: host || 'localhost',
      MYSQL_PORT: String(port || 3306),
      MYSQL_USER: user || 'root',
      MYSQL_DATABASE: database || 'worklog_pro',
      MYSQL_SSL: ssl ? 'true' : 'false',
    };

    if (typeof password === 'string') {
      envUpdates.MYSQL_PASSWORD = password;
    }

    // Guardar en .env
    await updateEnvFile(envUpdates);

    // Intentar conectar con la nueva configuración
    const ok = await initMySQL({
      enabled: enabled !== false,
      host,
      port: Number(port) || 3306,
      user,
      password: typeof password === 'string' ? password : process.env.MYSQL_PASSWORD || '',
      database,
      ssl: Boolean(ssl),
    });

    let migrationResult = null;
    if (ok && migrateCurrentData) {
      try {
        const fileContent = await fs.readFile(LEGACY_DB_FILE, 'utf-8');
        const legacyData = JSON.parse(fileContent);
        if (legacyData && Array.isArray(legacyData.employees)) {
          migrationResult = await migrateDataToMySQL(legacyData);
        }
      } catch (mErr: any) {
        console.warn('Migración opcional de database.json omitida o no encontrada:', mErr.message);
      }
    }

    const status = getMySQLStatus();

    res.json({
      success: ok,
      status,
      migrationResult,
      message: ok
        ? `¡Conexión establecida con MySQL externa (${host}:${port}/${database})!`
        : `No se pudo conectar a MySQL externa: ${status.error}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Migrar datos locales previos (database.json) a MySQL externa
app.post('/api/mysql/migrate', async (req: Request, res: Response) => {
  try {
    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({ success: false, error: 'MySQL externa no está conectada' });
      return;
    }

    let dataToMigrate = req.body;
    // Si no se pasaron datos en el cuerpo, leer del archivo database.json local si existe
    if (!dataToMigrate || !Array.isArray(dataToMigrate.employees)) {
      try {
        const fileContent = await fs.readFile(LEGACY_DB_FILE, 'utf-8');
        dataToMigrate = JSON.parse(fileContent);
      } catch {
        res.status(404).json({ success: false, error: 'No se encontraron datos en database.json para migrar.' });
        return;
      }
    }

    const result = await migrateDataToMySQL(dataToMigrate);
    res.json({ success: true, result, message: 'Datos migrados a MySQL externa con éxito' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Enviar Reporte por Email con archivo Excel .xlsx adjunto
app.post('/api/send-email', async (req: Request, res: Response) => {
  try {
    const { recipient, subject, text, filename, fileBase64 } = req.body;
    const targetEmail = recipient || process.env.DEFAULT_RECIPIENT_EMAIL || 'antonioyg@gmail.com';

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const isPlaceholderPass = !pass || pass.includes('tu_contraseña') || pass.includes('placeholder') || pass === 'tu_correo@gmail.com';

    if (!user || isPlaceholderPass) {
      res.json({
        success: true,
        simulated: true,
        message: `Reporte Excel (${filename || 'WorkLog_Reporte.xlsx'}) preparado y simulado para enviar a ${targetEmail}.`,
        recipient: targetEmail,
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const mailOptions: any = {
      from: `"WorkLog Pro" <${user}>`,
      to: targetEmail,
      subject: subject || `Reporte Mensual de Jornadas y Horas Extras - ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
      text: text || `Adjuntamos el informe consolidado de jornadas y horas extras en formato Excel nativo (.xlsx).\n\nGenerado automáticamente por WorkLog Pro.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 24px; color: white;">
            <h1 style="margin: 0; font-size: 22px;">WorkLog Pro</h1>
            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Reporte Mensual de Control de Horarios</p>
          </div>
          <div style="padding: 24px; color: #334155;">
            <p>Estimado/a Administrador/a,</p>
            <p>Se ha generado el informe mensual de jornadas, horas ordinarias y horas extras en formato Excel nativo (<strong>.xlsx</strong>), compatible al 100% con Microsoft Excel y Google Drive/Sheets.</p>
            <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <strong>Archivo adjunto:</strong> ${filename || 'WorkLog_Reporte.xlsx'}<br/>
              <strong>Fecha de emisión:</strong> ${new Date().toLocaleString('es-ES')}
            </div>
            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">Este correo ha sido generado automáticamente por el sistema de WorkLog Pro.</p>
          </div>
        </div>
      `,
    };

    if (fileBase64 && filename) {
      mailOptions.attachments = [
        {
          filename,
          content: fileBase64,
          encoding: 'base64',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      messageId: info.messageId,
      message: `Correo enviado exitosamente a ${targetEmail} con el archivo ${filename} adjunto.`,
      recipient: targetEmail,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Enviar notificación por WhatsApp (Twilio)
app.post('/api/send-whatsapp', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    const targetTo = to || process.env.WHATSAPP_TO_NUMBER || '+34600000000';

    if (!accountSid || !authToken) {
      res.json({
        success: true,
        simulated: true,
        message: `Mensaje de WhatsApp preparado y simulado para enviar a ${targetTo}.`,
        to: targetTo,
        content: message,
      });
      return;
    }

    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: message || 'WorkLog Pro: Notificación de jornada y control horario generada.',
      from: fromWhatsApp,
      to: targetTo.startsWith('whatsapp:') ? targetTo : `whatsapp:${targetTo}`,
    });

    res.json({
      success: true,
      sid: result.sid,
      message: `Mensaje de WhatsApp enviado correctamente a ${targetTo}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Exportar copia de seguridad en formato SQL generado en vivo directamente desde MySQL
app.get('/api/export-sql', async (_req: Request, res: Response) => {
  try {
    const mysqlStatus = getMySQLStatus();
    if (!mysqlStatus.connected) {
      res.status(503).json({
        success: false,
        error: 'No se puede exportar: La base de datos MySQL externa no está conectada.',
      });
      return;
    }

    const sql = await exportMySQLDump();
    const filename = `WorkLog_MySQL_Backup_${Date.now()}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sql);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Obtener información de red local e IP para conexión móvil
app.get('/api/network-info', (_req: Request, res: Response) => {
  try {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (iface) {
        for (const alias of iface) {
          if (alias.family === 'IPv4' && !alias.internal) {
            ips.push(alias.address);
          }
        }
      }
    }
    const primaryIp = ips[0] || 'localhost';
    res.json({
      success: true,
      primaryIp,
      ips,
      frontendPort: 5173,
      backendPort: PORT,
      mobileUrl: `http://${primaryIp}:5173`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. Servir frontend estático si la carpeta dist existe (Producción)
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('WorkLog Pro API Server está corriendo. Acceda al frontend en http://localhost:5173');
    }
  });
});

// Inicialización del servidor y conexión exclusiva a MySQL externa
app.listen(PORT, async () => {
  console.log(`🚀 Servidor WorkLog Pro ejecutándose en http://localhost:${PORT}`);
  console.log(`🔌 Motor de persistencia: Base de datos MySQL externa exclusiva.`);
  try {
    const mysqlOk = await initMySQL();
    if (mysqlOk) {
      const status = getMySQLStatus();
      console.log(`✅ Conexión con MySQL externa establecida con éxito [${status.host}:${status.port}/${status.database}]`);
    } else {
      console.warn('⚠️ No se pudo establecer conexión con MySQL externa. Verifique las credenciales en .env o desde los Ajustes.');
    }
  } catch (e: any) {
    console.warn('⚠️ Error al inicializar MySQL externa:', e.message);
  }
});
