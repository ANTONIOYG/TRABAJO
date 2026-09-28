import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Mail,
  Database,
  Download,
  Save,
  CheckCircle2,
  Building,
  Clock,
  Coffee,
  FileCode,
  RefreshCw,
  Smartphone,
  QrCode,
  Zap,
  Server,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRightLeft,
  Check,
} from 'lucide-react';
import { AppSettings, DatabaseSchema } from '../types';
import { DataService, MySQLStatusResponse } from '../DB/db';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onRestoreDatabase: (db: DatabaseSchema) => Promise<void>;
  onOpenMobileModal?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  onRestoreDatabase,
  onOpenMobileModal,
}) => {
  const [companyName, setCompanyName] = useState<string>(settings.companyName || 'WorkLog Pro Soluciones S.L.');
  const [defaultRecipientEmail, setDefaultRecipientEmail] = useState<string>(
    settings.defaultRecipientEmail || 'antonioyg@gmail.com'
  );
  const [defaultBreakHours, setDefaultBreakHours] = useState<number>(settings.defaultBreakHours || 1.0);
  const [standardWorkDayHours, setStandardWorkDayHours] = useState<number>(
    settings.standardWorkDayHours || 8.0
  );

  const [smtpHost, setSmtpHost] = useState<string>(settings.smtpHost || 'smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<number>(settings.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState<string>(settings.smtpUser || 'antonioyg@gmail.com');

  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Estados de Base de Datos MySQL Externa
  const [mysqlStatus, setMysqlStatus] = useState<MySQLStatusResponse | null>(null);
  const [isLoadingMySQL, setIsLoadingMySQL] = useState<boolean>(false);
  const [mysqlHost, setMysqlHost] = useState<string>('localhost');
  const [mysqlPort, setMysqlPort] = useState<number>(3306);
  const [mysqlUser, setMysqlUser] = useState<string>('root');
  const [mysqlPassword, setMysqlPassword] = useState<string>('');
  const [mysqlDatabase, setMysqlDatabase] = useState<string>('worklog_pro');
  const [mysqlSsl, setMysqlSsl] = useState<boolean>(false);
  const [mysqlMigrateCurrent, setMysqlMigrateCurrent] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isTestingMySQL, setIsTestingMySQL] = useState<boolean>(false);
  const [isConnectingMySQL, setIsConnectingMySQL] = useState<boolean>(false);
  const [mysqlMessage, setMysqlMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadMySQLStatus = async () => {
    setIsLoadingMySQL(true);
    try {
      const st = await DataService.getMySQLStatus();
      setMysqlStatus(st);
      if (st.host) setMysqlHost(st.host);
      if (st.port) setMysqlPort(st.port);
      if (st.user) setMysqlUser(st.user);
      if (st.database) setMysqlDatabase(st.database);
      setMysqlSsl(Boolean(st.ssl));
    } catch (e) {
      console.error('Error cargando estado MySQL', e);
    } finally {
      setIsLoadingMySQL(false);
    }
  };

  useEffect(() => {
    loadMySQLStatus();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings({
        companyName,
        defaultRecipientEmail,
        defaultBreakHours,
        standardWorkDayHours,
        smtpHost,
        smtpPort,
        smtpUser,
      });
      setSavedSuccess('¡Configuración guardada en MySQL correctamente!');
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (err: any) {
      alert(`Error al guardar configuración: ${err.message}`);
    }
  };

  // Probar Conexión MySQL Externa
  const handleTestMySQL = async () => {
    setIsTestingMySQL(true);
    setMysqlMessage(null);
    try {
      const res = await DataService.testMySQLConnection({
        host: mysqlHost,
        port: mysqlPort,
        user: mysqlUser,
        password: mysqlPassword,
        database: mysqlDatabase,
        ssl: mysqlSsl,
      });

      if (res.success) {
        setMysqlMessage({
          type: 'success',
          text: res.message || 'Conexión a MySQL exitosa',
        });
      } else {
        setMysqlMessage({
          type: 'error',
          text: res.message || 'No se pudo conectar a MySQL',
        });
      }
    } catch (e: any) {
      setMysqlMessage({
        type: 'error',
        text: `Error de conexión: ${e.message}`,
      });
    } finally {
      setIsTestingMySQL(false);
    }
  };

  // Conectar y Guardar Configuración de MySQL
  const handleConnectMySQL = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingMySQL(true);
    setMysqlMessage(null);
    try {
      const res = await DataService.connectMySQL({
        host: mysqlHost,
        port: mysqlPort,
        user: mysqlUser,
        password: mysqlPassword,
        database: mysqlDatabase,
        ssl: mysqlSsl,
        enabled: true,
        migrateCurrentData: mysqlMigrateCurrent,
      });

      if (res.success) {
        setMysqlStatus(res.status);
        setMysqlMessage({
          type: 'success',
          text: res.message || 'Conectado a MySQL exitosamente',
        });
        const refreshedDb = await DataService.getDatabase();
        await onRestoreDatabase(refreshedDb);
      } else {
        setMysqlMessage({
          type: 'error',
          text: res.message || res.status.error || 'Fallo al conectar con MySQL',
        });
      }
    } catch (e: any) {
      setMysqlMessage({
        type: 'error',
        text: `Error al guardar/conectar: ${e.message}`,
      });
    } finally {
      setIsConnectingMySQL(false);
      loadMySQLStatus();
    }
  };

  // Migrar datos previos legacy a MySQL
  const handleMigrateData = async () => {
    if (!window.confirm('¿Deseas migrar los datos locales previos (database.json) a la base de datos MySQL externa?')) {
      return;
    }
    try {
      const res = await DataService.migrateToMySQL();
      if (res.success) {
        setSavedSuccess('¡Datos locales migrados a MySQL externa con éxito!');
        setTimeout(() => setSavedSuccess(null), 3000);
        await loadMySQLStatus();
        const refreshedDb = await DataService.getDatabase();
        await onRestoreDatabase(refreshedDb);
      } else {
        alert(`Error en la migración: ${res.message || 'Verifique la conexión a MySQL'}`);
      }
    } catch (e: any) {
      alert(`Error al migrar: ${e.message}`);
    }
  };

  // Descarga directa de dump SQL desde MySQL
  const handleExportSql = () => {
    DataService.exportBackupSql();
    setSavedSuccess('Generando volcado SQL desde MySQL externa...');
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-400" />
          Ajustes del Sistema y Conexión MySQL Externa
        </h2>
        <p className="text-xs text-slate-400">
          Personaliza los parámetros de la empresa, gestiona la conexión a tu servidor MySQL externo y exporta copias de seguridad en formato SQL.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* SECCIÓN 1: Base de Datos MySQL Externa */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              1. Base de Datos MySQL Externa
              {mysqlStatus?.connected ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Check className="w-3 h-3 mr-1" /> Conectado a MySQL
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <AlertCircle className="w-3 h-3 mr-1" /> Desconectado de MySQL
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              WorkLog Pro opera exclusivamente conectado a tu base de datos MySQL externa (cPanel, phpMyAdmin, AWS RDS, Railway, PlanetScale o servidor dedicado).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={loadMySQLStatus}
              disabled={isLoadingMySQL}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-[11px] text-slate-300 transition-all"
              title="Comprobar estado de conexión"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMySQL ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Verificar Estado</span>
            </button>
          </div>
        </div>

        {/* Resumen del estado actual */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Motor de Persistencia</span>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              MySQL Externa (Exclusivo)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Servidor & Base de Datos</span>
            <span className="text-xs font-bold text-slate-200 truncate block" title={`${mysqlStatus?.host}:${mysqlStatus?.port}/${mysqlStatus?.database}`}>
              {mysqlStatus?.host || 'localhost'}:{mysqlStatus?.port || 3306}/{mysqlStatus?.database || 'worklog_pro'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Registros en MySQL</span>
            <span className="text-xs font-bold text-slate-200">
              {mysqlStatus?.connected && mysqlStatus.tables
                ? `${mysqlStatus.tables.employees} empleados | ${mysqlStatus.tables.logs} jornadas`
                : 'Sin conexión activa'}
            </span>
          </div>
        </div>

        {/* Mensajes de feedback */}
        {mysqlMessage && (
          <div
            className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold animate-fadeIn ${
              mysqlMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {mysqlMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{mysqlMessage.text}</span>
          </div>
        )}

        {/* Formulario de Configuración de MySQL */}
        <form onSubmit={handleConnectMySQL} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Host / Servidor MySQL
              </label>
              <input
                type="text"
                required
                value={mysqlHost}
                onChange={(e) => setMysqlHost(e.target.value)}
                placeholder="ej: mysql.midominio.com o IP"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Puerto MySQL
              </label>
              <input
                type="number"
                required
                value={mysqlPort}
                onChange={(e) => setMysqlPort(Number(e.target.value))}
                placeholder="3306"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de la Base de Datos
              </label>
              <input
                type="text"
                required
                value={mysqlDatabase}
                onChange={(e) => setMysqlDatabase(e.target.value)}
                placeholder="worklog_pro"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Usuario MySQL
              </label>
              <input
                type="text"
                required
                value={mysqlUser}
                onChange={(e) => setMysqlUser(e.target.value)}
                placeholder="root o usuario de BD"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña MySQL
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={mysqlPassword}
                  onChange={(e) => setMysqlPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 font-mono pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <input
                  type="checkbox"
                  checked={mysqlSsl}
                  onChange={(e) => setMysqlSsl(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-cyan-500"
                />
                <span>Habilitar SSL / TLS Seguro (AWS RDS, PlanetScale, Cloud)</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={mysqlMigrateCurrent}
                onChange={(e) => setMysqlMigrateCurrent(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-cyan-500"
              />
              <span>Migrar datos locales de <code>database.json</code> automáticamente si la base de datos MySQL está vacía</span>
            </label>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handleTestMySQL}
                disabled={isTestingMySQL}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingMySQL ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isTestingMySQL ? 'Probando...' : 'Probar Conexión'}</span>
              </button>

              <button
                type="submit"
                disabled={isConnectingMySQL}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isConnectingMySQL ? 'Conectando...' : 'Guardar y Conectar MySQL'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SECCIÓN 2 & 3: Configuración de la Empresa & Control Horario */}
      <form onSubmit={handleSaveGeneral} className="space-y-6">
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            2. Datos de la Empresa y Notificaciones
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de la Empresa o Razón Social
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico Principal para Reportes
              </label>
              <input
                type="email"
                required
                value={defaultRecipientEmail}
                onChange={(e) => setDefaultRecipientEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Reglas de Negocio para el Cálculo Horario */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            3. Reglas de Cálculo Horario Automático
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                Descuento de Descanso por Defecto (Horas)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="4"
                value={defaultBreakHours}
                onChange={(e) => setDefaultBreakHours(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Solo se descuenta si la jornada bruta alcanza o supera las 8 horas.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Límite de Jornada Ordinaria Diaria (Horas)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="12"
                value={standardWorkDayHours}
                onChange={(e) => setStandardWorkDayHours(parseFloat(e.target.value) || 8)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Todo tiempo que supere este umbral se computa automáticamente como horas extras.
              </span>
            </div>
          </div>
        </div>

        {/* Servidor SMTP de Correo */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400" />
            Servidor SMTP de Envío de Correo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Servidor SMTP</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Puerto SMTP</label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(parseInt(e.target.value, 10))}
                placeholder="587"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Usuario / Correo Emisor</label>
              <input
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="antonioyg@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Credenciales seguras:</strong> Las contraseñas de aplicación (como <code>SMTP_PASS</code> y <code>TWILIO_AUTH_TOKEN</code>) se cargan desde el archivo <code>.env</code> para máxima seguridad.
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Configuración General en MySQL</span>
        </button>
      </form>

      {/* Card 4: Acceso Móvil */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              4. Acceso Móvil & Código QR
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Zap className="w-3 h-3 mr-1" /> Acceso en Red
              </span>
            </h3>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Genera un código QR para abrir e instalar WorkLog Pro en cualquier teléfono móvil (Android / iOS) conectado a la red local.
            </p>
          </div>

          {onOpenMobileModal && (
            <button
              type="button"
              onClick={onOpenMobileModal}
              className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex-shrink-0"
            >
              <QrCode className="w-4 h-4" />
              <span>Ver Código QR Móvil</span>
            </button>
          )}
        </div>
      </div>

      {/* Card 5: Exportación de Seguridad SQL Directa desde MySQL */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              5. Copia de Seguridad y Volcado SQL (MySQL Externa)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Exporta y descarga un archivo de volcado SQL (.sql) generado en tiempo real directamente desde tu base de datos MySQL externa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Exportación SQL */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                <Download className="w-4 h-4 text-emerald-400" />
                Descargar Backup SQL Directo
              </h4>
              <p className="text-[11px] text-slate-400">
                Genera un script SQL con la estructura completa de tablas (<code>employees</code>, <code>work_logs</code>, <code>app_settings</code>) e inserciones de todos los registros actuales directamente desde MySQL externa.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportSql}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Archivo .sql</span>
            </button>
          </div>

          {/* Migración legacy si fuera requerida */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                Migrar Datos Previos a MySQL
              </h4>
              <p className="text-[11px] text-slate-400">
                Si cuentas con datos previos en el archivo local <code>database.json</code>, puedes transferirlos directamente a tu base de datos MySQL externa para no perder ningún historial.
              </p>
            </div>
            <button
              type="button"
              onClick={handleMigrateData}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Migrar database.json a MySQL</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
