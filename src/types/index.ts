export interface Employee {
  id: string;
  name: string;
  dni: string;
  email: string;
  phone: string;
  role: string;
  department?: string;
  hourlyRate: number;
  overtimeRate: number;
  active: boolean;
  avatarColor?: string;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  entryTime: string; // HH:mm
  exitTime: string; // HH:mm
  breakHours: number; // e.g. 1.0
  totalHours: number; // calculated: gross - break
  regularHours: number; // min(8, totalHours) (0 si es festivo)
  overtimeHours: number; // max(0, totalHours - 8) o 100% de horas si es festivo
  isHoliday?: boolean; // Día festivo (100% horas extras)
  notes?: string;
  status: 'completed' | 'in-progress';
  createdAt: string;
}

export interface AppSettings {
  companyName: string;
  defaultBreakHours: number;
  standardWorkDayHours: number;
  defaultRecipientEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpConfigured: boolean;
  twilioConfigured: boolean;
}

export interface DatabaseSchema {
  employees: Employee[];
  logs: WorkLog[];
  settings: AppSettings;
  version: string;
  lastUpdated: string;
}

export interface DashboardKPIs {
  totalHoursMonth: number;
  regularHoursMonth: number;
  overtimeHoursMonth: number;
  activeEmployeesCount: number;
  logsCountMonth: number;
  overtimeLogsCount: number;
  estimatedCostMonth: number;
}

export interface DailyActivityData {
  date: string;
  dayName: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
}

export interface EmployeeActivityData {
  employeeId: string;
  name: string;
  role: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  logsCount: number;
}
