import { DatabaseSchema, Employee, WorkLog, AppSettings } from '../types';
import { initialDatabase } from '../utils/mockData';

export interface MySQLStatusResponse {
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

export interface MySQLConnectParams {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl: boolean;
  enabled?: boolean;
  migrateCurrentData?: boolean;
}

/**
 * Cliente centralizado para la persistencia de datos (Exclusivo Base de Datos MySQL Externa)
 */
export class DataService {
  private static cachedData: DatabaseSchema | null = null;

  /**
   * Obtiene la base de datos completa desde el servidor MySQL externo
   */
  static async getDatabase(): Promise<DatabaseSchema> {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.cachedData = result.data;
          return result.data;
        }
        throw new Error(result.error || 'Error al obtener datos de MySQL');
      } else {
        const errResult = await response.json().catch(() => ({}));
        throw new Error(errResult.error || `Error ${response.status}: Sin conexión a MySQL`);
      }
    } catch (err: any) {
      console.error('Error al conectar con la base de datos MySQL:', err.message);
      if (this.cachedData) {
        return this.cachedData;
      }
      return {
        employees: [],
        logs: [],
        settings: initialDatabase.settings,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Guarda toda la base de datos directamente en MySQL
   */
  static async saveDatabase(data: DatabaseSchema): Promise<DatabaseSchema> {
    data.lastUpdated = new Date().toISOString();
    this.cachedData = data;

    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      throw new Error(errRes.error || 'Error al guardar los datos en MySQL');
    }

    const result = await response.json();
    return result.data || data;
  }

  // ============================================================================
  // GESTIÓN DE EMPLEADOS (MySQL)
  // ============================================================================

  /**
   * Obtener todos los empleados desde MySQL
   */
  static async getEmployees(): Promise<Employee[]> {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.employees)) {
          return result.employees;
        }
      }
    } catch (e) {
      console.warn('Fallo al obtener empleados desde /api/employees, usando getDatabase()', e);
    }
    const db = await this.getDatabase();
    return db.employees || [];
  }

  /**
   * Guardar o actualizar un empleado en MySQL
   */
  static async saveEmployee(employee: Employee): Promise<Employee> {
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.employee) {
        if (this.cachedData) {
          const idx = this.cachedData.employees.findIndex((e) => e.id === result.employee.id);
          if (idx >= 0) {
            this.cachedData.employees[idx] = result.employee;
          } else {
            this.cachedData.employees.push(result.employee);
          }
        }
        return result.employee;
      }
    }

    const errRes = await response.json().catch(() => ({}));
    throw new Error(errRes.error || 'Error al guardar empleado en MySQL');
  }

  /**
   * Alias para actualizar empleado
   */
  static async updateEmployee(employee: Employee): Promise<Employee> {
    return this.saveEmployee(employee);
  }

  /**
   * Eliminar un empleado en MySQL
   */
  static async deleteEmployee(id: string): Promise<boolean> {
    const response = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        if (this.cachedData) {
          this.cachedData.employees = this.cachedData.employees.filter((e) => e.id !== id);
          this.cachedData.logs = this.cachedData.logs.filter((l) => l.employeeId !== id);
        }
        return true;
      }
    }

    const errRes = await response.json().catch(() => ({}));
    throw new Error(errRes.error || 'Error al eliminar empleado en MySQL');
  }

  // ============================================================================
  // GESTIÓN DE JORNADAS / LOGS (MySQL)
  // ============================================================================

  /**
   * Obtener todos los registros de jornada desde MySQL
   */
  static async getLogs(): Promise<WorkLog[]> {
    try {
      const response = await fetch('/api/logs');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.logs)) {
          return result.logs;
        }
      }
    } catch (e) {
      console.warn('Fallo al obtener logs desde /api/logs, usando getDatabase()', e);
    }
    const db = await this.getDatabase();
    return db.logs || [];
  }

  /**
   * Guardar o actualizar un registro de jornada en MySQL
   */
  static async saveLog(log: WorkLog): Promise<WorkLog> {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.log) {
        if (this.cachedData) {
          const idx = this.cachedData.logs.findIndex((l) => l.id === result.log.id);
          if (idx >= 0) {
            this.cachedData.logs[idx] = result.log;
          } else {
            this.cachedData.logs.unshift(result.log);
          }
        }
        return result.log;
      }
    }

    const errRes = await response.json().catch(() => ({}));
    throw new Error(errRes.error || 'Error al guardar jornada en MySQL');
  }

  /**
   * Alias para actualizar registro de jornada
   */
  static async updateLog(log: WorkLog): Promise<WorkLog> {
    return this.saveLog(log);
  }

  /**
   * Eliminar un registro de jornada en MySQL
   */
  static async deleteLog(id: string): Promise<boolean> {
    const response = await fetch(`/api/logs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        if (this.cachedData) {
          this.cachedData.logs = this.cachedData.logs.filter((l) => l.id !== id);
        }
        return true;
      }
    }

    const errRes = await response.json().catch(() => ({}));
    throw new Error(errRes.error || 'Error al eliminar jornada en MySQL');
  }

  // ============================================================================
  // AJUSTES GENERALES (MySQL)
  // ============================================================================

  /**
   * Actualizar configuración general en MySQL
   */
  static async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.settings) {
        if (this.cachedData) {
          this.cachedData.settings = { ...this.cachedData.settings, ...result.settings };
        }
        return result.settings;
      }
    }

    const errRes = await response.json().catch(() => ({}));
    throw new Error(errRes.error || 'Error al guardar ajustes en MySQL');
  }

  // ============================================================================
  // CONTROL Y CONEXIÓN DE BASE DE DATOS MYSQL EXTERNA
  // ============================================================================

  /**
   * Consulta el estado de conexión de MySQL
   */
  static async getMySQLStatus(): Promise<MySQLStatusResponse> {
    try {
      const response = await fetch('/api/mysql/status');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.status) {
          return result.status;
        }
      }
    } catch (e) {
      console.warn('No se pudo verificar estado de MySQL', e);
    }

    return {
      connected: false,
      configured: false,
      host: 'localhost',
      port: 3306,
      database: 'worklog_pro',
      user: 'root',
      ssl: false,
      lastChecked: new Date().toISOString(),
      error: 'Servidor API no accesible',
    };
  }

  /**
   * Prueba la conexión a una base de datos MySQL con parámetros personalizados
   */
  static async testMySQLConnection(params: Partial<MySQLConnectParams>): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    tables?: { employees: number; logs: number };
  }> {
    const response = await fetch('/api/mysql/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }

  /**
   * Conectar y persistir parámetros de conexión a MySQL
   */
  static async connectMySQL(params: MySQLConnectParams): Promise<{
    success: boolean;
    status: MySQLStatusResponse;
    message: string;
    migrationResult?: any;
  }> {
    const response = await fetch('/api/mysql/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }

  /**
   * Migrar datos previos hacia MySQL externa
   */
  static async migrateToMySQL(): Promise<{ success: boolean; result?: any; message?: string }> {
    const response = await fetch('/api/mysql/migrate', {
      method: 'POST',
    });
    return response.json();
  }

  // ============================================================================
  // NOTIFICACIONES (Email & WhatsApp)
  // ============================================================================

  static async sendReportEmail(payload: {
    recipient?: string;
    subject?: string;
    text?: string;
    filename: string;
    fileBase64: string;
  }) {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  static async sendWhatsApp(payload: { to?: string; message: string }) {
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  // ============================================================================
  // EXPORTACIÓN DE BACKUP SQL DESDE MYSQL
  // ============================================================================

  static exportBackupSql(): void {
    window.open('/api/export-sql', '_blank');
  }

  // ============================================================================
  // INFORMACIÓN DE RED
  // ============================================================================

  static async getNetworkInfo(): Promise<{
    primaryIp: string;
    ips: string[];
    frontendPort: number;
    backendPort: number;
    mobileUrl: string;
  }> {
    try {
      const response = await fetch('/api/network-info');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result;
        }
      }
    } catch (e) {
      console.warn('No se pudo obtener network info', e);
    }
    const currentHost = window.location.hostname;
    return {
      primaryIp: currentHost,
      ips: [currentHost],
      frontendPort: 5173,
      backendPort: 3001,
      mobileUrl: `http://${currentHost}:5173`,
    };
  }
}
