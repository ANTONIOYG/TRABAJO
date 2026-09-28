import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Briefcase,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Euro,
  UserCheck,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { Employee, WorkLog } from '../types';
import { formatCurrency, formatHours, getLocalTimestamp, formatToLocalTimestamp } from '../utils/calculations';

interface EmployeesProps {
  employees: Employee[];
  logs: WorkLog[];
  onSaveEmployee: (employee: Employee) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
}

export const Employees: React.FC<EmployeesProps> = ({
  employees,
  logs,
  onSaveEmployee,
  onDeleteEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [dni, setDni] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [department, setDepartment] = useState<string>('Tecnología');
  const [hourlyRate, setHourlyRate] = useState<number>(20.0);
  const [overtimeRate, setOvertimeRate] = useState<number>(30.0);
  const [active, setActive] = useState<boolean>(true);

  // Current Month for employee stats
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthLogs = useMemo(() => {
    return logs.filter((l) => {
      const d = new Date(l.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [logs, currentYear, currentMonth]);

  const openCreateModal = () => {
    setEditingEmp(null);
    setName('');
    setDni('');
    setEmail('');
    setPhone('');
    setRole('');
    setDepartment('Tecnología');
    setHourlyRate(20.0);
    setOvertimeRate(30.0);
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setDni(emp.dni);
    setEmail(emp.email);
    setPhone(emp.phone);
    setRole(emp.role);
    setDepartment(emp.department || 'General');
    setHourlyRate(emp.hourlyRate);
    setOvertimeRate(emp.overtimeRate);
    setActive(emp.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const avatarGradients = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-cyan-500 to-blue-600',
      'from-rose-500 to-red-600',
    ];
    const randomGrad = avatarGradients[Math.floor(Math.random() * avatarGradients.length)];

    const empData: Employee = {
      id: editingEmp ? editingEmp.id : `emp-${Date.now()}`,
      name: name.trim(),
      dni: dni.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: role.trim(),
      department: department.trim(),
      hourlyRate: Number(hourlyRate) || 0,
      overtimeRate: Number(overtimeRate) || 0,
      active,
      avatarColor: editingEmp?.avatarColor || randomGrad,
      createdAt: editingEmp ? formatToLocalTimestamp(editingEmp.createdAt) : getLocalTimestamp(),
    };

    await onSaveEmployee(empData);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, empName: string) => {
    if (
      window.confirm(
        `¿Eliminar a ${empName}? Esta acción también eliminará todos sus registros de jornada.`
      )
    ) {
      await onDeleteEmployee(id);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchTerm.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.dni.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q)
      );
    });
  }, [employees, searchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Plantilla y Gestión de Personal
          </h2>
          <p className="text-xs text-slate-400">
            Administración de empleados, tarifas por hora y resumen mensual de actividad.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Empleado</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar empleado por nombre, DNI/NIE, puesto o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => {
          // Calcular horas del empleado este mes
          const empLogs = currentMonthLogs.filter((l) => l.employeeId === emp.id);
          const totalHours = empLogs.reduce((acc, curr) => acc + curr.totalHours, 0);
          const overtimeHours = empLogs.reduce((acc, curr) => acc + curr.overtimeHours, 0);
          const regularHours = empLogs.reduce((acc, curr) => acc + curr.regularHours, 0);
          const totalCost = regularHours * emp.hourlyRate + overtimeHours * emp.overtimeRate;

          return (
            <div
              key={emp.id}
              className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                {/* Card Top: Avatar & Status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${
                        emp.avatarColor || 'from-indigo-500 to-purple-600'
                      } flex items-center justify-center text-white font-bold text-base shadow-md`}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{emp.name}</h3>
                      <p className="text-xs text-indigo-400 font-medium">{emp.role}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      emp.active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {emp.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Details List */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" /> DNI / NIE:
                    </span>
                    <span className="font-mono text-slate-200 font-medium">{emp.dni}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" /> Email:
                    </span>
                    <span className="text-slate-200 truncate max-w-[160px]">{emp.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" /> Teléfono:
                    </span>
                    <span className="text-slate-200">{emp.phone}</span>
                  </div>
                </div>

                {/* Rates & Monthly Hours Box */}
                <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Tarifa Ordinaria / Extra:</span>
                    <span className="font-semibold text-slate-200">
                      {formatCurrency(emp.hourlyRate)} / {formatCurrency(emp.overtimeRate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Horas este mes</span>
                      <span className="text-xs font-bold text-white">
                        {Number(totalHours.toFixed(1))}h
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Horas Extras</span>
                      <span
                        className={`text-xs font-bold ${
                          overtimeHours > 0 ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {overtimeHours > 0 ? `+${Number(overtimeHours.toFixed(1))}h` : '0h'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-2">
                <button
                  onClick={() => openEditModal(emp)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(emp.id, emp.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear / Editar Empleado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                {editingEmp ? 'Editar Empleado' : 'Añadir Nuevo Empleado'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Mendoza Ruiz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    DNI / NIE
                  </label>
                  <input
                    type="text"
                    placeholder="12345678Z"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Puesto / Cargo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Desarrollador"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="+34 600 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tarifa Hora Ordinaria (€)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tarifa Hora Extra (€)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={overtimeRate}
                    onChange={(e) => setOvertimeRate(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="activeEmp"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded"
                />
                <label htmlFor="activeEmp" className="text-xs text-slate-300 font-medium">
                  Empleado activo en plantilla
                </label>
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
                  {editingEmp ? 'Guardar Cambios' : 'Añadir Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
