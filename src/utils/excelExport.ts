import * as XLSX from 'xlsx';
import { Employee, WorkLog } from '../types';
import { formatDateES, formatHours } from './calculations';

export interface ExportExcelOptions {
  month?: number; // 0-11
  year?: number;
  employeeId?: string;
  companyName?: string;
}

/**
 * Genera un libro de trabajo Excel (.xlsx) con los registros y resúmenes
 */
export function generateWorkLogsWorkbook(
  logs: WorkLog[],
  employees: Employee[],
  options: ExportExcelOptions = {}
): XLSX.WorkBook {
  const currentYear = options.year ?? new Date().getFullYear();
  const currentMonth = options.month ?? new Date().getMonth();

  const empMap = new Map(employees.map(e => [e.id, e]));

  // Filtrar logs según opciones
  let filteredLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    const matchesYear = logDate.getFullYear() === currentYear;
    const matchesMonth = options.month !== undefined ? logDate.getMonth() === currentMonth : true;
    const matchesEmployee = options.employeeId ? log.employeeId === options.employeeId : true;
    return matchesYear && matchesMonth && matchesEmployee;
  });

  // Ordenar por fecha ascendente
  filteredLogs.sort((a, b) => a.date.localeCompare(b.date));

  // 1. Hoja de Registros Detallados
  const detailedData = filteredLogs.map((log, idx) => {
    const emp = empMap.get(log.employeeId);
    return {
      'Nº': idx + 1,
      'Fecha': formatDateES(log.date),
      'Empleado': emp?.name || 'Desconocido',
      'DNI/NIE': emp?.dni || '-',
      'Puesto': emp?.role || '-',
      'Hora Entrada': log.entryTime,
      'Hora Salida': log.exitTime,
      'Descanso (Horas)': Number(log.breakHours.toFixed(2)),
      'Horas Netas': Number(log.totalHours.toFixed(2)),
      'Horas Ordinarias': Number(log.regularHours.toFixed(2)),
      'Horas Extras': Number(log.overtimeHours.toFixed(2)),
      'Observaciones': log.notes || ''
    };
  });

  const wsDetails = XLSX.utils.json_to_sheet(detailedData);

  // Auto-ajustar anchos de columnas
  const colWidths = [
    { wch: 6 },  // Nº
    { wch: 12 }, // Fecha
    { wch: 25 }, // Empleado
    { wch: 14 }, // DNI
    { wch: 20 }, // Puesto
    { wch: 14 }, // Entrada
    { wch: 14 }, // Salida
    { wch: 16 }, // Descanso
    { wch: 14 }, // Netas
    { wch: 16 }, // Ordinarias
    { wch: 14 }, // Extras
    { wch: 30 }, // Notas
  ];
  wsDetails['!cols'] = colWidths;

  // 2. Hoja de Resumen por Empleado
  const summaryByEmp: Record<string, {
    name: string;
    dni: string;
    role: string;
    totalDays: number;
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
  }> = {};

  filteredLogs.forEach(log => {
    const emp = empMap.get(log.employeeId);
    const empId = log.employeeId;
    if (!summaryByEmp[empId]) {
      summaryByEmp[empId] = {
        name: emp?.name || 'Desconocido',
        dni: emp?.dni || '-',
        role: emp?.role || '-',
        totalDays: 0,
        regularHours: 0,
        overtimeHours: 0,
        totalHours: 0,
      };
    }
    summaryByEmp[empId].totalDays += 1;
    summaryByEmp[empId].regularHours += log.regularHours;
    summaryByEmp[empId].overtimeHours += log.overtimeHours;
    summaryByEmp[empId].totalHours += log.totalHours;
  });

  const summaryData = Object.values(summaryByEmp).map((s, idx) => ({
    'Nº': idx + 1,
    'Empleado': s.name,
    'DNI/NIE': s.dni,
    'Puesto': s.role,
    'Jornadas Trabajadas': s.totalDays,
    'Total Horas Ordinarias': Number(s.regularHours.toFixed(2)),
    'Total Horas Extras': Number(s.overtimeHours.toFixed(2)),
    'Total Horas Acumuladas': Number(s.totalHours.toFixed(2)),
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
  ];

  // Crear libro con ambas hojas
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Registro de Jornadas');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Mensual');

  return wb;
}

/**
 * Descarga el archivo Excel directamente en el navegador del usuario
 */
export function downloadWorkLogsExcel(
  logs: WorkLog[],
  employees: Employee[],
  options: ExportExcelOptions = {}
): string {
  const wb = generateWorkLogsWorkbook(logs, employees, options);
  const monthName = options.month !== undefined 
    ? ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][options.month]
    : 'general';
  const year = options.year ?? new Date().getFullYear();
  const filename = `WorkLog_Reporte_${monthName}_${year}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Convierte el libro a Base64 string para su envío por la API de Nodemailer
 */
export function exportWorkLogsToBase64(
  logs: WorkLog[],
  employees: Employee[],
  options: ExportExcelOptions = {}
): { base64: string; filename: string } {
  const wb = generateWorkLogsWorkbook(logs, employees, options);
  const monthName = options.month !== undefined 
    ? ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][options.month]
    : 'general';
  const year = options.year ?? new Date().getFullYear();
  const filename = `WorkLog_Reporte_${monthName}_${year}.xlsx`;

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  return { base64: wbout, filename };
}
