import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Wifi, WifiOff, Sparkles, Building2, Smartphone, QrCode } from 'lucide-react';
import { AppSettings } from '../types';

interface NavbarProps {
  settings: AppSettings;
  onOpenQuickClock?: () => void;
  onOpenMobileModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ settings, onOpenQuickClock, onOpenMobileModal }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 glass-panel border-b border-slate-800/80">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
          <Clock className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              WorkLog <span className="text-indigo-400 font-extrabold">Pro</span>
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-500" />
            {settings.companyName || 'Gestión de Jornadas'}
          </p>
        </div>
      </div>

      {/* Center: Live Clock & Date */}
      <div className="hidden md:flex items-center space-x-4 bg-slate-900/80 px-4 py-1.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-2 text-slate-300 text-xs font-medium capitalize">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{currentDate}</span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <div className="font-mono text-sm font-semibold tracking-wider text-indigo-300">
          {currentTime}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Mobile & Offline QR Button */}
        {onOpenMobileModal && (
          <button
            onClick={onOpenMobileModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-slate-200 text-xs font-semibold transition-all active:scale-95 group shadow-sm"
            title="Escanear código QR para abrir o instalar en el móvil sin internet"
          >
            <QrCode className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Móvil & Offline</span>
            <span className="sm:hidden">QR</span>
          </button>
        )}

        {/* System Online/Offline Badge */}
        <button
          onClick={onOpenMobileModal}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            isOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
          }`}
          title={isOnline ? 'Servidor Conectado' : 'Modo Offline: funcionando sin internet'}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">En línea</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </>
          )}
        </button>

        {/* Quick Action Button */}
        {onOpenQuickClock && (
          <button
            onClick={onOpenQuickClock}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fichaje Rápido</span>
          </button>
        )}
      </div>
    </header>
  );
};
