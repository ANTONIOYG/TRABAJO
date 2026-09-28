import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Mail,
  MessageSquare,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Send,
  Sparkles,
  Info,
  Clock,
  Euro
} from 'lucide-react';
import { Employee, WorkLog, AppSettings } from '../types';
import { downloadWorkLogsExcel, exportWorkLogsToBase64 } from '../utils/excelExport';
import { getMonthName, formatDateES, formatHours, formatCurrency } from '../utils/calculations';
import { DataService } from '../DB/db';

interface ReportsProps {
  employees: Employee[];
  logs: WorkLog[];
  settings: AppSettings;
}

export const Reports: React.FC<ReportsProps> = ({ employees, logs, settings }) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [recipientEmail, setRecipientEmail] = useState<string>(
    settings.defaultRecipientEmail || 'antonioyg@gmail.com'
  );
  const [whatsappNumber, setWhatsappNumber] = useState<string>('+34600000000');

  // Loading & status
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [alertStatus, setAlertStatus] = useState<{ message: string; success: boolean } | null>(null);

  const monthName = getMonthName(selectedMonth);

  // Filtrado de registros para este reporte
  const reportLogs = useMemo(() => {
    return logs.filter((log) => {
      const d = new Date(log.date);
      const matchesYear = d.getFullYear() === selectedYear;
      const matchesMonth = d.getMonth() === selectedMonth;
      const matchesEmp = selectedEmployeeId === 'all' || log.employeeId === selectedEmployeeId;
      return matchesYear && matchesMonth && matchesEmp;
    });
  }, [logs, selectedYear, selectedMonth, selectedEmployeeId]);

  // Resumen de horas del reporte
  const summary = useMemo(() => {
    let totalH = 0;
    let regularH = 0;
    let overtimeH = 0;
    let totalCost = 0;

    const empMap = new Map(employees.map((e) => [e.id, e]));

    reportLogs.forEach((l) => {
      totalH += l.totalHours;
      regularH += l.regularHours;
      overtimeH += l.overtimeHours;
      const emp = empMap.get(l.employeeId);
      if (emp) {
        totalCost += l.regularHours * emp.hourlyRate + l.overtimeHours * emp.overtimeRate;
      }
    });

    return {
      recordsCount: reportLogs.length,
      totalHours: Number(totalH.toFixed(2)),
      regularHours: Number(regularH.toFixed(2)),
      overtimeHours: Number(overtimeH.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
    };
  }, [reportLogs, employees]);

  // Descarga directa a Excel
  const handleDownloadExcel = () => {
    const filename = downloadWorkLogsExcel(logs, employees, {
      month: selectedMonth,
      year: selectedYear,
      employeeId: selectedEmployeeId === 'all' ? undefined : selectedEmployeeId,
      companyName: settings.companyName,
    });
    setAlertStatus({
      message: `Archivo "${filename}" descargado exitosamente. Formato .xlsx nativo 100% compatible con Google Drive y Excel.`,
      success: true,
    });
  };

  // Envío de reporte adjunto por Email
  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setAlertStatus(null);
    try {
      const { base64, filename } = exportWorkLogsToBase64(logs, employees, {
        month: selectedMonth,
        year: selectedYear,
        employeeId: selectedEmployeeId === 'all' ? undefined : selectedEmployeeId,
        companyName: settings.companyName,
      });

      const res = await DataService.sendReportEmail({
        recipient: recipientEmail,
        subject: `Informe de Jornadas y Horas Extras - ${monthName} ${selectedYear}`,
        text: `Adjuntamos el informe consolidado de control de horarios correspondiente al periodo de ${monthName} ${selectedYear}.\n\nTotal registros: ${summary.recordsCount}\nTotal horas: ${summary.totalHours}h (Ordinarias: ${summary.regularHours}h, Extras: ${summary.overtimeHours}h).\n\nGenerado por WorkLog Pro.`,
        filename,
        fileBase64: base64,
      });

      if (res.success) {
        setAlertStatus({
          message: res.message || `Informe remitido correctamente a ${recipientEmail}`,
          success: true,
        });
      } else {
        setAlertStatus({
          message: `Error al enviar correo: ${res.error || 'Verifique configuración SMTP'}`,
          success: false,
        });
      }
    } catch (e: any) {
      setAlertStatus({
        message: `Error en la solicitud: ${e.message}`,
        success: false,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Envío de resumen por WhatsApp (Twilio)
  const handleSendWhatsApp = async () => {
    setIsSendingWhatsApp(true);
    setAlertStatus(null);
    try {
      const message = `📊 *WorkLog Pro - Resumen ${monthName} ${selectedYear}*\n` +
        `👤 *Empresa:* ${settings.companyName}\n` +
        `⏱️ *Total Horas:* ${summary.totalHours}h\n` +
        `✅ *Ordinarias:* ${summary.regularHours}h\n` +
        `⚡ *Horas Extras:* +${summary.overtimeHours}h\n` +
        `📝 *Registros:* ${summary.recordsCount}\n` +
        `💰 *Coste Est.:* ${formatCurrency(summary.totalCost)}`;

      const res = await DataService.sendWhatsApp({
        to: whatsappNumber,
        message,
      });

      if (res.success) {
        setAlertStatus({
          message: res.message || `Resumen de WhatsApp enviado correctamente a ${whatsappNumber}`,
          success: true,
        });
      } else {
        setAlertStatus({
          message: `Error enviando WhatsApp: ${res.error || 'Verifique configuración de Twilio'}`,
          success: false,
        });
      }
    } catch (e: any) {
      setAlertStatus({
        message: `Error en la solicitud: ${e.message}`,
        success: false,
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          Generación de Reportes y Exportación Excel
        </h2>
        <p className="text-xs text-slate-400">
          Crea informes consolidados en formato <strong>.xlsx nativo</strong>, envíalos por correo a los administradores o difúndelos por WhatsApp.
        </p>
      </div>

      {/* Alert / Notification Feedback */}
      {alertStatus && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between text-xs ${
            alertStatus.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Info className="w-5 h-5 flex-shrink-0" />
            <span>{alertStatus.message}</span>
          </div>
          <button
            onClick={() => setAlertStatus(null)}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Configuration & Filters Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          1. Parámetros del Informe
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Mes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mes de Registro
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Empleado */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Empleado (Filtro opcional)
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos los Empleados (Plantilla Completa)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.dni})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Summary Preview Box */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">
              Registros
            </span>
            <span className="text-lg font-bold text-white">{summary.recordsCount}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">
              Horas Ordinarias
            </span>
            <span className="text-lg font-bold text-indigo-400">{summary.regularHours}h</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">
              Horas Extras
            </span>
            <span className="text-lg font-bold text-amber-400">+{summary.overtimeHours}h</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">
              Total Horas Netas
            </span>
            <span className="text-lg font-bold text-emerald-400">{summary.totalHours}h</span>
          </div>
        </div>
      </div>

      {/* Action Channels: Excel Direct Download, Email Dispatch, WhatsApp Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Excel (.xlsx) Download */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Descarga Directa Excel</h4>
            <p className="text-xs text-slate-400">
              Genera el archivo <strong>.xlsx</strong> nativo con 2 hojas: registro individual de jornadas y tabla de resumen mensual por empleado.
            </p>
          </div>

          <button
            onClick={handleDownloadExcel}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Archivo .xlsx</span>
          </button>
        </div>

        {/* Card 2: Email Dispatch (Nodemailer) */}
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Envío por Email</h4>
            <p className="text-xs text-slate-400">
              Remite el informe con el archivo Excel adjunto en base64 mediante el servidor Express.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="correo@destinatario.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
            />

            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !recipientEmail}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSendingEmail ? 'Enviando correo...' : 'Enviar por Email'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: WhatsApp Notification (Twilio) */}
        <div className="glass-card rounded-2xl p-5 border border-cyan-500/30 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Resumen por WhatsApp</h4>
            <p className="text-xs text-slate-400">
              Envía un resumen inmediato con el total de horas ordinarias, horas extras y balance a tu móvil.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="+34600000000"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
            />

            <button
              onClick={handleSendWhatsApp}
              disabled={isSendingWhatsApp || !whatsappNumber}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSendingWhatsApp ? 'Enviando WhatsApp...' : 'Enviar por WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
