import React, { useState, useMemo } from 'react';
import { Clock, User, Calendar, Coffee, Plus, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Employee, WorkLog } from '../types';
import { calculateLogHours, formatHours, getLocalTimestamp } from '../utils/calculations';

interface QuickClockInProps {
  employees: Employee[];
  onSaveLog: (log: WorkLog) => Promise<void>;
  onClose?: () => void;
}

export const QuickClockIn: React.FC<QuickClockInProps> = ({
  employees,
  onSaveLog,
  onClose,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id || '');
  const [date, setDate] = useState<string>(todayStr);
  const [entryTime, setEntryTime] = useState<string>('08:00');
  const [exitTime, setExitTime] = useState<string>('17:00');
  const [breakHours, setBreakHours] = useState<number>(1.0);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cálculo en tiempo real
  const calculated = useMemo(() => {
    return calculateLogHours(entryTime, exitTime, breakHours, 8.0);
  }, [entryTime, exitTime, breakHours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      alert('Por favor, seleccione un empleado');
      return;
    }

    setIsSubmitting(true);
    try {
      const newLog: WorkLog = {
        id: `log-${Date.now()}`,
        employeeId,
        date,
        entryTime,
        exitTime,
        breakHours: calculated.effectiveBreak ?? (calculated.grossHours >= 8 ? breakHours : 0),
        totalHours: calculated.totalHours,
        regularHours: calculated.regularHours,
        overtimeHours: calculated.overtimeHours,
        notes: notes.trim(),
        status: 'completed',
        createdAt: getLocalTimestamp(),
      };

      await onSaveLog(newLog);
      setSuccessMessage('¡Fichaje registrado exitosamente!');
      setNotes('');

      setTimeout(() => {
        setSuccessMessage(null);
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      console.error('Error guardando fichaje:', error);
      alert('Error al guardar el fichaje');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  return (
    <div className="glass-card rounded-2xl p-5 border border-indigo-500/20 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Fichaje Rápido
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                Auto-Cálculo
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Registro instantáneo de jornada</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md bg-slate-800/80"
          >
            Cerrar
          </button>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Empleado Selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" /> Empleado
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role} - {emp.dni})
              </option>
            ))}
          </select>
        </div>

        {/* Grid: Fecha, Entrada, Salida, Descanso */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Fecha */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Hora Entrada */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Entrada
            </label>
            <input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              required
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Hora Salida */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Salida
            </label>
            <input
              type="time"
              value={exitTime}
              onChange={(e) => setExitTime(e.target.value)}
              required
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Descanso */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Coffee className="w-3 h-3 text-amber-400" /> Descanso (h)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="4"
              value={breakHours}
              onChange={(e) => setBreakHours(parseFloat(e.target.value) || 0)}
              required
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {calculated.grossHours > 0 && calculated.grossHours < 8 && (
              <span className="text-[10px] text-amber-400 block mt-1 font-medium">
                Jornada &lt; 8h: descanso no aplicado (0h)
              </span>
            )}
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-3 gap-2 text-center">
          <div className="border-r border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Horas Netas
            </span>
            <span className="text-sm font-bold text-white">
              {calculated.totalHours}h
            </span>
          </div>
          <div className="border-r border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Ordinarias
            </span>
            <span className="text-sm font-bold text-indigo-400">
              {calculated.regularHours}h
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Horas Extras
            </span>
            <span
              className={`text-sm font-bold ${
                calculated.overtimeHours > 0
                  ? 'text-amber-400 animate-pulse'
                  : 'text-slate-400'
              }`}
            >
              {calculated.overtimeHours > 0 ? `+${calculated.overtimeHours}h` : '0h'}
            </span>
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <input
            type="text"
            placeholder="Observaciones opcionales (ej: Guardias, despliegue, reunión...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Botón Guardar */}
        <button
          type="submit"
          disabled={isSubmitting || !employeeId}
          className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-98 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span>Guardando registro...</span>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Guardar Fichaje de Jornada</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
