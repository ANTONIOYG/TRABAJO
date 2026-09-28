import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '..', 'database.json');

function getLocalTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatToLocalTimestamp(dateInput) {
  if (!dateInput) return getLocalTimestamp();
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  return getLocalTimestamp(d);
}

async function migrate() {
  console.log('--- Migrando created_at a formato local (YYYY-MM-DD HH:mm:ss) ---');
  
  // 1. Migrar database.json
  const raw = await fs.readFile(DB_FILE, 'utf-8');
  const data = JSON.parse(raw);
  
  if (Array.isArray(data.employees)) {
    for (const emp of data.employees) {
      const oldVal = emp.createdAt;
      emp.createdAt = formatToLocalTimestamp(emp.createdAt);
      console.log(`Empleado [${emp.id}]: ${oldVal} -> ${emp.createdAt}`);
    }
  }

  if (Array.isArray(data.logs)) {
    for (const log of data.logs) {
      const oldVal = log.createdAt;
      log.createdAt = formatToLocalTimestamp(log.createdAt);
      console.log(`Log [${log.id}]: ${oldVal} -> ${log.createdAt}`);
    }
  }

  data.lastUpdated = getLocalTimestamp();
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ database.json actualizado con éxito.');

  // 2. Migrar en MySQL si está disponible
  if (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE) {
    try {
      const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'worklog_pro',
      });

      console.log('Conectado a MySQL, actualizando tablas...');

      // Actualizar employees
      const [empRows] = await conn.query('SELECT id, created_at FROM employees');
      for (const row of empRows) {
        const newTimestamp = formatToLocalTimestamp(row.created_at);
        await conn.query('UPDATE employees SET created_at = ? WHERE id = ?', [newTimestamp, row.id]);
      }
      console.log(`✅ ${empRows.length} empleados actualizados en MySQL.`);

      // Actualizar work_logs
      const [logRows] = await conn.query('SELECT id, created_at FROM work_logs');
      for (const row of logRows) {
        const newTimestamp = formatToLocalTimestamp(row.created_at);
        await conn.query('UPDATE work_logs SET created_at = ? WHERE id = ?', [newTimestamp, row.id]);
      }
      console.log(`✅ ${logRows.length} registros de jornada actualizados en MySQL.`);

      await conn.end();
    } catch (sqlErr) {
      console.warn('⚠️ No se pudo conectar a MySQL para migración directa:', sqlErr.message);
    }
  }

  console.log('🎉 Migración completada.');
}

migrate().catch(console.error);
