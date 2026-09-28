import React from 'react';
import { CalendarDays, Star, Info, Clock } from 'lucide-react';
import { CONVENIO_HOLIDAYS_2026, formatDateES } from '../utils/calculations';

// Nombres descriptivos de los festivos
const HOLIDAY_NAMES: Record<string, string> = {
  '2026-01-01': 'Año Nuevo',
  '2026-01-06': 'Reyes Magos',
  '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajador',
  '2026-05-02': 'Día de la Comunidad de Madrid',
  '2026-07-25': 'Santiago Apóstol',
  '2026-08-15': 'Asunción de la Virgen',
  '2026-09-25': 'Festivo Convenio de la Madera (Madrid)',
  '2026-10-12': 'Fiesta Nacional de España',
  '2026-11-01': 'Todos los Santos',
  '2026-11-09': 'La Almudena (Madrid)',
  '2026-12-06': 'Día de la Constitución Española',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()];
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return MONTH_NAMES[d.getMonth()];
}

export const Holidays: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);

  // Agrupar festivos por mes
  const byMonth = CONVENIO_HOLIDAYS_2026.reduce<Record<string, string[]>>((acc, date) => {
    const month = getMonthLabel(date);
    if (!acc[month]) acc[month] = [];
    acc[month].push(date);
    return acc;
  }, {});

  const isPast = (dateStr: string) => dateStr < today;
  const isToday = (dateStr: string) => dateStr === today;

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-400" />
            Días Festivos – Convenio de la Madera Madrid 2026
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Festivos reconocidos según convenio colectivo. En estos días y fines de semana, el 100% de las horas computadas son extras.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold whitespace-nowrap">
          <Star className="w-4 h-4" />
          {CONVENIO_HOLIDAYS_2026.length} festivos
        </div>
      </div>

      {/* Reglas de negocio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            Días Laborales (L–V)
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Jornada ordinaria de <strong className="text-white">8 horas</strong>. Las horas que excedan se pagan como extras a <strong className="text-amber-300">15 €/h</strong>.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-amber-700/40 bg-amber-900/10 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <CalendarDays className="w-4 h-4" />
            Fin de Semana (Sáb &amp; Dom)
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            El <strong className="text-white">100%</strong> del tiempo fichado cuenta como hora extra directamente, pagaderas a <strong className="text-amber-300">17 €/h</strong>.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-rose-700/40 bg-rose-900/10 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
            <Star className="w-4 h-4" />
            Días Festivos de Convenio
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            El <strong className="text-white">100%</strong> del tiempo fichado cuenta como hora extra a <strong className="text-amber-300">17 €/h</strong>, independientemente del día de la semana.
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <span>
          Los festivos se aplican <strong className="text-slate-200">automáticamente</strong> al registrar un fichaje. No es necesario indicarlos manualmente en las notas.
          El sistema detecta la fecha y aplica la tarifa correspondiente de forma automática.
        </span>
      </div>

      {/* Lista de festivos por mes */}
      <div className="space-y-5">
        {Object.entries(byMonth).map(([month, dates]) => (
          <div key={month} className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">{month} 2026</h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              {dates.map((dateStr) => {
                const past = isPast(dateStr);
                const todayFlag = isToday(dateStr);
                return (
                  <div
                    key={dateStr}
                    className={`flex items-center justify-between px-5 py-3.5 transition-colors ${todayFlag
                        ? 'bg-amber-500/10'
                        : past
                          ? 'opacity-50'
                          : 'hover:bg-slate-800/40'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Chip día de la semana */}
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-amber-400 uppercase">{getDayName(dateStr)}</span>
                        <span className="text-sm font-bold text-white">{dateStr.slice(8, 10)}</span>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          {HOLIDAY_NAMES[dateStr] || 'Festivo'}
                          {todayFlag && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wide">
                              Hoy
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{formatDateES(dateStr)} &bull; {getDayName(dateStr)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {past && !todayFlag && (
                        <span className="text-[10px] text-slate-500 font-medium">Pasado</span>
                      )}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                        100% Extras · 17 €/h
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
