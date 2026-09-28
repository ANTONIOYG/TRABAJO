import { Employee, WorkLog, AppSettings, DatabaseSchema } from '../types';
import { calculateLogHours } from './calculations';

export const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Carlos Mendoza Ruiz',
    dni: '48291038X',
    email: 'carlos.mendoza@empresa.com',
    phone: '+34 612 345 678',
    role: 'Desarrollador Senior',
    department: 'Tecnología',
    hourlyRate: 22.50,
    overtimeRate: 33.75,
    active: true,
    avatarColor: 'from-blue-500 to-indigo-600',
    createdAt: '2025-01-10T08:00:00.000Z',
  },
  {
    id: 'emp-2',
    name: 'Laura Gómez Navarro',
    dni: '53109482M',
    email: 'laura.gomez@empresa.com',
    phone: '+34 623 456 789',
    role: 'Jefa de Proyectos',
    department: 'Gestión',
    hourlyRate: 25.00,
    overtimeRate: 37.50,
    active: true,
    avatarColor: 'from-purple-500 to-pink-600',
    createdAt: '2025-01-15T08:00:00.000Z',
  },
  {
    id: 'emp-3',
    name: 'Antonio Yañez García',
    dni: '39485721K',
    email: 'antonioyg@gmail.com',
    phone: '+34 634 567 890',
    role: 'Administrador de Sistemas',
    department: 'Operaciones',
    hourlyRate: 20.00,
    overtimeRate: 30.00,
    active: true,
    avatarColor: 'from-emerald-500 to-teal-600',
    createdAt: '2025-01-01T08:00:00.000Z',
  },
  {
    id: 'emp-4',
    name: 'Elena Santos Morales',
    dni: '71829304V',
    email: 'elena.santos@empresa.com',
    phone: '+34 645 678 901',
    role: 'Diseñadora UX/UI',
    department: 'Diseño',
    hourlyRate: 19.50,
    overtimeRate: 29.25,
    active: true,
    avatarColor: 'from-amber-500 to-orange-600',
    createdAt: '2025-02-01T08:00:00.000Z',
  },
  {
    id: 'emp-5',
    name: 'David Ortiz Prieto',
    dni: '29384756L',
    email: 'david.ortiz@empresa.com',
    phone: '+34 656 789 012',
    role: 'Especialista en Soporte',
    department: 'Operaciones',
    hourlyRate: 16.00,
    overtimeRate: 24.00,
    active: true,
    avatarColor: 'from-cyan-500 to-blue-600',
    createdAt: '2025-02-10T08:00:00.000Z',
  }
];

export const initialSettings: AppSettings = {
  companyName: 'WorkLog Pro Soluciones S.L.',
  defaultBreakHours: 1.0,
  standardWorkDayHours: 8.0,
  defaultRecipientEmail: 'antonioyg@gmail.com',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: 'antonioyg@gmail.com',
  smtpConfigured: false,
  twilioConfigured: false,
};

// Generador de registros de prueba realistas para los últimos 15 días
function generateInitialLogs(): WorkLog[] {
  const logs: WorkLog[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // Generamos fichajes para los días laborales de este mes
  const shifts = [
    { entry: '08:00', exit: '17:00', break: 1.0, note: 'Jornada ordinaria' },
    { entry: '08:30', exit: '18:30', break: 1.0, note: '1h extra por despliegue' },
    { entry: '09:00', exit: '19:30', break: 1.0, note: '1.5h extra cierre de sprint' },
    { entry: '08:00', exit: '17:00', break: 1.0, note: 'Desarrollo continuo' },
    { entry: '08:00', exit: '19:00', break: 1.0, note: '2h extras guardia y soporte' },
    { entry: '08:30', exit: '17:30', break: 1.0, note: 'Revisión y pruebas' },
    { entry: '09:00', exit: '18:00', break: 1.0, note: 'Jornada normal' },
  ];

  let logCount = 1;

  for (let d = Math.max(1, day - 14); d <= day; d++) {
    const checkDate = new Date(year, month, d);
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Saltar fines de semana

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    initialEmployees.forEach((emp, empIdx) => {
      const shiftPattern = shifts[(d + empIdx) % shifts.length];
      const hoursCalc = calculateLogHours(shiftPattern.entry, shiftPattern.exit, shiftPattern.break, 8.0);

      logs.push({
        id: `log-${logCount++}`,
        employeeId: emp.id,
        date: dateStr,
        entryTime: shiftPattern.entry,
        exitTime: shiftPattern.exit,
        breakHours: shiftPattern.break,
        totalHours: hoursCalc.totalHours,
        regularHours: hoursCalc.regularHours,
        overtimeHours: hoursCalc.overtimeHours,
        notes: shiftPattern.note,
        status: 'completed',
        createdAt: new Date(year, month, d, 18, 0, 0).toISOString(),
      });
    });
  }

  return logs;
}

export const initialLogs: WorkLog[] = generateInitialLogs();

export const initialDatabase: DatabaseSchema = {
  employees: initialEmployees,
  logs: initialLogs,
  settings: initialSettings,
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};
