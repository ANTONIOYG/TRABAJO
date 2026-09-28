import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  FileSpreadsheet, 
  Settings as SettingsIcon,
  CalendarDays,
  Sparkles
} from 'lucide-react';

export type NavTab = 'dashboard' | 'logs' | 'employees' | 'reports' | 'holidays' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  logsCount?: number;
  employeesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  logsCount = 0,
  employeesCount = 0,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Panel Principal',
      icon: LayoutDashboard,
      badge: null,
      description: 'Resumen y métricas',
    },
    {
      id: 'logs' as NavTab,
      label: 'Registro de Jornadas',
      icon: ClipboardList,
      badge: logsCount > 0 ? logsCount : null,
      description: 'Control de fichajes',
    },
    {
      id: 'employees' as NavTab,
      label: 'Plantilla de Empleados',
      icon: Users,
      badge: employeesCount > 0 ? employeesCount : null,
      description: 'Gestión de personal',
    },
    {
      id: 'reports' as NavTab,
      label: 'Reportes y Excel',
      icon: FileSpreadsheet,
      badge: 'XLSX',
      description: 'Exportación y Envíos',
    },
    {
      id: 'holidays' as NavTab,
      label: 'Festivos',
      icon: CalendarDays,
      badge: null,
      description: 'Convenio Madera Madrid',
    },
    {
      id: 'settings' as NavTab,
      label: 'Ajustes y MySQL',
      icon: SettingsIcon,
      badge: null,
      description: 'MySQL, SMTP y Twilio',
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-slate-800/80 bg-slate-950/90 p-4 min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Módulos Principales
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700/80 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-sm font-semibold truncate leading-tight">
                        {item.label}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          isActive ? 'text-indigo-200/90' : 'text-slate-500'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : typeof item.badge === 'string'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Feature Highlights Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/90 text-xs">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold mb-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Cálculo Inteligente</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Resta 1h de descanso y calcula horas extras automáticamente a partir de 8h de jornada.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>WorkLog Pro &copy; 2026</span>
        <span className="flex items-center gap-1 text-slate-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Ready
        </span>
      </div>
    </aside>
  );
};
