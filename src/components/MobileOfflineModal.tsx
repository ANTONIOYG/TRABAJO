import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  QrCode,
  Download,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
import { DataService } from '../DB/db';

interface MobileOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileOfflineModal: React.FC<MobileOfflineModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [networkInfo, setNetworkInfo] = useState<{
    primaryIp: string;
    ips: string[];
    frontendPort: number;
    backendPort: number;
    mobileUrl: string;
  } | null>(null);

  const [selectedIp, setSelectedIp] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  // Detect online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for PWA beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Fetch Network Info
  useEffect(() => {
    if (!isOpen) return;

    DataService.getNetworkInfo().then((info) => {
      setNetworkInfo(info);
      setSelectedIp(info.primaryIp);
    });
  }, [isOpen]);

  // Generate QR Code when selected IP changes
  useEffect(() => {
    if (!selectedIp) return;

    const url = `http://${selectedIp}:5173`;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Error generando código QR:', err);
      });
  }, [selectedIp]);

  if (!isOpen) return null;

  const currentUrl = `http://${selectedIp || 'localhost'}:5173`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-indigo-950/50 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Descargar en Móvil & Modo Offline
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-3 h-3 mr-1" /> Sin Internet
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Escanea el código QR para instalar y ejecutar WorkLog Pro como App en tu teléfono.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* QR & Connection Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
            {/* QR View */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-3">
              <div className="relative p-3 bg-white rounded-2xl shadow-xl shadow-indigo-500/10 border-4 border-indigo-500/20 group">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code WorkLog Pro"
                    className="w-48 h-48 rounded-xl object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-xs">
                    Generando QR...
                  </div>
                )}
                <div className="absolute inset-0 bg-indigo-600/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                Apunta con la cámara de tu móvil
              </span>
            </div>

            {/* Connection Details */}
            <div className="md:col-span-7 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Dirección IP de Red Local (Wi-Fi):
                </label>
                {networkInfo && networkInfo.ips && networkInfo.ips.length > 1 ? (
                  <select
                    value={selectedIp}
                    onChange={(e) => setSelectedIp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {networkInfo.ips.map((ip) => (
                      <option key={ip} value={ip}>
                        {ip} (Puerto 5173)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300">
                    {currentUrl}
                  </div>
                )}
              </div>

              {/* Copy & Direct Link */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡URL Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar Enlace</span>
                    </>
                  )}
                </button>

                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 transition-colors"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Quick Status */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estado de red en este dispositivo:</span>
                  <span className={`inline-flex items-center font-semibold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isOnline ? (
                      <>
                        <Wifi className="w-3 h-3 mr-1 text-emerald-400" /> En línea
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 mr-1 text-amber-400" /> Fuera de línea (Offline)
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Soporte Offline PWA:</span>
                  <span className="text-emerald-400 font-semibold flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Activo (Service Worker v1)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Installation Guide */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Guía de Instalación y Uso sin Conexión
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <h4 className="text-xs font-bold text-white">Escanear y Abrir</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Conecta tu móvil al mismo Wi-Fi que este ordenador y escanea el código QR con la cámara.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <h4 className="text-xs font-bold text-white">Instalar como App</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  En Android toca los 3 puntos (⋮) → <strong>"Instalar"</strong>. En iPhone (Safari) toca Compartir → <strong>"Añadir a pantalla de inicio"</strong>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                  3
                </div>
                <h4 className="text-xs font-bold text-white">Ejecutar sin Internet</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ¡Listo! Abre el icono en tu móvil. Puedes apagar el Wi-Fi/datos y registrar jornadas sin conexión.
                </p>
              </div>
            </div>
          </div>

          {/* PWA Install Button if available */}
          {installPrompt && !isInstalled && (
            <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Download className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">Instalar WorkLog Pro en este dispositivo</h4>
                  <p className="text-[11px] text-slate-400">Instala la aplicación web directamente con un solo clic.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstallApp}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                Instalar Ahora
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Los datos registrados sin conexión se guardan localmente en el móvil de forma permanente.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
