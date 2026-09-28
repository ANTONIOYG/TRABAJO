import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Logs } from './components/Logs';
import { Employees } from './components/Employees';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { QuickClockIn } from './components/QuickClockIn';
import { MobileOfflineModal } from './components/MobileOfflineModal';
import { Holidays } from './components/Holidays';
import { Employee, WorkLog, AppSettings, DatabaseSchema } from './types';
import { DataService } from './DB/db';
import { initialSettings } from './utils/mockData';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQuickClockModalOpen, setIsQuickClockModalOpen] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await DataService.getDatabase();
        setEmployees(db.employees || []);
        setLogs(db.logs || []);
        if (db.settings) {
          setSettings(db.settings);
        }
      } catch (err) {
        console.error('Error cargando base de datos:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Handlers para Logs
  const handleSaveLog = async (log: WorkLog) => {
    await DataService.saveLog(log);
    const updatedDb = await DataService.getDatabase();
    setLogs(updatedDb.logs);
  };

  const handleDeleteLog = async (id: string) => {
    await DataService.deleteLog(id);
    const updatedDb = await DataService.getDatabase();
    setLogs(updatedDb.logs);
  };

  // Handlers para Empleados
  const handleSaveEmployee = async (employee: Employee) => {
    await DataService.saveEmployee(employee);
    const updatedDb = await DataService.getDatabase();
    setEmployees(updatedDb.employees);
  };

  const handleDeleteEmployee = async (id: string) => {
    await DataService.deleteEmployee(id);
    const updatedDb = await DataService.getDatabase();
    setEmployees(updatedDb.employees);
    setLogs(updatedDb.logs);
  };

  // Handler para Ajustes
  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await DataService.updateSettings(newSettings);
    setSettings(updated);
  };

  // Handler para Restaurar Base de Datos
  const handleRestoreDatabase = async (db: DatabaseSchema) => {
    setEmployees(db.employees);
    setLogs(db.logs);
    if (db.settings) setSettings(db.settings);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Iniciando WorkLog Pro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Navbar Superior */}
      <Navbar
        settings={settings}
        onOpenQuickClock={() => setIsQuickClockModalOpen(true)}
        onOpenMobileModal={() => setIsMobileModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          logsCount={logs.length}
          employeesCount={employees.length}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-61px)]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard
                employees={employees}
                logs={logs}
                settings={settings}
                onSaveLog={handleSaveLog}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'logs' && (
              <Logs
                employees={employees}
                logs={logs}
                onSaveLog={handleSaveLog}
                onDeleteLog={handleDeleteLog}
              />
            )}

            {activeTab === 'employees' && (
              <Employees
                employees={employees}
                logs={logs}
                onSaveEmployee={handleSaveEmployee}
                onDeleteEmployee={handleDeleteEmployee}
              />
            )}

            {activeTab === 'reports' && (
              <Reports
                employees={employees}
                logs={logs}
                settings={settings}
              />
            )}

            {activeTab === 'holidays' && (
              <Holidays />
            )}

            {activeTab === 'settings' && (
              <Settings
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onRestoreDatabase={handleRestoreDatabase}
                onOpenMobileModal={() => setIsMobileModalOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Quick Clock-in Modal */}
      {isQuickClockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md">
            <QuickClockIn
              employees={employees}
              onSaveLog={handleSaveLog}
              onClose={() => setIsQuickClockModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile & Offline QR Modal */}
      <MobileOfflineModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
      />
    </div>
  );
};

export default App;
