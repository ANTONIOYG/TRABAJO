/**
 * Utilidades de cálculo para jornadas laborales y horas extras
 */

/**
 * Convierte un string de hora "HH:mm" a valor numérico decimal en horas
 */
export function timeStringToHours(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours + minutes / 60;
}

/**
 * Formatea horas decimales a formato legible "8h 30m"
 */
export function formatHours(hours: number): string {
  if (isNaN(hours) || hours <= 0) return '0h 00m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Calcula las horas brutas, netas, ordinarias y extras de un fichaje.
 * Reglas de negocio según INSTRUCTIONS.md:
 * - Si la jornada bruta es menor a 8 horas, no se resta descanso (descanso = 0).
 * - A partir de 8 horas brutas, resta automáticamente el descanso (por defecto 1h).
 * - Días L-V: Horas ordinarias hasta 8h. Extras a partir de las 8h (15 €/h).
 * - Fines de semana y festivos de convenio: 100% de las horas son extras (17 €/h), 0 ordinarias.
 */

/**
 * Lista de festivos del Convenio Colectivo de la Madera en Madrid 2026.
 * Formato: YYYY-MM-DD
 */
export const CONVENIO_HOLIDAYS_2026: string[] = [
  '2026-01-01', // Año Nuevo
  '2026-01-06', // Reyes Magos
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajador
  '2026-05-02', // Día de la Comunidad de Madrid
  '2026-07-25', // Santiago Apóstol
  '2026-08-15', // Asunción de la Virgen
  '2026-09-25', // Festivo convenio Madera Madrid
  '2026-10-12', // Fiesta Nacional de España
  '2026-11-01', // Todos los Santos
  '2026-11-09', // La Almudena (Madrid)
  '2026-12-06', // Dia de la Constitucion
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
];

/**
 * Comprueba si una fecha (YYYY-MM-DD) es festivo según el convenio de la Madera en Madrid.
 */
export function isConvenioHoliday(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const datePart = dateStr.slice(0, 10);
  return CONVENIO_HOLIDAYS_2026.includes(datePart);
}

/**
 * @deprecated Usar isConvenioHoliday en su lugar.
 */
export function isDefaultHoliday(dateStr?: string | null): boolean {
  return isConvenioHoliday(dateStr);
}

/**
 * Comprueba si una fecha cae en fin de semana (sábado o domingo).
 */
export function isWeekend(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  // Usar T12:00:00 para evitar problemas de zona horaria al parsear solo la fecha
  const date = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Determina si un día debe tratarse como festivo a efectos de cálculo de horas extras
 * (todas las horas son extras a 17 €/h):
 * - Festivos del convenio colectivo de la Madera en Madrid 2026
 * - Fines de semana (sábado y domingo)
 */
export function isFestivoDia(dateStr?: string | null): boolean {
  return isConvenioHoliday(dateStr) || isWeekend(dateStr);
}

export function calculateLogHours(
  entryTime: string,
  exitTime: string,
  breakHours: number = 1.0,
  standardDayHours: number = 8.0,
  isHoliday: boolean = false
) {
  if (!entryTime || !exitTime) {
    return {
      grossHours: 0,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      effectiveBreak: 0,
      isHoliday: Boolean(isHoliday),
    };
  }

  const start = timeStringToHours(entryTime);
  const end = timeStringToHours(exitTime);

  // Manejo de turnos que pasan de medianoche (ej: 22:00 a 06:00)
  const grossHours = end >= start ? end - start : (24 - start) + end;

  // REGLA: Menos de 8 horas brutas → no se descuenta descanso
  const effectiveBreak = grossHours >= standardDayHours
    ? Math.max(0, isNaN(breakHours) ? 1.0 : breakHours)
    : 0;

  const totalHours = Math.max(0, Number((grossHours - effectiveBreak).toFixed(2)));

  // REGLA FESTIVOS Y FINES DE SEMANA:
  // Todas las horas netas son extras (0 ordinarias)
  const regularHours = isHoliday ? 0 : Math.min(standardDayHours, totalHours);
  const overtimeHours = isHoliday
    ? totalHours
    : Math.max(0, Number((totalHours - regularHours).toFixed(2)));

  return {
    grossHours: Number(grossHours.toFixed(2)),
    totalHours,
    regularHours: Number(regularHours.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    effectiveBreak,
    isHoliday: Boolean(isHoliday),
  };
}

/**
 * Comprueba si una fecha es el último día del mes
 */
export function isEndOfMonth(d: Date = new Date()): boolean {
  const tomorrow = new Date(d);
  tomorrow.setDate(d.getDate() + 1);
  return tomorrow.getMonth() !== d.getMonth();
}

/**
 * Retorna el nombre del mes en español
 */
export function getMonthName(monthIndex: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return months[monthIndex] || '';
}

/**
 * Formatea fecha ISO YYYY-MM-DD a formato español DD/MM/YYYY
 */
export function formatDateES(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formatea importe en Euros (€)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
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
