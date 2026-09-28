import React, { useState, useMemo } from 'react';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  Mail,
  Calendar,
  Sparkles,
  ArrowUpRight,
  CheckCircle,
  Download,
  Send,
  Coffee,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Employee, WorkLog, AppSettings } from '../types';
import { QuickClockIn } from './QuickClockIn';
import { isEndOfMonth, formatHours, formatDateES, formatCurrency, getMonthName } from '../utils/calculations';
import { downloadWorkLogsExcel, exportWorkLogsToBase64 } from '../utils/excelExport';
import { DataService } from '../DB/db';

interface DashboardProps {
  employees: Employee[];
  logs: WorkLog[];
  settings: AppSettings;
  onSaveLog: (log: WorkLog) => Promise<void>;
  onNavigateToTab: (tab: 'logs' | 'employees' | 'reports' | 'settings') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  employees,
  logs,
  settings,
  onSaveLog,
  onNavigateToTab,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentMonthName = getMonthName(currentMonth);

  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<{ message: string; success: boolean } | null>(null);

  // Filtrar logs de este mes
  const currentMonthLogs = useMemo(() => {
    return logs.filter((l) => {
      const d = new Date(l.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [logs, currentYear, currentMonth]);

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    let totalH = 0;
    let regularH = 0;
    let overtimeH = 0;
    let totalCost = 0;

    const empMap = new Map(employees.map((e) => [e.id, e]));

    currentMonthLogs.forEach((log) => {
      totalH += log.totalHours;
      regularH += log.regularHours;
      overtimeH += log.overtimeHours;

      const emp = empMap.get(log.employeeId);
      if (emp) {
        totalCost += log.regularHours * emp.hourlyRate + log.overtimeHours * emp.overtimeRate;
      }
    });

    const activeEmployeesCount = employees.filter((e) => e.active).length;

    return {
      totalHours: Number(totalH.toFixed(2)),
      regularHours: Number(regularH.toFixed(2)),
      overtimeHours: Number(overtimeH.toFixed(2)),
      logsCount: currentMonthLogs.length,
      activeEmployeesCount,
      totalCost: Number(totalCost.toFixed(2)),
    };
  }, [currentMonthLogs, employees]);

  // Datos para gráfico de evolución diaria
  const dailyChartData = useMemo(() => {
    const dayMap: Record<string, { date: string; day: string; regular: number; overtime: number; total: number }> = {};

    currentMonthLogs.forEach((l) => {
      if (!dayMap[l.date]) {
        const parts = l.date.split('-');
        const dayLabel = `${parts[2]}/${parts[1]}`;
        dayMap[l.date] = { date: l.date, day: dayLabel, regular: 0, overtime: 0, total: 0 };
      }
      dayMap[l.date].regular += l.regularHours;
      dayMap[l.date].overtime += l.overtimeHours;
      dayMap[l.date].total += l.totalHours;
    });

    return Object.values(dayMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        regular: Number(item.regular.toFixed(2)),
        overtime: Number(item.overtime.toFixed(2)),
        total: Number(item.total.toFixed(2)),
      }));
  }, [currentMonthLogs]);

  // Datos para gráfico por empleado
  const employeeChartData = useMemo(() => {
    const empData: Record<string, { name: string; regular: number; overtime: number }> = {};

    employees.forEach((e) => {
      empData[e.id] = { name: e.name.split(' ')[0], regular: 0, overtime: 0 };
    });

    currentMonthLogs.forEach((l) => {
      if (empData[l.employeeId]) {
        empData[l.employeeId].regular += l.regularHours;
        empData[l.employeeId].overtime += l.overtimeHours;
      }
    });

    return Object.values(empData).map((d) => ({
      ...d,
      regular: Number(d.regular.toFixed(1)),
      overtime: Number(d.overtime.toFixed(1)),
    }));
  }, [employees, currentMonthLogs]);

  // Enviar reporte mensual por email a antonioyg@gmail.com
  const handleSendMonthlyReport = async () => {
    const recipient = settings.defaultRecipientEmail || 'antonioyg@gmail.com';
    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      const { base64, filename } = exportWorkLogsToBase64(logs, employees, {
        month: currentMonth,
        year: currentYear,
        companyName: settings.companyName,
      });

      const response = await DataService.sendReportEmail({
        recipient,
        subject: `Reporte Mensual de Jornadas y Horas Extras - ${currentMonthName} ${currentYear}`,
        text: `Adjuntamos el reporte consolidado de jornadas laborales y horas extras correspondientes a ${currentMonthName} de ${currentYear}.\n\nGenerado por WorkLog Pro para ${settings.companyName}.`,
        filename,
        fileBase64: base64,
      });

      if (response.success) {
        setEmailStatus({
          message: response.message || `Reporte enviado con éxito a ${recipient}`,
          success: true,
        });
      } else {
        setEmailStatus({
          message: `Error al enviar: ${response.error || 'Verifique configuración SMTP'}`,
          success: false,
        });
      }
    } catch (err: any) {
      setEmailStatus({
        message: `Error en la conexión con el servidor: ${err.message}`,
        success: false,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const isMonthEnd = isEndOfMonth();

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Banner de Alerta de Fin de Mes o Acción Rápida de Envío */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/90 via-slate-900 to-slate-950 p-5 sm:p-6 border border-indigo-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Periodo Actual: {currentMonthName} {currentYear}
              </span>
              {isMonthEnd && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  Cierre de Mes Detectado
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">
              Control de Jornadas y Resumen de Horas Extras
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Genera y remite el informe mensual oficial en formato <strong>.xlsx</strong> nativo compatible con Microsoft Excel y Google Drive/Sheets a{' '}
              <span className="font-semibold text-indigo-300">{settings.defaultRecipientEmail || 'antonioyg@gmail.com'}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() =>
                downloadWorkLogsExcel(logs, employees, {
                  month: currentMonth,
                  year: currentYear,
                  companyName: settings.companyName,
                })
              }
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Descargar .xlsx</span>
            </button>

            <button
              onClick={handleSendMonthlyReport}
              disabled={isSendingEmail}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-white" />
              <span>{isSendingEmail ? 'Enviando...' : 'Enviar Reporte por Email'}</span>
            </button>
          </div>
        </div>

        {/* Email Notification Alert Status */}
        {emailStatus && (
          <div
            className={`mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
              emailStatus.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{emailStatus.message}</span>
            </div>
            <button
              onClick={() => setEmailStatus(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Horas Totales */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Horas Mes
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {kpis.totalHours} <span className="text-sm font-semibold text-slate-400">horas</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-indigo-400 font-semibold">{kpis.logsCount}</span> registros en {currentMonthName}
          </div>
        </div>

        {/* Card 2: Horas Ordinarias */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Horas Ordinarias
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {kpis.regularHours} <span className="text-sm font-semibold text-slate-400">horas</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Jornadas base de hasta 8h netas
          </div>
        </div>

        {/* Card 3: Horas Extras */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Horas Extras
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">
              +{kpis.overtimeHours} <span className="text-sm font-semibold text-amber-400/80">horas</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-amber-300/80">
            Exceso sobre las 8h de jornada
          </div>
        </div>

        {/* Card 4: Plantilla Activa */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Plantilla Activa
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {kpis.activeEmployeesCount} <span className="text-sm font-semibold text-slate-400">/ {employees.length}</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Total coste est.: <strong className="text-slate-200">{formatCurrency(kpis.totalCost)}</strong>
          </div>
        </div>
      </div>

      {/* Main Section: Quick Clock-In Widget & Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quick Clock-In (4 cols) */}
        <div className="lg:col-span-4">
          <QuickClockIn employees={employees} onSaveLog={onSaveLog} />
        </div>

        {/* Right Column: Charts (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart 1: Evolución de Horas */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Evolución Diaria de Horas (Ordinarias vs Extras)
                </h3>
                <p className="text-xs text-slate-400">Registro cronológico del mes en curso</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-indigo-300">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Ordinarias
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Extras
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOver" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="regular"
                      name="Horas Ordinarias"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorReg)"
                      stackId="1"
                    />
                    <Area
                      type="monotone"
                      dataKey="overtime"
                      name="Horas Extras"
                      stroke="#fbbf24"
                      fillOpacity={1}
                      fill="url(#colorOver)"
                      stackId="1"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Sin registros suficientes para graficar este mes.
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Distribución por Empleado */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Horas Acumuladas por Empleado
                </h3>
                <p className="text-xs text-slate-400">Comparativa mensual de carga horaria</p>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="regular" name="Ordinarias" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overtime" name="Extras" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Logs Table with Quick Actions */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Últimos Fichajes Registrados</h3>
            <p className="text-xs text-slate-400">Registros más recientes en el sistema</p>
          </div>
          <button
            onClick={() => onNavigateToTab('logs')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Ver todos los registros <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Fecha</th>
                <th className="pb-3 px-3">Empleado</th>
                <th className="pb-3 px-3">Entrada / Salida</th>
                <th className="pb-3 px-3">Descanso</th>
                <th className="pb-3 px-3">Total Netas</th>
                <th className="pb-3 px-3">Ordinarias</th>
                <th className="pb-3 px-3">Horas Extras</th>
                <th className="pb-3 px-3">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logs.slice(0, 6).map((log) => {
                const emp = employees.find((e) => e.id === log.employeeId);
                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-white">{formatDateES(log.date)}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{emp?.name || 'Desconocido'}</div>
                      <div className="text-[10px] text-slate-500">{emp?.role}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {log.entryTime} - {log.exitTime}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{log.breakHours}h</td>
                    <td className="py-3 px-3 font-bold text-white">{log.totalHours}h</td>
                    <td className="py-3 px-3 text-indigo-400 font-semibold">{log.regularHours}h</td>
                    <td className="py-3 px-3">
                      {log.overtimeHours > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          +{log.overtimeHours}h
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-[200px] truncate">
                      {log.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
