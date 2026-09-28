import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MySQLConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

/**
 * Retorna fecha y hora actual en formato local estándar: YYYY-MM-DD HH:mm:ss
 */
export function getLocalTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Convierte cualquier fecha (ISO UTC u otro) a formato local estándar YYYY-MM-DD HH:mm:ss
 */
export function formatToLocalTimestamp(dateInput?: string | Date | null): string {
  if (!dateInput) return getLocalTimestamp();
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  return getLocalTimestamp(d);
}

export interface MySQLStatus {
  connected: boolean;
  configured: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  lastChecked: string;
  error?: string;
  tables?: {
    employees: number;
    logs: number;
  };
}

let pool: mysql.Pool | null = null;
let currentConfig: MySQLConfig = loadConfigFromEnv();
let connectionStatus: MySQLStatus = {
  connected: false,
  configured: false,
  host: currentConfig.host,
  port: currentConfig.port,
  database: currentConfig.database,
  user: currentConfig.user,
  ssl: currentConfig.ssl,
  lastChecked: new Date().toISOString(),
};

function loadConfigFromEnv(): MySQLConfig {
  const host = process.env.MYSQL_HOST || 'localhost';
  const enabled = process.env.MYSQL_ENABLED !== 'false';
  
  return {
    enabled,
    host,
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'worklog_pro',
    ssl: process.env.MYSQL_SSL === 'true' || process.env.MYSQL_SSL === '1',
  };
}

/**
 * Retorna las opciones de conexión para mysql2
 */
function getConnectionOptions(cfg: MySQLConfig) {
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    decimalNumbers: true,
  };
}

/**
 * Inicializa la conexión y crea la estructura si no existe
 */
export async function initMySQL(customConfig?: Partial<MySQLConfig>): Promise<boolean> {
  if (customConfig) {
    currentConfig = { ...currentConfig, ...customConfig };
  }

  connectionStatus.configured = Boolean(currentConfig.host && currentConfig.database);
  connectionStatus.host = currentConfig.host;
  connectionStatus.port = currentConfig.port;
  connectionStatus.database = currentConfig.database;
  connectionStatus.user = currentConfig.user;
  connectionStatus.ssl = currentConfig.ssl;
  connectionStatus.lastChecked = new Date().toISOString();

  if (!currentConfig.enabled) {
    console.log('ℹ️ MySQL: Deshabilitado en configuración (utilizando almacenamiento JSON).');
    connectionStatus.connected = false;
    connectionStatus.error = 'MySQL deshabilitado en configuración (MYSQL_ENABLED=false)';
    return false;
  }

  try {
    // 1. Verificar si la base de datos existe o crearla
    try {
      const rootConn = await mysql.createConnection({
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        password: currentConfig.password,
        ssl: currentConfig.ssl ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 7000,
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${currentConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await rootConn.end();
    } catch (createDbErr: any) {
      // Si no tenemos permiso para CREATE DATABASE (típico en hostings compartidos donde la BD ya está creada), continuamos
      console.log(`ℹ️ MySQL: Conectando directamente a la base de datos '${currentConfig.database}'...`);
    }

    // 2. Crear pool a la base de datos
    if (pool) {
      await pool.end().catch(() => {});
    }

    pool = mysql.createPool(getConnectionOptions(currentConfig));

    // Test de conexión simple
    const [testRes] = await pool.query('SELECT 1 as is_alive');
    if (!testRes) {
      throw new Error('No se recibió respuesta del servidor MySQL');
    }

    // 3. Crear tablas si no existen
    await createTablesIfNotExist();

    // 4. Actualizar estado
    const counts = await getTableCounts();
    connectionStatus.connected = true;
    connectionStatus.error = undefined;
    connectionStatus.tables = counts;
    console.log(`✅ MySQL conectado exitosamente a [${currentConfig.host}:${currentConfig.port}/${currentConfig.database}] (Empleados: ${counts.employees}, Jornadas: ${counts.logs})`);
    return true;
  } catch (error: any) {
    connectionStatus.connected = false;
    connectionStatus.error = error.message || 'Error de conexión a MySQL';
    console.warn(`⚠️ MySQL externa no disponible (${currentConfig.host}:${currentConfig.port}): ${error.message}.`);
    return false;
  }
}

/**
 * Crea las tablas necesarias en MySQL
 */
async function createTablesIfNotExist() {
  if (!pool) return;

  const createEmployeesTable = `
    CREATE TABLE IF NOT EXISTS \`employees\` (
      \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
      \`name\` VARCHAR(150) NOT NULL,
      \`dni\` VARCHAR(30) NOT NULL,
      \`email\` VARCHAR(150) NULL,
      \`phone\` VARCHAR(40) NULL,
      \`role\` VARCHAR(100) NOT NULL DEFAULT 'OPERARIO',
      \`department\` VARCHAR(100) NULL DEFAULT 'General',
      \`hourly_rate\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      \`overtime_rate\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`avatar_color\` VARCHAR(100) NULL DEFAULT 'from-blue-500 to-indigo-600',
      \`created_at\` VARCHAR(50) NOT NULL COMMENT 'Fecha y hora en formato local (YYYY-MM-DD HH:mm:ss)',
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_employees_dni\` (\`dni\`),
      INDEX \`idx_employees_active\` (\`active\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createLogsTable = `
    CREATE TABLE IF NOT EXISTS \`work_logs\` (
      \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
      \`employee_id\` VARCHAR(50) NOT NULL,
      \`date\` VARCHAR(20) NOT NULL,
      \`entry_time\` VARCHAR(10) NOT NULL,
      \`exit_time\` VARCHAR(10) NOT NULL,
      \`break_hours\` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      \`total_hours\` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      \`regular_hours\` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      \`overtime_hours\` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      \`is_holiday\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 si es festivo (100% horas extras)',
      \`notes\` TEXT NULL,
      \`status\` VARCHAR(30) NOT NULL DEFAULT 'completed',
      \`created_at\` VARCHAR(50) NOT NULL COMMENT 'Fecha y hora en formato local (YYYY-MM-DD HH:mm:ss)',
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_logs_date\` (\`date\`),
      INDEX \`idx_logs_employee\` (\`employee_id\`),
      CONSTRAINT \`fk_work_logs_employee\` FOREIGN KEY (\`employee_id\`) 
        REFERENCES \`employees\` (\`id\`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS \`app_settings\` (
      \`id\` INT NOT NULL PRIMARY KEY DEFAULT 1,
      \`company_name\` VARCHAR(200) NOT NULL DEFAULT 'WorkLog Pro Soluciones S.L.',
      \`default_break_hours\` DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
      \`standard_work_day_hours\` DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
      \`default_recipient_email\` VARCHAR(150) NOT NULL DEFAULT 'antonioyg@gmail.com',
      \`smtp_host\` VARCHAR(150) NULL DEFAULT 'smtp.gmail.com',
      \`smtp_port\` INT NOT NULL DEFAULT 587,
      \`smtp_user\` VARCHAR(150) NULL DEFAULT 'antonioyg@gmail.com',
      \`smtp_configured\` TINYINT(1) NOT NULL DEFAULT 0,
      \`twilio_configured\` TINYINT(1) NOT NULL DEFAULT 0,
      \`version\` VARCHAR(20) NOT NULL DEFAULT '1.0.0',
      \`last_updated\` VARCHAR(50) NULL,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.query(createEmployeesTable);
  await pool.query(createLogsTable);
  await pool.query(createSettingsTable);
  try {
    await pool.query('ALTER TABLE `work_logs` ADD COLUMN `is_holiday` TINYINT(1) NOT NULL DEFAULT 0 AFTER `overtime_hours`;');
  } catch {
    // Columna ya existe o ignorar si no se puede añadir
  }
}

/**
 * Obtiene el conteo de registros en las tablas
 */
async function getTableCounts(): Promise<{ employees: number; logs: number }> {
  if (!pool) return { employees: 0, logs: 0 };
  try {
    const [empRows]: any = await pool.query('SELECT COUNT(*) as count FROM employees');
    const [logRows]: any = await pool.query('SELECT COUNT(*) as count FROM work_logs');
    return {
      employees: Number(empRows[0]?.count || 0),
      logs: Number(logRows[0]?.count || 0),
    };
  } catch (e) {
    return { employees: 0, logs: 0 };
  }
}

/**
 * Retorna el estado actual de MySQL
 */
export function getMySQLStatus(): MySQLStatus {
  return { ...connectionStatus, lastChecked: new Date().toISOString() };
}

/**
 * Prueba la conexión con parámetros arbitrarios (desde la interfaz de usuario)
 */
export async function testMySQLConnection(testConfig: Partial<MySQLConfig>): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  tables?: { employees: number; logs: number };
}> {
  const merged: MySQLConfig = {
    enabled: true,
    host: testConfig.host || currentConfig.host,
    port: Number(testConfig.port) || currentConfig.port,
    user: testConfig.user ?? currentConfig.user,
    password: testConfig.password ?? currentConfig.password,
    database: testConfig.database || currentConfig.database,
    ssl: Boolean(testConfig.ssl),
  };

  const startTime = Date.now();
  try {
    const conn = await mysql.createConnection({
      host: merged.host,
      port: merged.port,
      user: merged.user,
      password: merged.password,
      database: merged.database,
      ssl: merged.ssl ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 7000,
    });

    const [rows]: any = await conn.query('SELECT 1 as test');
    const latencyMs = Date.now() - startTime;

    // Verificar si las tablas existen
    let empCount = 0;
    let logCount = 0;
    try {
      const [empRes]: any = await conn.query('SELECT COUNT(*) as count FROM employees');
      empCount = empRes[0]?.count || 0;
      const [logRes]: any = await conn.query('SELECT COUNT(*) as count FROM work_logs');
      logCount = logRes[0]?.count || 0;
    } catch {
      // Las tablas aún no se han creado en esa BD
    }

    await conn.end();

    return {
      success: true,
      message: `¡Conexión exitosa a MySQL en ${merged.host}:${merged.port}/${merged.database}! (Latencia: ${latencyMs}ms)`,
      latencyMs,
      tables: { employees: empCount, logs: logCount },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error conectando a MySQL: ${error.message}`,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Migra o inserta datos JSON a MySQL
 */
export async function migrateDataToMySQL(dbData: any): Promise<{ success: boolean; message: string }> {
  if (!pool || !connectionStatus.connected) {
    const ok = await initMySQL();
    if (!ok || !pool) {
      throw new Error('No hay conexión activa a MySQL para realizar la migración');
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Guardar o actualizar Empleados
    if (Array.isArray(dbData.employees) && dbData.employees.length > 0) {
      for (const emp of dbData.employees) {
        await conn.query(
          `INSERT INTO employees (id, name, dni, email, phone, role, department, hourly_rate, overtime_rate, active, avatar_color, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             dni = VALUES(dni),
             email = VALUES(email),
             phone = VALUES(phone),
             role = VALUES(role),
             department = VALUES(department),
             hourly_rate = VALUES(hourly_rate),
             overtime_rate = VALUES(overtime_rate),
             active = VALUES(active),
             avatar_color = VALUES(avatar_color);`,
          [
            emp.id,
            emp.name,
            emp.dni,
            emp.email || '',
            emp.phone || '',
            emp.role || 'OPERARIO',
            emp.department || 'General',
            Number(emp.hourlyRate) || 0,
            Number(emp.overtimeRate) || 0,
            emp.active ? 1 : 0,
            emp.avatarColor || 'from-blue-500 to-indigo-600',
            formatToLocalTimestamp(emp.createdAt),
          ]
        );
      }
    }

    // 2. Guardar o actualizar Registros de Jornada
    if (Array.isArray(dbData.logs) && dbData.logs.length > 0) {
      for (const log of dbData.logs) {
        await conn.query(
          `INSERT INTO work_logs (id, employee_id, date, entry_time, exit_time, break_hours, total_hours, regular_hours, overtime_hours, notes, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             employee_id = VALUES(employee_id),
             date = VALUES(date),
             entry_time = VALUES(entry_time),
             exit_time = VALUES(exit_time),
             break_hours = VALUES(break_hours),
             total_hours = VALUES(total_hours),
             regular_hours = VALUES(regular_hours),
             overtime_hours = VALUES(overtime_hours),
             notes = VALUES(notes),
             status = VALUES(status);`,
          [
            log.id,
            log.employeeId,
            log.date,
            log.entryTime,
            log.exitTime,
            Number(log.breakHours) || 0,
            Number(log.totalHours) || 0,
            Number(log.regularHours) || 0,
            Number(log.overtimeHours) || 0,
            log.notes || '',
            log.status || 'completed',
            formatToLocalTimestamp(log.createdAt),
          ]
        );
      }
    }

    // 3. Guardar Configuración
    if (dbData.settings) {
      const s = dbData.settings;
      await conn.query(
        `INSERT INTO app_settings (id, company_name, default_break_hours, standard_work_day_hours, default_recipient_email, smtp_host, smtp_port, smtp_user, smtp_configured, twilio_configured, version, last_updated)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           company_name = VALUES(company_name),
           default_break_hours = VALUES(default_break_hours),
           standard_work_day_hours = VALUES(standard_work_day_hours),
           default_recipient_email = VALUES(default_recipient_email),
           smtp_host = VALUES(smtp_host),
           smtp_port = VALUES(smtp_port),
           smtp_user = VALUES(smtp_user),
           smtp_configured = VALUES(smtp_configured),
           twilio_configured = VALUES(twilio_configured),
           last_updated = VALUES(last_updated);`,
        [
          s.companyName || 'WorkLog Pro Soluciones S.L.',
          Number(s.defaultBreakHours) || 1.0,
          Number(s.standardWorkDayHours) || 8.0,
          s.defaultRecipientEmail || 'antonioyg@gmail.com',
          s.smtpHost || 'smtp.gmail.com',
          Number(s.smtpPort) || 587,
          s.smtpUser || '',
          s.smtpConfigured ? 1 : 0,
          s.twilioConfigured ? 1 : 0,
          dbData.version || '1.0.0',
          new Date().toISOString(),
        ]
      );
    }

    await conn.commit();
    const counts = await getTableCounts();
    connectionStatus.tables = counts;

    return {
      success: true,
      message: `Migración completada con éxito: ${counts.employees} empleados y ${counts.logs} jornadas guardadas en MySQL`,
    };
  } catch (error: any) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// ==============================================================================
// OPERACIONES CRUD DIRECTAS EN MYSQL
// ==============================================================================

/**
 * Obtener todos los datos de MySQL en el formato DatabaseSchema
 */
export async function getMySQLAllData(): Promise<any> {
  if (!pool || !connectionStatus.connected) return null;

  try {
    const [empRows]: any = await pool.query('SELECT * FROM employees ORDER BY name ASC');
    const [logRows]: any = await pool.query('SELECT * FROM work_logs ORDER BY date DESC, entry_time DESC');
    const [settingRows]: any = await pool.query('SELECT * FROM app_settings WHERE id = 1');

    const employees = (empRows || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      dni: row.dni,
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || 'OPERARIO',
      department: row.department || 'General',
      hourlyRate: Number(row.hourly_rate) || 0,
      overtimeRate: Number(row.overtime_rate) || 0,
      active: Boolean(row.active),
      avatarColor: row.avatar_color || 'from-blue-500 to-indigo-600',
      createdAt: formatToLocalTimestamp(row.created_at),
    }));

    const logs = (logRows || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      date: row.date,
      entryTime: row.entry_time,
      exitTime: row.exit_time,
      breakHours: Number(row.break_hours) || 0,
      totalHours: Number(row.total_hours) || 0,
      regularHours: Number(row.regular_hours) || 0,
      overtimeHours: Number(row.overtime_hours) || 0,
      notes: row.notes || '',
      status: row.status || 'completed',
      createdAt: formatToLocalTimestamp(row.created_at),
    }));

    const settingsRow = settingRows[0] || {};
    const settings = {
      companyName: settingsRow.company_name || 'WorkLog Pro Soluciones S.L.',
      defaultBreakHours: Number(settingsRow.default_break_hours) || 1.0,
      standardWorkDayHours: Number(settingsRow.standard_work_day_hours) || 8.0,
      defaultRecipientEmail: settingsRow.default_recipient_email || 'antonioyg@gmail.com',
      smtpHost: settingsRow.smtp_host || 'smtp.gmail.com',
      smtpPort: Number(settingsRow.smtp_port) || 587,
      smtpUser: settingsRow.smtp_user || 'antonioyg@gmail.com',
      smtpConfigured: Boolean(settingsRow.smtp_configured),
      twilioConfigured: Boolean(settingsRow.twilio_configured),
    };

    return {
      employees,
      logs,
      settings,
      version: settingsRow.version || '1.0.0',
      lastUpdated: settingsRow.last_updated || new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Error al leer datos desde MySQL:', error);
    return null;
  }
}

/**
 * Guardar o actualizar Empleado en MySQL
 */
export async function saveMySQLEmployee(emp: any): Promise<any> {
  if (!pool || !connectionStatus.connected) return null;

  const id = emp.id || `emp-${Date.now()}`;
  const createdAt = formatToLocalTimestamp(emp.createdAt);

  await pool.query(
    `INSERT INTO employees (id, name, dni, email, phone, role, department, hourly_rate, overtime_rate, active, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       dni = VALUES(dni),
       email = VALUES(email),
       phone = VALUES(phone),
       role = VALUES(role),
       department = VALUES(department),
       hourly_rate = VALUES(hourly_rate),
       overtime_rate = VALUES(overtime_rate),
       active = VALUES(active),
       avatar_color = VALUES(avatar_color);`,
    [
      id,
      emp.name,
      emp.dni,
      emp.email || '',
      emp.phone || '',
      emp.role || 'OPERARIO',
      emp.department || 'General',
      Number(emp.hourlyRate) || 0,
      Number(emp.overtimeRate) || 0,
      emp.active !== false ? 1 : 0,
      emp.avatarColor || 'from-blue-500 to-indigo-600',
      createdAt,
    ]
  );

  return { ...emp, id, createdAt };
}

/**
 * Eliminar Empleado en MySQL
 */
export async function deleteMySQLEmployee(id: string): Promise<boolean> {
  if (!pool || !connectionStatus.connected) return false;
  await pool.query('DELETE FROM employees WHERE id = ?', [id]);
  return true;
}

/**
 * Guardar o actualizar Registro de Jornada en MySQL
 */
export async function saveMySQLLog(log: any): Promise<any> {
  if (!pool || !connectionStatus.connected) return null;

  const id = log.id || `log-${Date.now()}`;
  const createdAt = formatToLocalTimestamp(log.createdAt);

  await pool.query(
    `INSERT INTO work_logs (id, employee_id, date, entry_time, exit_time, break_hours, total_hours, regular_hours, overtime_hours, notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       employee_id = VALUES(employee_id),
       date = VALUES(date),
       entry_time = VALUES(entry_time),
       exit_time = VALUES(exit_time),
       break_hours = VALUES(break_hours),
       total_hours = VALUES(total_hours),
       regular_hours = VALUES(regular_hours),
       overtime_hours = VALUES(overtime_hours),
       notes = VALUES(notes),
       status = VALUES(status);`,
    [
      id,
      log.employeeId,
      log.date,
      log.entryTime,
      log.exitTime,
      Number(log.breakHours) || 0,
      Number(log.totalHours) || 0,
      Number(log.regularHours) || 0,
      Number(log.overtimeHours) || 0,
      log.notes || '',
      log.status || 'completed',
      createdAt,
    ]
  );

  return { ...log, id, createdAt };
}

/**
 * Eliminar Registro de Jornada en MySQL
 */
export async function deleteMySQLLog(id: string): Promise<boolean> {
  if (!pool || !connectionStatus.connected) return false;
  await pool.query('DELETE FROM work_logs WHERE id = ?', [id]);
  return true;
}

/**
 * Actualizar Ajustes en MySQL
 */
export async function saveMySQLSettings(settings: any): Promise<any> {
  if (!pool || !connectionStatus.connected) return null;

  await pool.query(
    `INSERT INTO app_settings (id, company_name, default_break_hours, standard_work_day_hours, default_recipient_email, smtp_host, smtp_port, smtp_user, smtp_configured, twilio_configured, version, last_updated)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       company_name = VALUES(company_name),
       default_break_hours = VALUES(default_break_hours),
       standard_work_day_hours = VALUES(standard_work_day_hours),
       default_recipient_email = VALUES(default_recipient_email),
       smtp_host = VALUES(smtp_host),
       smtp_port = VALUES(smtp_port),
       smtp_user = VALUES(smtp_user),
       smtp_configured = VALUES(smtp_configured),
       twilio_configured = VALUES(twilio_configured),
       last_updated = VALUES(last_updated);`,
    [
      settings.companyName || 'WorkLog Pro Soluciones S.L.',
      Number(settings.defaultBreakHours) || 1.0,
      Number(settings.standardWorkDayHours) || 8.0,
      settings.defaultRecipientEmail || 'antonioyg@gmail.com',
      settings.smtpHost || 'smtp.gmail.com',
      Number(settings.smtpPort) || 587,
      settings.smtpUser || '',
      settings.smtpConfigured ? 1 : 0,
      settings.twilioConfigured ? 1 : 0,
      '1.0.0',
      new Date().toISOString(),
    ]
  );

  return settings;
}

/**
 * Generar dump SQL exportable desde los datos reales de MySQL
 */
export async function exportMySQLDump(): Promise<string> {
  const data = await getMySQLAllData();
  if (!data) throw new Error('No se pudieron obtener los datos de MySQL');

  let sql = `-- ==============================================================================\n`;
  sql += `-- WORKLOG PRO SQL BACKUP DESDE MYSQL\n`;
  sql += `-- Generado: ${new Date().toISOString()}\n`;
  sql += `-- Base de Datos: ${currentConfig.database} en ${currentConfig.host}\n`;
  sql += `-- ==============================================================================\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS \`employees\` (\n`;
  sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
  sql += `  \`name\` VARCHAR(150) NOT NULL,\n`;
  sql += `  \`dni\` VARCHAR(30) NOT NULL,\n`;
  sql += `  \`email\` VARCHAR(150),\n`;
  sql += `  \`phone\` VARCHAR(40),\n`;
  sql += `  \`role\` VARCHAR(100),\n`;
  sql += `  \`department\` VARCHAR(100),\n`;
  sql += `  \`hourly_rate\` DECIMAL(10,2),\n`;
  sql += `  \`overtime_rate\` DECIMAL(10,2),\n`;
  sql += `  \`active\` TINYINT(1),\n`;
  sql += `  \`avatar_color\` VARCHAR(100),\n`;
  sql += `  \`created_at\` VARCHAR(50)\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS \`work_logs\` (\n`;
  sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
  sql += `  \`employee_id\` VARCHAR(50) NOT NULL,\n`;
  sql += `  \`date\` VARCHAR(20) NOT NULL,\n`;
  sql += `  \`entry_time\` VARCHAR(10) NOT NULL,\n`;
  sql += `  \`exit_time\` VARCHAR(10) NOT NULL,\n`;
  sql += `  \`break_hours\` DECIMAL(5,2),\n`;
  sql += `  \`total_hours\` DECIMAL(5,2),\n`;
  sql += `  \`regular_hours\` DECIMAL(5,2),\n`;
  sql += `  \`overtime_hours\` DECIMAL(5,2),\n`;
  sql += `  \`notes\` TEXT,\n`;
  sql += `  \`status\` VARCHAR(30),\n`;
  sql += `  \`created_at\` VARCHAR(50),\n`;
  sql += `  FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`)\n`;
  sql += `);\n\n`;

  if (data.employees.length > 0) {
    sql += `-- Inserción de Empleados\n`;
    for (const e of data.employees) {
      sql += `INSERT INTO \`employees\` (\`id\`, \`name\`, \`dni\`, \`email\`, \`phone\`, \`role\`, \`department\`, \`hourly_rate\`, \`overtime_rate\`, \`active\`, \`avatar_color\`, \`created_at\`) VALUES ('${e.id}', '${(e.name || '').replace(/'/g, "''")}', '${e.dni}', '${e.email}', '${e.phone}', '${(e.role || '').replace(/'/g, "''")}', '${(e.department || '').replace(/'/g, "''")}', ${e.hourlyRate}, ${e.overtimeRate}, ${e.active ? 1 : 0}, '${e.avatarColor || ''}', '${formatToLocalTimestamp(e.createdAt)}');\n`;
    }
    sql += `\n`;
  }

  if (data.logs.length > 0) {
    sql += `-- Inserción de Registros de Jornada\n`;
    for (const l of data.logs) {
      sql += `INSERT INTO \`work_logs\` (\`id\`, \`employee_id\`, \`date\`, \`entry_time\`, \`exit_time\`, \`break_hours\`, \`total_hours\`, \`regular_hours\`, \`overtime_hours\`, \`notes\`, \`status\`, \`created_at\`) VALUES ('${l.id}', '${l.employeeId}', '${l.date}', '${l.entryTime}', '${l.exitTime}', ${l.breakHours}, ${l.totalHours}, ${l.regularHours}, ${l.overtimeHours}, '${(l.notes || '').replace(/'/g, "''")}', '${l.status}', '${formatToLocalTimestamp(l.createdAt)}');\n`;
    }
  }

  return sql;
}
