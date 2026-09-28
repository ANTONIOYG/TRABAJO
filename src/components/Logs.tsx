import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  User
} from 'lucide-react';
import { Employee, WorkLog } from '../types';
import { calculateLogHours, formatDateES, formatHours, getMonthName, getLocalTimestamp, formatToLocalTimestamp, isFestivoDia, isConvenioHoliday, isWeekend } from '../utils/calculations';
import { downloadWorkLogsExcel } from '../utils/excelExport';

interface LogsProps {
  employees: Employee[];
  logs: WorkLog[];
  onSaveLog: (log: WorkLog) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
}

export const Logs: React.FC<LogsProps> = ({
  employees,
  logs,
  onSaveLog,
  onDeleteLog,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [onlyOvertime, setOnlyOvertime] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);

  // Form Fields inside modal
  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryTime, setEntryTime] = useState<string>('08:00');
  const [exitTime, setExitTime] = useState<string>('17:00');
  const [breakHours, setBreakHours] = useState<number>(1.0);
  const [notes, setNotes] = useState<string>('');

  // Detectar festivo/fin de semana automáticamente al cambiar la fecha
  const isDateFestivo = useMemo(() => isFestivoDia(date), [date]);
  const festivoReason = useMemo(() => {
    if (isConvenioHoliday(date)) return 'Festivo de convenio (Madera Madrid)';
    if (isWeekend(date)) return 'Fin de semana';
    return null;
  }, [date]);

  // Live calculation in modal — pasa isHoliday si es festivo o fin de semana
  const modalCalculated = useMemo(() => {
    return calculateLogHours(entryTime, exitTime, breakHours, 8.0, isDateFestivo);
  }, [entryTime, exitTime, breakHours, isDateFestivo]);

  const openCreateModal = () => {
    setEditingLog(null);
    setEmployeeId(employees[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setEntryTime('08:00');
    setExitTime('17:00');
    setBreakHours(1.0);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (log: WorkLog) => {
    setEditingLog(log);
    setEmployeeId(log.employeeId);
    setDate(log.date);
    setEntryTime(log.entryTime);
    setExitTime(log.exitTime);
    setBreakHours(log.breakHours);
    setNotes(log.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const logData: WorkLog = {
      id: editingLog ? editingLog.id : `log-${Date.now()}`,
      employeeId,
      date,
      entryTime,
      exitTime,
      breakHours: modalCalculated.effectiveBreak ?? (modalCalculated.grossHours >= 8 ? breakHours : 0),
      totalHours: modalCalculated.totalHours,
      regularHours: modalCalculated.regularHours,
      overtimeHours: modalCalculated.overtimeHours,
      isHoliday: isDateFestivo,
      notes: notes.trim(),
      status: 'completed',
      createdAt: editingLog ? formatToLocalTimestamp(editingLog.createdAt) : getLocalTimestamp(),
    };

    await onSaveLog(logData);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este registro de jornada?')) {
      await onDeleteLog(id);
    }
  };

  // Filtrado de logs
  const filteredLogs = useMemo(() => {
    const empMap = new Map(employees.map((e) => [e.id, e]));

    return logs.filter((log) => {
      const emp = empMap.get(log.employeeId);
      const empName = emp?.name.toLowerCase() || '';
      const notesText = (log.notes || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch = empName.includes(query) || notesText.includes(query) || log.date.includes(query);
      const matchesEmp = selectedEmployeeFilter === 'all' || log.employeeId === selectedEmployeeFilter;
      const matchesOvertime = !onlyOvertime || log.overtimeHours > 0;

      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        const monthNum = parseInt(selectedMonth, 10);
        const logDate = new Date(log.date);
        matchesMonth = logDate.getMonth() === monthNum;
      }

      return matchesSearch && matchesEmp && matchesOvertime && matchesMonth;
    });
  }, [logs, employees, searchTerm, selectedEmployeeFilter, onlyOvertime, selectedMonth]);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header with Title and Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            Registro y Control de Jornadas
          </h2>
          <p className="text-xs text-slate-400">
            Histórico detallado de fichajes, horas ordinarias y cálculo automático de horas extras.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => downloadWorkLogsExcel(filteredLogs, employees)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Vista (.xlsx)</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Fichaje</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por empleado, fecha o nota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Filter by Employee */}
        <div>
          <select
            value={selectedEmployeeFilter}
            onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="all">Todos los Empleados</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Month */}
        <div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="all">Todos los Meses</option>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
        </div>

        {/* Overtime Checkbox Filter */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900/50 rounded-xl border border-slate-800">
          <input
            type="checkbox"
            id="overtimeOnly"
            checked={onlyOvertime}
            onChange={(e) => setOnlyOvertime(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
          />
          <label htmlFor="overtimeOnly" className="text-xs text-slate-300 font-medium cursor-pointer">
            Solo con Horas Extras
          </label>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Empleado</th>
                <th className="py-3.5 px-4">Entrada / Salida</th>
                <th className="py-3.5 px-4">Descanso</th>
                <th className="py-3.5 px-4">Horas Netas</th>
                <th className="py-3.5 px-4">Ordinarias</th>
                <th className="py-3.5 px-4">Horas Extras</th>
                <th className="py-3.5 px-4">Observaciones</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const emp = employees.find((e) => e.id === log.employeeId);
                  return (
                    <tr key={log.id} className={`hover:bg-slate-800/40 transition-colors ${log.isHoliday ? 'bg-amber-900/10' : ''}`}>
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        <div>{formatDateES(log.date)}</div>
                        {log.isHoliday && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5">
                            {isConvenioHoliday(log.date) ? '🗓 Festivo' : '🏖 Fin de semana'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{emp?.name || 'Desconocido'}</div>
                        <div className="text-[10px] text-slate-500">
                          {emp?.dni} &bull; {emp?.role}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {log.entryTime} - {log.exitTime}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {log.breakHours}h
                      </td>
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {log.totalHours}h
                      </td>
                      <td className="py-3 px-4 text-indigo-400 font-semibold whitespace-nowrap">
                        {log.regularHours}h
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.overtimeHours > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            +{log.overtimeHours}h extra
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[240px] truncate">
                        {log.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(log)}
                          title="Editar registro"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          title="Eliminar registro"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    No se encontraron registros que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear / Editar Fichaje */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                {editingLog ? 'Editar Fichaje de Jornada' : 'Nuevo Fichaje de Jornada'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Empleado
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role} - {emp.dni})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Descanso (Horas)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="4"
                    value={breakHours}
                    onChange={(e) => setBreakHours(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  {modalCalculated.grossHours > 0 && modalCalculated.grossHours < 8 && (
                    <span className="text-[10px] text-amber-400 block mt-1 font-medium">
                      Jornada &lt; 8h: no se descuenta descanso (0h)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Hora Entrada
                  </label>
                  <input
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Hora Salida
                  </label>
                  <input
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Aviso festivo / fin de semana */}
              {isDateFestivo && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{festivoReason} — 100% horas extras (17 €/h)</span>
                </div>
              )}

              {/* Cálculo en vivo */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Netas</span>
                  <span className="font-bold text-white">{modalCalculated.totalHours}h</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Ordinarias</span>
                  <span className="font-bold text-indigo-400">{modalCalculated.regularHours}h</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Extras (17€/h)</span>
                  <span className="font-bold text-amber-400">+{modalCalculated.overtimeHours}h</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre tareas, guardias o motivos de horas extras..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  {editingLog ? 'Guardar Cambios' : 'Crear Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
