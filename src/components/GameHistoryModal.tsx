import { useRef, useEffect, useMemo } from 'react';
import { X, Moon, Sun, Shield, Skull, Clock } from 'lucide-react';
import { DeathRecord } from '../types/game';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deathHistory: DeathRecord[];
  currentCycle: number;
}

export function GameHistoryModal({
  isOpen,
  onClose,
  deathHistory,
  currentCycle,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // Group death records by cycle
  const cycles = useMemo(() => Array.from(
    new Set(deathHistory.map(d => d.cycle))
  ).sort((a, b) => a - b), [deathHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div ref={containerRef} className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto scroll-smooth bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Riwayat Eliminasi Permainan
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Catatan kronologis eliminasi pemain pada setiap fase malam dan siang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {deathHistory.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">Belum Ada Catatan Eliminasi</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Seluruh pemain masih aktif. Catatan akan otomatis diperbarui setiap kali fase malam atau siang diselesaikan.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cycles.map(cycleNum => {
              const recordsInCycle = deathHistory.filter(d => d.cycle === cycleNum);
              const nightRecords = recordsInCycle.filter(d => d.phase === 'Malam');
              const dayRecords = recordsInCycle.filter(d => d.phase === 'Siang');

              return (
                <div
                  key={cycleNum}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold tracking-wide uppercase text-slate-300">
                      Babak {cycleNum}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {recordsInCycle.length} Catatan
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Night Phase Records */}
                    {nightRecords.map((record, idx) => (
                      <div
                        key={record.id ? `${record.id}_${idx}` : `dh_night_${idx}`}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                          record.saved
                            ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                            : record.playerName.includes('Tidak ada')
                            ? 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                            : 'bg-rose-950/20 border-rose-900/50 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <Moon className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>Fase Malam {record.cycle}:</span>
                              <span className={record.saved ? 'text-emerald-400' : record.playerName.includes('Tidak ada') ? 'text-slate-400' : 'text-rose-400'}>
                                {record.playerName}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {record.reason}
                            </div>
                          </div>
                        </div>

                        {record.saved ? (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                            <Shield className="w-3 h-3" /> Dilindungi
                          </span>
                        ) : !record.playerName.includes('Tidak ada') ? (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800 shrink-0">
                            <Skull className="w-3 h-3" /> Gugur
                          </span>
                        ) : null}
                      </div>
                    ))}

                    {/* Day Phase Records */}
                    {dayRecords.map((record, idx) => (
                      <div
                        key={record.id ? `${record.id}_${idx}` : `dh_day_${idx}`}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                          record.playerName.includes('Tidak ada')
                            ? 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                            : 'bg-amber-950/20 border-amber-900/50 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <Sun className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>Fase Siang {record.cycle}:</span>
                              <span className={record.playerName.includes('Tidak ada') ? 'text-slate-400' : 'text-amber-300'}>
                                {record.playerName}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {record.reason}
                            </div>
                          </div>
                        </div>

                        {!record.playerName.includes('Tidak ada') && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 shrink-0">
                            <Skull className="w-3 h-3" /> Tereliminasi
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Anchor for auto smooth scroll */}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>Babak Aktif: Babak {currentCycle}</span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors flex items-center justify-center"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
